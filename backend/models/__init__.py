from extensions import db
from models.patient import Patient
from models.doctor import Doctor
from models.admin import Admin
from models.appointment import Appointment
from models.visit_history import VisitHistory
from models.doctor_schedule import DoctorSchedule
from models.prescription import Prescription
from models.department import Department

__all__ = ["db", "Patient", "Doctor", "Admin", "Appointment",
           "VisitHistory", "DoctorSchedule", "Prescription", "Department"]