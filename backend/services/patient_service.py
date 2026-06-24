from extensions import db
from models.patient import Patient
from models.doctor import Doctor
from utils.validators import Validators


class PatientService:

    @staticmethod
    def update_demographics(patient_id, data):
        try:
            patient = Patient.query.get(patient_id)
            if not patient:
                return {"error": "Patient not found", "status_code": 404}

            # Validations
            if 'phone_no' in data:
                phone_no = data['phone_no']
                if phone_no and not Validators.is_valid_phone(phone_no):
                    return {"error": "Invalid phone number format. Must be a 10-digit number.", "status_code": 400}
                data['phone_no'] = phone_no.strip() if phone_no else None

            if 'pin_code' in data:
                pin_code = data['pin_code']
                if pin_code and not Validators.is_valid_pincode(pin_code):
                    return {"error": "Invalid pin code format. Must be a 6-digit number.", "status_code": 400}
                data['pin_code'] = pin_code.strip() if pin_code else None

            if 'age' in data:
                age = data['age']
                if age is not None and not Validators.is_valid_age(age):
                    return {"error": "Invalid age value. Must be a positive integer below 125.", "status_code": 400}
                data['age'] = int(age) if age is not None else None

            if 'blood_group' in data:
                blood_group = data['blood_group']
                if blood_group and not Validators.is_valid_blood_group(blood_group):
                    return {"error": "Invalid blood group. Must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.", "status_code": 400}
                data['blood_group'] = blood_group.strip().upper() if blood_group else None

            allowed_fields = ["full_name", "phone_no", "blood_group", "age", "city", "pin_code", "photo_url"]
            for field in allowed_fields:
                if field in data:
                    val = data[field]
                    if isinstance(val, str):
                        val = val.strip()
                    setattr(patient, field, val)

            db.session.commit()
            return {"message": "Profile updated successfully.", "patient": patient.to_dict(), "status_code": 200}
        except Exception as e:
            db.session.rollback()
            return {"error": "Failed to update profile", "details": str(e), "status_code": 500}

    @staticmethod
    def browse_doctors(department=None):
        try:
            query = Doctor.query
            if department:
                query = query.filter(Doctor.department.ilike(f"%{department}%"))
            doctors = query.all()
            return {"doctors": [d.to_dict() for d in doctors], "status_code": 200}
        except Exception as e:
            return {"error": "Failed to fetch doctors", "details": str(e), "status_code": 500}

    @staticmethod
    def get_patient_details_and_history(patient_id):
        try:
            patient = Patient.query.get(patient_id)
            if not patient:
                return {"error": "Patient not found", "status_code": 404}

            from models.visit_history import VisitHistory
            from models.prescription import Prescription

            # Fetch last two completed visits
            visits = VisitHistory.query.filter_by(patient_id=patient_id).order_by(VisitHistory.visit_date.desc()).limit(2).all()

            visit_list = []
            for v in visits:
                rx = Prescription.query.filter_by(visit_id=v.id).first()
                doc = Doctor.query.get(v.doctor_id)
                visit_list.append({
                    "visit_id": v.id,
                    "appointment_id": v.appointment_id,
                    "doctor_id": v.doctor_id,
                    "doctor_name": doc.full_name if doc else "Staff Doctor",
                    "department": doc.department if doc else "General Medicine",
                    "reason": v.reason,
                    "visit_date": v.visit_date.isoformat() if v.visit_date else None,
                    "prescription": rx.to_dict() if rx else None
                })

            return {
                "patient": patient.to_dict(),
                "visits": visit_list,
                "status_code": 200
            }
        except Exception as e:
            return {"error": "Failed to fetch patient history", "details": str(e), "status_code": 500}