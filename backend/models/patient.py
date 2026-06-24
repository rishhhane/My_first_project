from extensions import db
from datetime import datetime
import bcrypt


class Patient(db.Model):
    __tablename__ = 'patients'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone_no = db.Column(db.String(15))
    blood_group = db.Column(db.String(5))
    age = db.Column(db.Integer)
    city = db.Column(db.String(50))
    pin_code = db.Column(db.String(10))
    photo_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        # FIX: replaced SHA-256 with bcrypt — bcrypt is slow by design, making brute-force attacks infeasible
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "phone_no": self.phone_no,
            "blood_group": self.blood_group,
            "age": self.age,
            "city": self.city,
            "pin_code": self.pin_code,
            "photo_url": self.photo_url
        }