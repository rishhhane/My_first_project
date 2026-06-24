from extensions import db
from datetime import datetime

class VisitHistory(db.Model):
    __tablename__ = 'visit_history'

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id', ondelete='CASCADE'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False)
    patient_name = db.Column(db.String(100), nullable=False)
    reason = db.Column(db.Text)
    # FIXED: was 'visited_at' — DB column is 'visit_date' (see migration)
    visit_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "visit_id": self.id,
            "appointment_id": self.appointment_id,
            "patient_id": self.patient_id,
            "patient_name": self.patient_name,
            "doctor_id": self.doctor_id,
            "reason": self.reason,
            "visit_date": self.visit_date.isoformat() if self.visit_date else None
        }