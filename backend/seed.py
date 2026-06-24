import sys
import os
from datetime import date, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models.admin import Admin
from models.doctor import Doctor
from models.doctor_schedule import DoctorSchedule

def seed_database():
    app = create_app()
    with app.app_context():
        # 1. Create Admin
        admin = Admin.query.filter_by(email="admin@hospital.com").first()
        if not admin:
            admin = Admin(
                username="test_admin",
                email="admin@hospital.com",
                role="admin",
                name="Test Admin"
            )
            admin.set_password("admin_pass123")
            db.session.add(admin)
            print("Seeded Admin: admin@hospital.com / admin_pass123")
        else:
            print("Admin already exists")

        # 2. Create Doctor A
        doctor_a = Doctor.query.filter_by(email="sarah.c@hospital.com").first()
        if not doctor_a:
            doctor_a = Doctor(
                full_name="Dr. Sarah Connor",
                email="sarah.c@hospital.com",
                specialty="Cardiology",
                department="Cardiology",
                room_number="Room 405",
                status="OUT"
            )
            doctor_a.set_password("doctor_pass123")
            db.session.add(doctor_a)
            print("Seeded Doctor A: sarah.c@hospital.com / doctor_pass123")
        else:
            print("Doctor A already exists")

        # 3. Create Doctor B
        doctor_b = Doctor.query.filter_by(email="peter.s@hospital.com").first()
        if not doctor_b:
            doctor_b = Doctor(
                full_name="Dr. Peter Silberman",
                email="peter.s@hospital.com",
                specialty="Psychiatry",
                department="Psychiatry",
                room_number="Room 303",
                status="IN"
            )
            doctor_b.set_password("doctor_pass456")
            db.session.add(doctor_b)
            print("Seeded Doctor B: peter.s@hospital.com / doctor_pass456")
        else:
            print("Doctor B already exists")

        db.session.commit()

        # Create schedule for Doctor B for today and tomorrow
        today = date.today()
        tomorrow = today + timedelta(days=1)

        # Refresh objects
        doctor_a = Doctor.query.filter_by(email="sarah.c@hospital.com").first()
        doctor_b = Doctor.query.filter_by(email="peter.s@hospital.com").first()

        if doctor_b:
            sched_today = DoctorSchedule.query.filter_by(doctor_id=doctor_b.id, date=today).first()
            if not sched_today:
                sched_today = DoctorSchedule(
                    doctor_id=doctor_b.id,
                    date=today,
                    is_available=True,
                    max_sessions=10
                )
                db.session.add(sched_today)
                print("Seeded schedule for Dr. Peter Silberman for Today")
            
            sched_tomorrow = DoctorSchedule.query.filter_by(doctor_id=doctor_b.id, date=tomorrow).first()
            if not sched_tomorrow:
                sched_tomorrow = DoctorSchedule(
                    doctor_id=doctor_b.id,
                    date=tomorrow,
                    is_available=True,
                    max_sessions=10
                )
                db.session.add(sched_tomorrow)
                print("Seeded schedule for Dr. Peter Silberman for Tomorrow")

        if doctor_a:
            sched_tomorrow_a = DoctorSchedule.query.filter_by(doctor_id=doctor_a.id, date=tomorrow).first()
            if not sched_tomorrow_a:
                sched_tomorrow_a = DoctorSchedule(
                    doctor_id=doctor_a.id,
                    date=tomorrow,
                    is_available=True,
                    max_sessions=10
                )
                db.session.add(sched_tomorrow_a)
                print("Seeded schedule for Dr. Sarah Connor for Tomorrow")

        db.session.commit()
        print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
