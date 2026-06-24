import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models.doctor import Doctor

def run_test():
    app = create_app()
    with app.app_context():
        try:
            # Instantiate a test doctor instance
            d = Doctor(
                full_name="Dr. Sarah Connor",
                email="sarah.c@hospital.com",
                specialty="Cardiology",
                room_number="Room 405"
            )
            
            print("\n" + "="*50)
            print("🚀 DOCTOR MODEL VALIDATION SUCCESSFUL")
            print(f"   Doctor Name: {d.full_name}")
            print(f"   Specialty  : {d.specialty} ({d.room_number})")
            print("="*50 + "\n")
            
        except Exception as e:
            print(f"\n❌ Validation Error: {str(e)}\n")

if __name__ == "__main__":
    run_test()