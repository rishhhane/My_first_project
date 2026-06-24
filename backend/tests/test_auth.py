import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models.admin import Admin


def run_test():
    app = create_app()
    with app.app_context():
        try:
            # FIXED: added missing 'name' field (nullable=False)
            a = Admin(
                username = "admin_root",
                email    = "root@hospital.com",
                role     = "superadmin",
                name     = "Root Administrator"
            )

            print("\n" + "="*50)
            print("🚀 ADMIN MODEL VALIDATION SUCCESSFUL")
            print(f"   Admin User: {a.username}")
            print(f"   Name      : {a.name}")
            print(f"   Role Level: {a.role}")
            print("="*50 + "\n")

        except Exception as e:
            print(f"\n❌ Validation Error: {str(e)}\n")


if __name__ == "__main__":
    run_test()