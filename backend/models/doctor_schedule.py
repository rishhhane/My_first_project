from extensions import db
from datetime import datetime

class DoctorSchedule(db.Model):
    __tablename__ = 'doctor_schedules'

    # FIXED: unique constraint prevents duplicate rows under concurrent admin requests
    __table_args__ = (
        db.UniqueConstraint('doctor_id', 'date', name='uq_doctor_schedule_per_day'),
    )

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    is_available = db.Column(db.Boolean, default=True)
    max_sessions = db.Column(db.Integer, default=20)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "schedule_id": self.id,
            "doctor_id": self.doctor_id,
            "date": self.date.isoformat() if self.date else None,
            "is_available": self.is_available,
            "max_sessions": self.max_sessions
        }