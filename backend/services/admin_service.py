from extensions import db
from models.doctor import Doctor
from models.patient import Patient
from models.admin import Admin
from models.appointment import Appointment


class AdminService:

    @staticmethod
    def create_doctor_profile(data):
        try:
            email     = data.get("email")
            full_name = data.get("name") or data.get("full_name")
            # FIX: password is now required — no silent fallback to a hardcoded default
            password  = data.get("password")

            if not email or not full_name:
                return {"error": "Missing mandatory fields (name, email)", "status_code": 400}

            if not password:
                return {"error": "Missing mandatory field: password is required when creating a doctor account.", "status_code": 400}

            # Cross-role email uniqueness check
            if Patient.query.filter_by(email=email).first() or \
               Doctor.query.filter_by(email=email).first() or \
               Admin.query.filter_by(email=email).first():
                return {"error": "An account with this email address already exists", "status_code": 409}

            new_doctor = Doctor(
                full_name      = full_name,
                email          = email,
                specialty      = data.get("specialty"),
                department     = data.get("department"),
                room_number    = data.get("room_number"),
                status         = data.get("status", "OUT"),
                no_of_sessions = data.get("no_of_sessions", 20),
            )
            new_doctor.set_password(password)

            db.session.add(new_doctor)
            db.session.commit()

            return {"message": "Doctor added successfully!", "doctor": new_doctor.to_dict(), "status_code": 201}
        except Exception as e:
            db.session.rollback()
            return {"error": "Failed to add doctor", "details": str(e), "status_code": 500}

    @staticmethod
    def get_system_appointments():
        try:
            appointments = Appointment.query.order_by(Appointment.appointment_date.desc()).all()
            return {"appointments": [a.to_dict() for a in appointments], "status_code": 200}
        except Exception as e:
            return {"error": "Failed to fetch appointments", "details": str(e), "status_code": 500}

    @staticmethod
    def search_patient(query_str):
        try:
            import re
            from services.patient_service import PatientService
            
            # Try to match digits for PA-X or X
            match = re.search(r'\d+', query_str)
            patient = None
            if match:
                p_id = int(match.group())
                patient = Patient.query.get(p_id)
            
            if not patient:
                # Try searching by name or email
                patient = Patient.query.filter(
                    (Patient.full_name.ilike(f"%{query_str}%")) | 
                    (Patient.email.ilike(f"%{query_str}%"))
                ).first()
                
            if not patient:
                return {"error": "Patient not found with the given query", "status_code": 404}
                
            # Reuse get_patient_details_and_history to return details + history
            return PatientService.get_patient_details_and_history(patient.id)
        except Exception as e:
            return {"error": "Patient search failed", "details": str(e), "status_code": 500}

    @staticmethod
    def delete_patient(patient_id):
        try:
            patient = Patient.query.get(patient_id)
            if not patient:
                return {"error": "Patient not found", "status_code": 404}
            
            from models.prescription import Prescription
            from models.visit_history import VisitHistory
            from models.appointment import Appointment

            # 1. Delete associated prescriptions
            Prescription.query.filter_by(patient_id=patient_id).delete(synchronize_session=False)
            
            # 2. Delete associated visit histories
            VisitHistory.query.filter_by(patient_id=patient_id).delete(synchronize_session=False)
            
            # 3. Delete associated appointments
            Appointment.query.filter_by(patient_id=patient_id).delete(synchronize_session=False)

            # 4. Delete the patient profile
            db.session.delete(patient)
            db.session.commit()
            return {"message": "Patient account deleted successfully.", "status_code": 200}
        except Exception as e:
            db.session.rollback()
            return {"error": "Failed to delete patient account", "details": str(e), "status_code": 500}

    @staticmethod
    def delete_doctor(doctor_id):
        try:
            doctor = Doctor.query.get(doctor_id)
            if not doctor:
                return {"error": "Doctor not found", "status_code": 404}

            from models.prescription import Prescription
            from models.visit_history import VisitHistory
            from models.doctor_schedule import DoctorSchedule
            from models.appointment import Appointment

            # 1. Delete associated prescriptions
            Prescription.query.filter_by(doctor_id=doctor_id).delete(synchronize_session=False)

            # 2. Delete associated visit histories
            VisitHistory.query.filter_by(doctor_id=doctor_id).delete(synchronize_session=False)

            # 3. Delete doctor availability schedules
            DoctorSchedule.query.filter_by(doctor_id=doctor_id).delete(synchronize_session=False)

            # 4. Delete associated appointments
            Appointment.query.filter_by(doctor_id=doctor_id).delete(synchronize_session=False)

            # 5. Delete the doctor profile
            db.session.delete(doctor)
            db.session.commit()
            return {"message": "Doctor account deleted successfully.", "status_code": 200}
        except Exception as e:
            db.session.rollback()
            return {"error": "Failed to delete doctor account", "details": str(e), "status_code": 500}
