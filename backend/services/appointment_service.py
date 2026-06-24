from extensions import db
from models.appointment import Appointment
from models.doctor import Doctor
from models.patient import Patient
from models.doctor_schedule import DoctorSchedule
from utils.date_utils import DateUtils
from datetime import datetime
from sqlalchemy import func


class AppointmentService:

    @staticmethod
    def book(data):
        try:
            patient_id = data.get('patient_id')
            doctor_id  = data.get('doctor_id')
            date_str   = data.get('date')

            if not patient_id or not doctor_id or not date_str:
                return {"error": "Missing mandatory parameters: patient_id, doctor_id, and date are required.", "status_code": 400}

            target_date = DateUtils.parse_date_string(date_str)
            if not target_date:
                return {"error": "Invalid date format. Use YYYY-MM-DD", "status_code": 400}

            if DateUtils.is_date_in_past(target_date):
                return {"error": "Cannot book an appointment for a past date.", "status_code": 400}

            patient = Patient.query.get(patient_id)
            if not patient:
                return {"error": "Target patient record could not be found.", "status_code": 404}

            doctor = Doctor.query.get(doctor_id)
            if not doctor:
                return {"error": "Target doctor record could not be found.", "status_code": 404}

            # Lock the schedule row to prevent concurrent overbooking
            schedule = DoctorSchedule.query.with_for_update().filter_by(
                doctor_id=doctor_id, date=target_date
            ).first()
            if not schedule or not schedule.is_available:
                return {"error": "Doctor has no active scheduling capacity allocated for this date.", "status_code": 422}

            duplicate = Appointment.query.filter_by(
                patient_id=patient_id,
                doctor_id=doctor_id,
                appointment_date=target_date
            ).filter(Appointment.status.in_(['pending', 'called'])).first()

            if duplicate:
                return {"error": "You are already in this doctor's queue for this date.", "status_code": 409}

            active_count = Appointment.query.filter_by(
                doctor_id=doctor_id,
                appointment_date=target_date
            ).filter(Appointment.status.in_(['pending', 'called'])).count()

            if active_count >= schedule.max_sessions:
                return {"error": f"Queue full! Maximum capacity of {schedule.max_sessions} active slots reached.", "status_code": 422}

            # FIX: use MAX(queue_position) + 1 instead of COUNT + 1
            # COUNT resets when rows are cancelled/deleted, causing duplicate position numbers.
            # MAX always gives the next unique ticket number regardless of deletions.
            max_pos = db.session.query(func.max(Appointment.queue_position)).filter_by(
                doctor_id=doctor_id,
                appointment_date=target_date
            ).scalar()
            next_position = (max_pos or 0) + 1

            new_appt = Appointment(
                patient_id       = patient_id,
                doctor_id        = doctor_id,
                patient_name     = patient.full_name,
                doctor_name      = doctor.full_name,
                department       = doctor.department,
                appointment_date = target_date,
                queue_position   = next_position,
                status           = 'pending'
            )

            db.session.add(new_appt)
            db.session.commit()

            return {"message": "Appointment booked successfully!", "appointment": new_appt.to_dict(), "status_code": 201}
        except Exception as e:
            db.session.rollback()
            return {"error": "Booking engine error", "details": str(e), "status_code": 500}

    @staticmethod
    def cancel(appointment_id, user_id, user_role):
        try:
            appt = Appointment.query.get(appointment_id)
            if not appt:
                return {"error": "Appointment not found.", "status_code": 404}

            if user_role != 'admin' and appt.patient_id != user_id:
                return {"error": "Access Denied. You do not own this appointment.", "status_code": 403}

            if DateUtils.is_date_in_past(appt.appointment_date):
                return {"error": "Cannot cancel a past appointment.", "status_code": 400}

            if appt.status in ['done', 'skipped']:
                return {"error": f"Cannot cancel an appointment already marked as '{appt.status}'.", "status_code": 422}

            if appt.status == 'cancelled':
                return {"error": "Appointment is already cancelled.", "status_code": 422}

            appt.status = 'cancelled'
            db.session.commit()

            return {"message": "Appointment cancelled successfully.", "appointment_id": appointment_id, "status_code": 200}
        except Exception as e:
            db.session.rollback()
            return {"error": "Cancellation failed", "details": str(e), "status_code": 500}

    @staticmethod
    def get_position(appointment_id, user_id, user_role):
        try:
            appt = Appointment.query.get(appointment_id)
            if not appt:
                return {"error": "Appointment not found.", "status_code": 404}

            if user_role == 'patient' and appt.patient_id != user_id:
                return {"error": "Access Denied. You do not own this appointment.", "status_code": 403}
            if user_role == 'doctor' and appt.doctor_id != user_id:
                return {"error": "Access Denied. You are not the doctor for this appointment.", "status_code": 403}

            if appt.status in ['done', 'skipped', 'cancelled']:
                return {"ticket_number": appt.queue_position, "status": appt.status, "patients_ahead": 0, "status_code": 200}

            patients_ahead = Appointment.query.filter_by(
                doctor_id=appt.doctor_id,
                appointment_date=appt.appointment_date
            ).filter(
                Appointment.queue_position < appt.queue_position,
                Appointment.status.in_(['pending', 'called'])
            ).count()

            # Get the lowest queue position of called (active) appointments for the doctor today
            currently_serving_appt = Appointment.query.filter_by(
                doctor_id=appt.doctor_id,
                appointment_date=appt.appointment_date,
                status='called'
            ).order_by(Appointment.queue_position.asc()).first()

            currently_serving = currently_serving_appt.queue_position if currently_serving_appt else None

            # If no called appointment, get the highest queue position of completed/done ones today
            if not currently_serving:
                last_done_appt = Appointment.query.filter_by(
                    doctor_id=appt.doctor_id,
                    appointment_date=appt.appointment_date,
                    status='done'
                ).order_by(Appointment.queue_position.desc()).first()
                currently_serving = last_done_appt.queue_position if last_done_appt else None

            return {
                "ticket_number":  appt.queue_position,
                "status":         appt.status,
                "patients_ahead": patients_ahead,
                "live_position":  patients_ahead + 1,
                "currently_serving": currently_serving,
                "status_code":    200,
            }
        except Exception as e:
            return {"error": "Position lookup error", "details": str(e), "status_code": 500}

    @staticmethod
    def get_all(patient_id):
        try:
            appointments = Appointment.query.filter_by(patient_id=patient_id).order_by(
                Appointment.appointment_date.desc()
            ).all()
            return {"appointments": [a.to_dict() for a in appointments], "status_code": 200}
        except Exception as e:
            return {"error": "Failed to fetch appointments", "details": str(e), "status_code": 500}
