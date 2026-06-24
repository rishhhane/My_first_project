from flask import Blueprint, request, jsonify, g
from middlewares.jwt_guard import jwt_required_guard
from services.upload_service import UploadService
from models.patient import Patient
from extensions import db

upload_bp = Blueprint('upload', __name__, url_prefix='/api/upload')

@upload_bp.route('/avatar', methods=['POST'])
@jwt_required_guard()
def upload_avatar():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part in the request"}), 400

    file = request.files['file']
    response = UploadService.save_avatar(file)
    status_code = response.get('status_code', 200)

    if 'error' in response:
        return jsonify({"success": False, "error": response['error'], "details": response.get('details')}), status_code

    # If the logged-in user is a patient, update their profile photo_url
    if g.user_role == 'patient':
        try:
            patient = Patient.query.get(g.user_id)
            if patient:
                patient.photo_url = response['photo_url']
                db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": "Failed to update profile photo reference in database", "details": str(e)}), 500

    return jsonify({
        "success": True,
        "message": response.get("message"),
        "photo_url": response.get("photo_url")
    }), status_code