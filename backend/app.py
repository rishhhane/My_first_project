import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from extensions import db, jwt, migrate

import models

# Import all modular blueprint routers
from routes.auth import auth_bp
from routes.queue import queue_bp
from routes.prescription import prescription_bp
from routes.admin import admin_bp         
from routes.doctor import doctor_bp       
from routes.patient import patient_bp     
from routes.upload import upload_bp       

def create_app():
    dist_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), 'dist'))
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    
    # Configure CORS
    CORS(app)
    
    # Initialize Core Extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    @app.before_request
    def delete_expired_visits_and_appointments():
        try:
            from datetime import datetime, date, timedelta
            from models.visit_history import VisitHistory
            from models.appointment import Appointment
            
            # Clean up pending/called appointments from previous days
            today = date.today()
            Appointment.query.filter(
                Appointment.appointment_date < today,
                Appointment.status.in_(['pending', 'called'])
            ).delete(synchronize_session=False)

            # Clean up old visit histories
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            VisitHistory.query.filter(VisitHistory.visit_date < thirty_days_ago).delete()
            
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error during expired data cleanup: {str(e)}")
            
    with app.app_context():
        db.create_all()
        from models.department import Department
        if Department.query.count() == 0:
            for dept_name in ['General Medicine', 'Cardiology', 'Psychiatry', 'Diagnostics', 'Pediatrics']:
                db.session.add(Department(name=dept_name))
            db.session.commit()
            
        # Clean up legacy orphaned data from previous test runs
        from models.appointment import Appointment
        from models.visit_history import VisitHistory
        from models.prescription import Prescription
        from models.patient import Patient
        from models.doctor import Doctor

        try:
            # 1. Delete prescriptions first (leaf node referencing visit_history, patients, and doctors)
            db.session.query(Prescription).filter(
                ~Prescription.patient_id.in_(db.session.query(Patient.id)) |
                ~Prescription.doctor_id.in_(db.session.query(Doctor.id)) |
                ~Prescription.visit_id.in_(db.session.query(VisitHistory.id))
            ).delete(synchronize_session=False)

            # 2. Delete visit histories (referencing patients and doctors)
            db.session.query(VisitHistory).filter(
                ~VisitHistory.patient_id.in_(db.session.query(Patient.id)) |
                ~VisitHistory.doctor_id.in_(db.session.query(Doctor.id))
            ).delete(synchronize_session=False)

            # 3. Delete appointments (referencing patients and doctors)
            db.session.query(Appointment).filter(
                ~Appointment.patient_id.in_(db.session.query(Patient.id)) |
                ~Appointment.doctor_id.in_(db.session.query(Doctor.id))
            ).delete(synchronize_session=False)

            db.session.commit()
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error during legacy database cleanup: {str(e)}")
            
    # Register ALL blueprints to Flask's network router matrix
    app.register_blueprint(auth_bp)
    app.register_blueprint(queue_bp)
    app.register_blueprint(prescription_bp)
    app.register_blueprint(admin_bp)      
    app.register_blueprint(doctor_bp)     
    app.register_blueprint(patient_bp)    
    app.register_blueprint(upload_bp)     
    
    # Serve backend static assets (e.g., patient uploaded profile pictures)
    @app.route('/static/<path:path>')
    def serve_backend_static(path):
        backend_static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))
        return send_from_directory(backend_static_dir, path)

    # SPA catch-all routing: serve React index.html for non-API routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(dist_folder, path)):
            return send_from_directory(dist_folder, path)
        else:
            return send_from_directory(dist_folder, 'index.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)