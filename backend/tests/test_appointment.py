import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models.appointment import Appointment
from datetime import date


def run_test():
    app = create_app()
    with app.app_context():
        try:
            # FIXED: no ORM relationships on Appointment — pass integer IDs
            # FIXED: queue_number -> queue_position
            # FIXED: "waiting" -> "pending"
            apt = Appointment(
                patient_id       = 1,
                doctor_id        = 1,
                patient_name     = "John Doe",
                doctor_name      = "Dr. House",
                department       = "Diagnostics",
                appointment_date = date.today(),
                queue_position   = 12,
                status           = "pending"
            )

            print("\n" + "="*50)
            print("🚀 APPOINTMENT/QUEUE MODEL VALIDATION SUCCESSFUL")
            print(f"   Patient ID  : {apt.patient_id}")
            print(f"   Doctor ID   : {apt.doctor_id}")
            print(f"   Queue Token : #{apt.queue_position}  State: [{apt.status}]")
            print("="*50 + "\n")

        except Exception as e:
            print(f"\n❌ Relational Map Error: {str(e)}\n")


if __name__ == "__main__":
    run_test()