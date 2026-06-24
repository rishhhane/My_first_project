import sys
import os

# Override DATABASE_URL and JWT_SECRET_KEY for testing
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ.setdefault('JWT_SECRET_KEY', 'test-jwt-secret-key-123456')

import unittest
from io import BytesIO
from datetime import date, timedelta

# Add root folder to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from models.patient import Patient
from models.doctor import Doctor
from models.admin import Admin
from models.appointment import Appointment
from models.doctor_schedule import DoctorSchedule
from models.visit_history import VisitHistory
from models.prescription import Prescription

class E2EHospitalBackendTest(unittest.TestCase):

    def setUp(self):
        # Create app and configure it for testing
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()

        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Seed an admin and doctor
        self.seed_admin_and_doctor()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def seed_admin_and_doctor(self):
        # Create Admin
        self.admin = Admin(
            username="test_admin",
            email="admin@hospital.com",
            role="admin",
            name="Test Admin"
        )
        self.admin.set_password("admin_pass123")
        db.session.add(self.admin)

        # Create Doctor A
        self.doctor_a = Doctor(
            full_name="Dr. Sarah Connor",
            email="sarah.c@hospital.com",
            specialty="Cardiology",
            department="Cardiology",  # Added department to satisfy NOT NULL constraint on appointments
            room_number="Room 405",
            status="OUT"  # Set to OUT to verify future booking capability
        )
        self.doctor_a.set_password("doctor_pass123")
        db.session.add(self.doctor_a)

        # Create Doctor B
        self.doctor_b = Doctor(
            full_name="Dr. Peter Silberman",
            email="peter.s@hospital.com",
            specialty="Psychiatry",
            department="Psychiatry",  # Added department to satisfy NOT NULL constraint on appointments
            room_number="Room 303",
            status="IN"
        )
        self.doctor_b.set_password("doctor_pass456")
        db.session.add(self.doctor_b)

        db.session.commit()

        # Create Doctor A's schedule for tomorrow (future date)
        self.tomorrow = date.today() + timedelta(days=1)
        self.schedule_a = DoctorSchedule(
            doctor_id=self.doctor_a.id,
            date=self.tomorrow,
            is_available=True,
            max_sessions=5
        )
        db.session.add(self.schedule_a)
        db.session.commit()

    def get_jwt_headers(self, email, password):
        resp = self.client.post('/api/auth/login', json={
            "email": email,
            "password": password
        })
        self.assertEqual(resp.status_code, 200, f"Login failed for {email}: {resp.get_data(as_text=True)}")
        token = resp.get_json()['data']['access_token']
        return {
            'Authorization': f'Bearer {token}'
        }

    def test_01_demographic_validations(self):
        print("Testing demographic validation inputs during signup...")
        # 1. Invalid email
        resp = self.client.post('/api/auth/signup', json={
            "full_name": "John Doe",
            "email": "invalid-email",
            "password": "password123"
        })
        self.assertEqual(resp.status_code, 400, f"Response: {resp.get_data(as_text=True)}")
        self.assertIn("Malformed email syntax", resp.get_json()['error'])

        # 2. Invalid Phone (not 10 digits)
        resp = self.client.post('/api/auth/signup', json={
            "full_name": "John Doe",
            "email": "john@doe.com",
            "password": "password123",
            "phone_no": "1234"
        })
        self.assertEqual(resp.status_code, 400, f"Response: {resp.get_data(as_text=True)}")
        self.assertIn("Invalid phone number format", resp.get_json()['error'])

        # 3. Invalid Pincode (not 6 digits)
        resp = self.client.post('/api/auth/signup', json={
            "full_name": "John Doe",
            "email": "john@doe.com",
            "password": "password123",
            "pin_code": "12345"
        })
        self.assertEqual(resp.status_code, 400, f"Response: {resp.get_data(as_text=True)}")
        self.assertIn("Invalid pin code format", resp.get_json()['error'])

        # 4. Invalid Age (not positive / too high)
        resp = self.client.post('/api/auth/signup', json={
            "full_name": "John Doe",
            "email": "john@doe.com",
            "password": "password123",
            "age": 150
        })
        self.assertEqual(resp.status_code, 400, f"Response: {resp.get_data(as_text=True)}")
        self.assertIn("Invalid age value", resp.get_json()['error'])

        # 5. Invalid Blood Group
        resp = self.client.post('/api/auth/signup', json={
            "full_name": "John Doe",
            "email": "john@doe.com",
            "password": "password123",
            "blood_group": "X+"
        })
        self.assertEqual(resp.status_code, 400, f"Response: {resp.get_data(as_text=True)}")
        self.assertIn("Invalid blood group", resp.get_json()['error'])

    def test_02_cross_role_email_uniqueness(self):
        print("Testing cross-role email uniqueness checks...")
        # Try registering a patient with the admin's email
        resp = self.client.post('/api/auth/signup', json={
            "full_name": "Imposter Patient",
            "email": "admin@hospital.com",
            "password": "imposterpass"
        })
        self.assertEqual(resp.status_code, 409, f"Response: {resp.get_data(as_text=True)}")
        self.assertIn("already exists", resp.get_json()['error'])

        # Try registering a patient with doctor A's email
        resp = self.client.post('/api/auth/signup', json={
            "full_name": "Imposter Patient 2",
            "email": "sarah.c@hospital.com",
            "password": "imposterpass"
        })
        self.assertEqual(resp.status_code, 409, f"Response: {resp.get_data(as_text=True)}")
        self.assertIn("already exists", resp.get_json()['error'])

    def test_03_booking_future_appointments_regardless_of_doctor_status(self):
        print("Testing booking future appointments regardless of doctor OUT status...")
        # Register a valid patient
        resp = self.client.post('/api/auth/signup', json={
            "full_name": "Kyle Reese",
            "email": "kyle.r@future.net",
            "password": "password123",
            "phone_no": "1234567890",
            "blood_group": "O+",
            "age": 28,
            "pin_code": "902100"  # Fixed to 6-digit pin code
        })
        self.assertEqual(resp.status_code, 201, f"Signup failed: {resp.get_data(as_text=True)}")

        # Log in as patient
        patient_headers = self.get_jwt_headers("kyle.r@future.net", "password123")

        # Book for tomorrow with Doctor A (who is currently OUT, but schedule is available)
        booking_resp = self.client.post('/api/patient/appointment/book', headers=patient_headers, json={
            "doctor_id": self.doctor_a.id,
            "date": self.tomorrow.isoformat()
        })
        self.assertEqual(booking_resp.status_code, 201, f"Booking failed: {booking_resp.get_data(as_text=True)}")
        booking_data = booking_resp.get_json()
        self.assertIn("appointment_id", booking_data['data'])
        self.assertEqual(booking_data['data']['queue_position'], 1)

    def test_04_role_authorization_security_boundaries(self):
        print("Testing route role-authorization checks...")
        # Create Patient
        self.client.post('/api/auth/signup', json={
            "full_name": "Kyle Reese",
            "email": "kyle.r@future.net",
            "password": "password123"
        })
        patient_headers = self.get_jwt_headers("kyle.r@future.net", "password123")
        doctor_a_headers = self.get_jwt_headers("sarah.c@hospital.com", "doctor_pass123")
        doctor_b_headers = self.get_jwt_headers("peter.s@hospital.com", "doctor_pass456")

        # 1. Patient tries to access admin-only view system appointments route
        resp = self.client.get('/api/admin/appointments', headers=patient_headers)
        self.assertEqual(resp.status_code, 403, f"Response: {resp.get_data(as_text=True)}")

        # 2. Patient tries to update profile of another patient ID
        resp = self.client.put('/api/patient/profile/update/999', headers=patient_headers, json={
            "age": 30
        })
        self.assertEqual(resp.status_code, 403, f"Response: {resp.get_data(as_text=True)}")

        # 3. Doctor tries to update patient's demographics
        resp = self.client.put('/api/patient/profile/update/1', headers=doctor_a_headers, json={
            "age": 35
        })
        self.assertEqual(resp.status_code, 403, f"Response: {resp.get_data(as_text=True)}")

        # 4. Doctor A tries to retrieve/view Doctor B's queue today
        resp = self.client.get(f'/api/queue/{self.doctor_b.id}/today', headers=doctor_a_headers)
        self.assertEqual(resp.status_code, 403, f"Response: {resp.get_data(as_text=True)}")

        # 5. Doctor A tries to call out patient on Doctor B's queue
        db_patient = Patient.query.filter_by(email="kyle.r@future.net").first()
        today_date = date.today()
        # Create schedule for Doctor B
        schedule_b = DoctorSchedule(
            doctor_id=self.doctor_b.id,
            date=today_date,
            is_available=True,
            max_sessions=5
        )
        db.session.add(schedule_b)
        db.session.commit()

        # Book appointment for B
        resp = self.client.post('/api/patient/appointment/book', headers=patient_headers, json={
            "doctor_id": self.doctor_b.id,
            "date": today_date.isoformat()
        })
        self.assertEqual(resp.status_code, 201, f"Response: {resp.get_data(as_text=True)}")
        appt_id = resp.get_json()['data']['appointment_id']

        # Doctor A tries to callout Doctor B's patient
        resp = self.client.put(f'/api/queue/{appt_id}/callout', headers=doctor_a_headers)
        self.assertEqual(resp.status_code, 403, f"Response: {resp.get_data(as_text=True)}")

        # Doctor B successfully calls out patient
        resp = self.client.put(f'/api/queue/{appt_id}/callout', headers=doctor_b_headers)
        self.assertEqual(resp.status_code, 200, f"Response: {resp.get_data(as_text=True)}")

        # Doctor A tries to complete Doctor B's patient session
        resp = self.client.put(f'/api/queue/{appt_id}/complete', headers=doctor_a_headers, json={
            "reason": "Blood pressure check"
        })
        self.assertEqual(resp.status_code, 403, f"Response: {resp.get_data(as_text=True)}")

        # Doctor B successfully completes the session
        resp = self.client.put(f'/api/queue/{appt_id}/complete', headers=doctor_b_headers, json={
            "reason": "Consultation done"
        })
        self.assertEqual(resp.status_code, 200, f"Response: {resp.get_data(as_text=True)}")

    def test_05_prescription_write_doctor_matching(self):
        print("Testing prescription writing matching rules...")
        # Create Patient
        self.client.post('/api/auth/signup', json={
            "full_name": "Kyle Reese",
            "email": "kyle.r@future.net",
            "password": "password123"
        })
        db_patient = Patient.query.filter_by(email="kyle.r@future.net").first()
        doctor_a_headers = self.get_jwt_headers("sarah.c@hospital.com", "doctor_pass123")
        doctor_b_headers = self.get_jwt_headers("peter.s@hospital.com", "doctor_pass456")

        # Create a VisitHistory with Doctor B
        visit = VisitHistory(
            appointment_id=1,
            patient_id=db_patient.id,
            patient_name=db_patient.full_name,
            doctor_id=self.doctor_b.id,
            reason="Mental health eval",
            visit_date=date.today()
        )
        db.session.add(visit)
        db.session.commit()

        # Doctor A tries to write prescription for Doctor B's visit
        resp = self.client.post('/api/prescription/write', headers=doctor_a_headers, json={
            "visit_id": visit.id,
            "diagnosis": "Healthy",
            "medicines_dosage": "None"
        })
        self.assertEqual(resp.status_code, 403, f"Response: {resp.get_data(as_text=True)}")
        self.assertIn("not the attending doctor", resp.get_json()['error'])

        # Doctor B writes the prescription successfully
        resp = self.client.post('/api/prescription/write', headers=doctor_b_headers, json={
            "visit_id": visit.id,
            "diagnosis": "Slight anxiety",
            "medicines_dosage": "Rest and sleep"
        })
        self.assertEqual(resp.status_code, 201, f"Response: {resp.get_data(as_text=True)}")

    def test_06_avatar_upload_workflow(self):
        print("Testing file avatar upload rules & patient update...")
        self.client.post('/api/auth/signup', json={
            "full_name": "Kyle Reese",
            "email": "kyle.r@future.net",
            "password": "password123"
        })
        patient_headers = self.get_jwt_headers("kyle.r@future.net", "password123")

        # Create mock file upload
        data = {
            'file': (BytesIO(b"dummy image content"), 'avatar.png')
        }
        resp = self.client.post('/api/upload/avatar', headers=patient_headers, data=data, content_type='multipart/form-data')
        self.assertEqual(resp.status_code, 200, f"Response: {resp.get_data(as_text=True)}")
        resp_data = resp.get_json()
        self.assertTrue(resp_data['success'])
        self.assertIn("photo_url", resp_data)

        # Check that the patient profile in the DB was updated with the photo_url
        patient = Patient.query.filter_by(email="kyle.r@future.net").first()
        self.assertIsNotNone(patient.photo_url)
        self.assertEqual(patient.photo_url, resp_data['photo_url'])

        # Cleanup uploaded file if it exists on disk
        if os.path.exists(patient.photo_url):
            os.remove(patient.photo_url)


if __name__ == '__main__':
    unittest.main()
