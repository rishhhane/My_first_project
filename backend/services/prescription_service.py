from extensions import db
from models.prescription import Prescription
from models.visit_history import VisitHistory
from models.patient import Patient
from models.doctor import Doctor


class PrescriptionService:

    @staticmethod
    def write_prescription(data, doctor_id):
        try:
            visit_id         = data.get("visit_id")
            appointment_id   = data.get("appointment_id")
            diagnosis        = data.get("diagnosis")
            medicines_dosage = data.get("medicines_dosage")

            if not diagnosis or not medicines_dosage:
                return {"error": "Missing mandatory fields: diagnosis, medicines_dosage", "status_code": 400}

            if not visit_id and not appointment_id:
                return {"error": "Missing visit_id or appointment_id", "status_code": 400}

            from models.appointment import Appointment
            from datetime import datetime

            if visit_id:
                visit = VisitHistory.query.get(visit_id)
            else:
                appt = Appointment.query.get(appointment_id)
                if not appt:
                    return {"error": "Associated appointment not found", "status_code": 404}

                if appt.doctor_id != doctor_id:
                    return {"error": "Access Denied. You are not the attending doctor for this appointment.", "status_code": 403}

                # Check if a VisitHistory already exists for this appointment
                visit = VisitHistory.query.filter_by(appointment_id=appointment_id).first()
                if not visit:
                    # Create VisitHistory on the fly, but keep appointment as 'called'
                    visit = VisitHistory(
                        appointment_id = appt.id,
                        patient_id     = appt.patient_id,
                        patient_name   = appt.patient_name,
                        doctor_id      = appt.doctor_id,
                        reason         = diagnosis or "Routine Consultation",
                        visit_date     = datetime.utcnow(),
                    )
                    db.session.add(visit)
                    db.session.flush() # get the visit.id

            if not visit:
                return {"error": "Associated visit log not found", "status_code": 404}

            if visit.doctor_id != doctor_id:
                return {"error": "Access Denied. You are not the attending doctor for this visit.", "status_code": 403}

            existing = Prescription.query.filter_by(visit_id=visit.id).first()
            if existing:
                return {"error": "A prescription already exists for this visit", "status_code": 409}

            patient = Patient.query.get(visit.patient_id)
            doctor  = Doctor.query.get(visit.doctor_id)

            new_prescription = Prescription(
                patient_id       = visit.patient_id,
                doctor_id        = visit.doctor_id,
                visit_id         = visit.id,
                patient_name     = visit.patient_name,
                patient_age      = patient.age if patient else None,
                doctor_name      = doctor.full_name if doctor else "Staff Doctor",
                diagnosis        = diagnosis,
                medicines_dosage = medicines_dosage,
                instructions     = data.get("instructions", ""),
            )

            db.session.add(new_prescription)
            db.session.commit()

            return {
                "message":      "Prescription generated successfully!",
                "prescription": new_prescription.to_dict(),
                "status_code":  201,
            }
        except Exception as e:
            db.session.rollback()
            return {"error": "Failed to write prescription", "details": str(e), "status_code": 500}

    @staticmethod
    def get_records_for_patient(patient_id):
        try:
            prescriptions = Prescription.query.filter_by(patient_id=patient_id).order_by(
                Prescription.created_at.desc()
            ).all()
            return {"prescriptions": [p.to_dict() for p in prescriptions], "status_code": 200}
        except Exception as e:
            return {"error": "Failed to fetch prescriptions", "details": str(e), "status_code": 500}