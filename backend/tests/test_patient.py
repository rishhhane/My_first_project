import sys
import os

# This adds the root folder to Python's search path so it can find 'app' and 'models'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models.patient import Patient

def run_test():
    # 1. Initialize the application factory context
    app = create_app()

    with app.app_context():
        try:
            # 2. Try instantiating a patient with the new blood group field
            p = Patient(
                full_name="Alex Smith", 
                email="alex.smith@hospital.com", 
                blood_group="AB-"
            )
            
            # 3. Print out success metrics
            print("\n" + "="*50)
            print("🚀 PATIENT MODEL VALIDATION SUCCESSFUL")
            print(f"   Patient Name: {p.full_name}")
            print(f"   Blood Group : {p.blood_group}")
            print("="*50 + "\n")
            
        except Exception as e:
            print(f"\n❌ Validation Error encountered: {str(e)}\n")

if __name__ == "__main__":
    run_test()