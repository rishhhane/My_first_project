from extensions import db
from datetime import datetime

class Prescription(db.Model):
    __tablename__ = 'prescriptions'

    id = db.Column(db.Integer, primary_key=True)
    visit_id = db.Column(db.Integer, db.ForeignKey('visit_history.id', ondelete='CASCADE'), nullable=False)
    
    # FIXED: Updated target mapping route context path from 'patients.patient_id' to 'patients.id'
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False)
    
    patient_name = db.Column(db.String(100), nullable=False)
    patient_age = db.Column(db.Integer)
    doctor_name = db.Column(db.String(100), nullable=False)
    
    diagnosis = db.Column(db.Text, nullable=False)
    medicines_dosage = db.Column(db.Text, nullable=False)
    instructions = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "prescription_id": self.id,
            "visit_id": self.visit_id,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "patient_name": self.patient_name,
            "patient_age": self.patient_age,
            "doctor_name": self.doctor_name,
            "diagnosis": self.diagnosis,
            "medicines_dosage": self.medicines_dosage,
            "instructions": self.instructions,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }