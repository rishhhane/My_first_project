from extensions import db
from models.doctor import Doctor
from models.doctor_schedule import DoctorSchedule
from utils.date_utils import DateUtils

class DoctorService:

    @staticmethod
    def toggle_attendance(doctor_id, status):
        try:
            if status not in ['IN', 'OUT']:
                return {"error": "Invalid status flag property value. Use 'IN' or 'OUT'", "status_code": 400}

            doctor = Doctor.query.get(doctor_id)
            if not doctor:
                return {"error": "Doctor profile instance not found", "status_code": 404}

            doctor.status = status
            db.session.commit()  # <-- FIXED: Changes are now permanently saved to PostgreSQL!
            
            return {"message": f"Doctor status updated to {status} successfully.", "doctor": doctor.to_dict(), "status_code": 200}
        except Exception as e:
            db.session.rollback()
            return {"error": "Profile modification error", "details": str(e), "status_code": 500}

    @staticmethod
    def set_availability_calendar(data):
        try:
            doctor_id = data.get('doctor_id')
            date_str = data.get('date')

            if not doctor_id or not date_str:
                return {"error": "Missing mandatory parameter elements", "status_code": 400}

            target_date = DateUtils.parse_date_string(date_str)
            if not target_date:
                return {"error": "Invalid date string layout format. Use YYYY-MM-DD", "status_code": 400}

            existing = DoctorSchedule.query.filter_by(doctor_id=doctor_id, date=target_date).first()
            if existing:
                existing.is_available = data.get('is_available', True)
                existing.max_sessions = data.get('max_sessions', existing.max_sessions)
                db.session.commit()
                return {"message": "Doctor calendar updated successfully.", "schedule": existing.to_dict(), "status_code": 200}

            new_schedule = DoctorSchedule(
                doctor_id=doctor_id,
                date=target_date,
                is_available=data.get('is_available', True),
                max_sessions=data.get('max_sessions', 20)
            )
            db.session.add(new_schedule)
            db.session.commit()

            return {"message": "New availability block created successfully.", "schedule": new_schedule.to_dict(), "status_code": 201}
        except Exception as e:
            db.session.rollback()
            return {"error": "Calendar service engine crash", "details": str(e), "status_code": 500}