from extensions import db
from models.patient import Patient
from models.doctor import Doctor
from models.admin import Admin
from utils.validators import Validators
from utils.response import ApiResponse
from flask_jwt_extended import create_access_token


class AuthService:

    @staticmethod
    def register_patient(data):
        try:
            if not data or 'full_name' not in data or 'email' not in data or 'password' not in data:
                return ApiResponse.error("Missing mandatory fields: full_name, email, and password are required", status=400)

            email = str(data['email']).strip()
            if not Validators.is_valid_email(email):
                return ApiResponse.error("Malformed email syntax address provided", status=400)

            # Cross-role email uniqueness check
            if Patient.query.filter_by(email=email).first() or \
               Doctor.query.filter_by(email=email).first() or \
               Admin.query.filter_by(email=email).first():
                return ApiResponse.error("An account with this email address already exists", status=409)

            # Demographic validations
            phone_no = data.get('phone_no')
            if phone_no and not Validators.is_valid_phone(phone_no):
                return ApiResponse.error("Invalid phone number format. Must be a 10-digit number.", status=400)

            pin_code = data.get('pin_code')
            if pin_code and not Validators.is_valid_pincode(pin_code):
                return ApiResponse.error("Invalid pin code format. Must be a 6-digit number.", status=400)

            age = data.get('age')
            if age is not None and not Validators.is_valid_age(age):
                return ApiResponse.error("Invalid age value. Must be a positive integer below 125.", status=400)

            blood_group = data.get('blood_group')
            if blood_group and not Validators.is_valid_blood_group(blood_group):
                return ApiResponse.error("Invalid blood group. Must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.", status=400)

            # Handle base64 avatar photo if provided
            photo_url = None
            avatar_data = data.get('avatar')
            if avatar_data and isinstance(avatar_data, str) and avatar_data.startswith('data:image'):
                try:
                    import base64
                    import os
                    from uuid import uuid4
                    header, encoded = avatar_data.split(",", 1)
                    file_data = base64.b64decode(encoded)
                    
                    ext = "png"
                    if "jpeg" in header or "jpg" in header:
                        ext = "jpg"
                    elif "webp" in header:
                        ext = "webp"
                    
                    upload_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'static', 'uploads', 'avatars'))
                    if not os.path.exists(upload_folder):
                        os.makedirs(upload_folder, exist_ok=True)
                        
                    filename = f"{uuid4().hex}.{ext}"
                    filepath = os.path.join(upload_folder, filename)
                    with open(filepath, "wb") as f:
                        f.write(file_data)
                    photo_url = f"static/uploads/avatars/{filename}"
                except Exception as e:
                    print(f"Error saving base64 avatar: {e}")

            new_patient = Patient(
                full_name=data['full_name'].strip(),
                email=email,
                phone_no=phone_no.strip() if phone_no else None,
                blood_group=blood_group.strip().upper() if blood_group else None,
                age=int(age) if age is not None else None,
                city=data.get('city').strip() if data.get('city') else None,
                pin_code=pin_code.strip() if pin_code else None,
                photo_url=photo_url or data.get('photo_url')
            )
            new_patient.set_password(data['password'])

            db.session.add(new_patient)
            db.session.commit()

            return ApiResponse.success(new_patient.to_dict(), "Patient registered successfully!", status=201)
        except Exception as e:
            db.session.rollback()
            return ApiResponse.error("Internal registration framework breakdown", details=str(e), status=500)

    @staticmethod
    def register_doctor(data):
        try:
            if not data or 'full_name' not in data or 'email' not in data or 'password' not in data or 'specialty' not in data or 'room_number' not in data:
                return ApiResponse.error("Missing mandatory fields: full_name, email, password, specialty, and room_number are required", status=400)

            email = str(data['email']).strip()
            if not Validators.is_valid_email(email):
                return ApiResponse.error("Malformed email syntax address provided", status=400)

            # Cross-role email uniqueness check
            if Patient.query.filter_by(email=email).first() or \
               Doctor.query.filter_by(email=email).first() or \
               Admin.query.filter_by(email=email).first():
                return ApiResponse.error("An account with this email address already exists", status=409)

            new_doctor = Doctor(
                full_name=data['full_name'].strip(),
                email=email,
                specialty=data['specialty'].strip(),
                department=data.get('department', data['specialty']).strip() if data.get('department') else data['specialty'].strip(),
                room_number=data['room_number'].strip(),
                status=data.get('status', 'OUT'),
                no_of_sessions=int(data.get('no_of_sessions', 20))
            )
            new_doctor.set_password(data['password'])

            db.session.add(new_doctor)
            db.session.commit()

            return ApiResponse.success(new_doctor.to_dict(), "Doctor registered successfully!", status=201)
        except Exception as e:
            db.session.rollback()
            return ApiResponse.error("Internal registration framework breakdown", details=str(e), status=500)

    @staticmethod
    def register_admin(data):
        try:
            if not data or 'name' not in data or 'username' not in data or 'email' not in data or 'password' not in data:
                return ApiResponse.error("Missing mandatory fields: name, username, email, and password are required", status=400)

            email = str(data['email']).strip()
            if not Validators.is_valid_email(email):
                return ApiResponse.error("Malformed email syntax address provided", status=400)

            username = str(data['username']).strip()
            # Cross-role email uniqueness check
            if Patient.query.filter_by(email=email).first() or \
               Doctor.query.filter_by(email=email).first() or \
               Admin.query.filter_by(email=email).first():
                return ApiResponse.error("An account with this email address already exists", status=409)

            # Username uniqueness check for admin
            if Admin.query.filter_by(username=username).first():
                return ApiResponse.error("Username already taken", status=409)

            new_admin = Admin(
                name=data['name'].strip(),
                username=username,
                email=email,
                role=data.get('role', 'admin')
            )
            new_admin.set_password(data['password'])

            db.session.add(new_admin)
            db.session.commit()

            return ApiResponse.success(new_admin.to_dict(), "Admin registered successfully!", status=201)
        except Exception as e:
            db.session.rollback()
            return ApiResponse.error("Internal registration framework breakdown", details=str(e), status=500)

    @staticmethod
    def login_user(data):
        try:
            if not data or 'email' not in data or 'password' not in data:
                return {"error": "Invalid email or password", "success": False}, 401

            user = Patient.query.filter_by(email=data['email']).first()
            role = 'patient'

            if not user:
                user = Doctor.query.filter_by(email=data['email']).first()
                role = 'doctor'

            if not user:
                user = Admin.query.filter_by(email=data['email']).first()
                role = 'admin'

            if not user or not user.check_password(data['password']):
                return {"error": "Invalid email or password", "success": False}, 401

            import json
            identity_payload = json.dumps({"id": user.id, "role": role})
            access_token = create_access_token(identity=identity_payload)

            return {
                "success": True,
                "message": "Authentication successful!",
                "data": {
                    "access_token": access_token,
                    "role": role,
                    "user": user.to_dict()
                }
            }, 200

        except Exception as e:
            return {"error": "Authentication failed", "details": str(e), "success": False}, 500
