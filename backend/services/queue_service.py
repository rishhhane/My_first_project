from extensions import db
from models.appointment import Appointment
from models.doctor import Doctor
from models.visit_history import VisitHistory
from models.doctor_schedule import DoctorSchedule
from utils.date_utils import DateUtils
from datetime import date, datetime


class QueueService:

    # ------------------------------------------------------------------ #
    #  SNAPSHOT — full queue breakdown for admin dashboard / display board
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_full_queue_snapshot(doctor_id, date_str=None):
        try:
            if date_str:
                target_date = DateUtils.parse_date_string(date_str)
                if not target_date:
                    return {"error": "Invalid date format. Use YYYY-MM-DD", "status_code": 400}
            else:
                target_date = date.today()

            appointments = Appointment.query.filter_by(
                doctor_id=doctor_id,
                appointment_date=target_date
            ).order_by(Appointment.queue_position).all()

            grouped = {"pending": [], "called": [], "done": [], "skipped": [], "cancelled": []}
            for appt in appointments:
                bucket = grouped.get(appt.status)
                if bucket is not None:
                    bucket.append(appt.to_dict())

            return {
                "doctor_id": doctor_id,
                "date":      target_date.isoformat(),
                "queue":     grouped,
                "total":     len(appointments),
                "status_code": 200,
            }
        except Exception as e:
            return {"error": "Failed to fetch queue snapshot", "details": str(e), "status_code": 500}

    # ------------------------------------------------------------------ #
    #  CAPACITY — slots booked vs available
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_queue_capacity(doctor_id, date_str):
        try:
            target_date = DateUtils.parse_date_string(date_str)
            if not target_date:
                return {"error": "Invalid date format. Use YYYY-MM-DD", "status_code": 400}

            schedule = DoctorSchedule.query.filter_by(
                doctor_id=doctor_id, date=target_date
            ).first()

            if not schedule:
                return {"error": "No schedule found for this doctor on this date.", "status_code": 404}

            active_count = Appointment.query.filter_by(
                doctor_id=doctor_id,
                appointment_date=target_date
            ).filter(Appointment.status.in_(['pending', 'called'])).count()

            return {
                "doctor_id":    doctor_id,
                "date":         target_date.isoformat(),
                "max_sessions": schedule.max_sessions,
                "booked":       active_count,
                "available":    max(0, schedule.max_sessions - active_count),
                "is_full":      active_count >= schedule.max_sessions,
                "status_code":  200,
            }
        except Exception as e:
            return {"error": "Failed to fetch capacity", "details": str(e), "status_code": 500}

    # ------------------------------------------------------------------ #
    #  ACTIVE QUEUE — pending + called only
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_doctor_queue(doctor_id, date_str=None):
        try:
            if date_str:
                target_date = DateUtils.parse_date_string(date_str)
                if not target_date:
                    return {"error": "Invalid date format. Use YYYY-MM-DD", "status_code": 400}
            else:
                target_date = date.today()

            appointments = Appointment.query.filter_by(
                doctor_id=doctor_id,
                appointment_date=target_date
            ).filter(
                Appointment.status.in_(['pending', 'called'])
            ).order_by(Appointment.queue_position).all()

            return {
                "doctor_id": doctor_id,
                "date":      target_date.isoformat(),
                "queue":     [a.to_dict() for a in appointments],
                "count":     len(appointments),
                "status_code": 200,
            }
        except Exception as e:
            return {"error": "Failed to fetch active queue", "details": str(e), "status_code": 500}

    # ------------------------------------------------------------------ #
    #  CALLOUT — mark patient as 'called'
    # ------------------------------------------------------------------ #

    @staticmethod
    def callout_patient(appointment_id, user_id, user_role):
        try:
            appt = Appointment.query.get(appointment_id)
            if not appt:
                return {"error": "Appointment not found.", "status_code": 404}

            if user_role == 'doctor' and appt.doctor_id != user_id:
                return {"error": "Access Denied. You do not manage this appointment queue.", "status_code": 403}

            if appt.status not in ['pending', 'called']:
                return {"error": f"Cannot call out a patient whose status is '{appt.status}'.", "status_code": 422}

            # Check doctor status
            doctor = Doctor.query.get(appt.doctor_id)
            if not doctor or doctor.status != 'IN':
                return {"error": "Doctor is currently OUT. Cannot call patients to the room.", "status_code": 422}

            if appt.status == 'called':
                from sqlalchemy import func
                max_pos = db.session.query(func.max(Appointment.queue_position)).filter_by(
                    doctor_id=appt.doctor_id,
                    appointment_date=appt.appointment_date
                ).scalar()
                next_position = (max_pos or 0) + 1

                appt.queue_position = next_position
                appt.status = 'pending'
                db.session.commit()
                return {"message": "Patient called twice. Pushed to the end of the queue.", "status": "pending", "status_code": 200}
            else:
                appt.status = 'called'
                db.session.commit()
                return {"message": "Patient called to the consultation room.", "status": "called", "status_code": 200}
        except Exception as e:
            db.session.rollback()
            return {"error": "Callout failed", "details": str(e), "status_code": 500}

    # ------------------------------------------------------------------ #
    #  COMPLETE — finish session, save to visit_history
    # ------------------------------------------------------------------ #

    @staticmethod
    def complete_session(appointment_id, user_id, user_role, reason=None):
        try:
            appt = Appointment.query.get(appointment_id)
            if not appt:
                return {"error": "Appointment not found.", "status_code": 404}

            if user_role == 'doctor' and appt.doctor_id != user_id:
                return {"error": "Access Denied. You do not manage this appointment queue.", "status_code": 403}

            if appt.status != 'called':
                return {"error": f"Cannot complete a session with status '{appt.status}'. Patient must be called first.", "status_code": 422}

            appt.status = 'done'

            # Check if VisitHistory already exists (e.g. created when writing prescription)
            history_log = VisitHistory.query.filter_by(appointment_id=appt.id).first()
            if not history_log:
                history_log = VisitHistory(
                    appointment_id = appt.id,
                    patient_id     = appt.patient_id,
                    patient_name   = appt.patient_name,
                    doctor_id      = appt.doctor_id,
                    reason         = reason or "Routine Consultation",
                    visit_date     = datetime.utcnow(),
                )
                db.session.add(history_log)
            else:
                if reason:
                    history_log.reason = reason
            
            db.session.commit()

            return {
                "message":       "Session completed and archived successfully.",
                "visit_history": history_log.to_dict(),
                "status_code":   200,
            }
        except Exception as e:
            db.session.rollback()
            return {"error": "Session completion failed", "details": str(e), "status_code": 500}

    # ------------------------------------------------------------------ #
    #  SKIP — mark patient as no-show
    # ------------------------------------------------------------------ #

    @staticmethod
    def skip_patient(appointment_id, user_id, user_role):
        try:
            appt = Appointment.query.get(appointment_id)
            if not appt:
                return {"error": "Appointment not found.", "status_code": 404}

            if user_role == 'doctor' and appt.doctor_id != user_id:
                return {"error": "Access Denied. You do not manage this appointment queue.", "status_code": 403}

            if appt.status not in ['pending', 'called']:
                return {"error": f"Cannot skip a patient already marked '{appt.status}'.", "status_code": 422}

            appt.status = 'skipped'
            db.session.commit()
            return {"message": "Patient marked as skipped.", "status_code": 200}
        except Exception as e:
            db.session.rollback()
            return {"error": "Skip action failed", "details": str(e), "status_code": 500}

    # ------------------------------------------------------------------ #
    #  LEGACY
    # ------------------------------------------------------------------ #

    @staticmethod
    def join_live_queue(data):
        from services.appointment_service import AppointmentService
        return AppointmentService.book(data)
