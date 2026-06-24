from extensions import db
from datetime import datetime
import bcrypt


class Doctor(db.Model):
    __tablename__ = 'doctors'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    specialty = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100))
    room_number = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(10), default='OUT')
    no_of_sessions = db.Column(db.Integer, default=0)
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, password):
        # FIX: replaced SHA-256 with bcrypt
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
            "specialty": self.specialty,
            "department": self.department,
            "room_number": self.room_number,
            "status": self.status,
            "no_of_sessions": self.no_of_sessions,
            "is_available": self.is_available
        }
