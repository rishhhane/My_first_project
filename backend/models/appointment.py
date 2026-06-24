from extensions import db
from datetime import datetime

class Appointment(db.Model):
    __tablename__ = 'appointments'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False)
    
    patient_name = db.Column(db.String(100), nullable=False)
    doctor_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    
    appointment_date = db.Column(db.Date, nullable=False)
    queue_position = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'called', 'done', 'skipped', 'cancelled'
    
    booked_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        from models.visit_history import VisitHistory
        from models.prescription import Prescription
        visit = VisitHistory.query.filter_by(appointment_id=self.id).first()
        prescription_exists = False
        if visit:
            rx = Prescription.query.filter_by(visit_id=visit.id).first()
            prescription_exists = rx is not None
        return {
            "appointment_id": self.id,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "patient_name": self.patient_name,
            "doctor_name": self.doctor_name,
            "department": self.department,
            "appointment_date": self.appointment_date.isoformat() if self.appointment_date else None,
            "queue_position": self.queue_position,
            "status": self.status,
            "booked_at": self.booked_at.isoformat() if self.booked_at else None,
            "visit_id": visit.id if visit else None,
            "prescription_issued": prescription_exists
        }