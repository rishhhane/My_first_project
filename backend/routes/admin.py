from flask import Blueprint, request, jsonify
from extensions import db
from services.admin_service import AdminService
from utils.response import ApiResponse
from middlewares.jwt_guard import jwt_required_guard
from middlewares.role_guard import roles_allowed

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/add-doctor', methods=['POST'])
@jwt_required_guard()
@roles_allowed('admin') # Middleware checkpoint: Admin role required!
def add_doctor():
    """
    Onboards a fresh medical professional account entry profile.
    """
    data = request.get_json() or {}
    
    response = AdminService.create_doctor_profile(data)
    status_code = response.pop('status_code', 200)
    
    if "error" in response:
        body, status = ApiResponse.error(
            message=response.get("error"), 
            details=response.get("details"), 
            status=status_code
        )
    else:
        body, status = ApiResponse.success(
            data=response.get("doctor"), 
            message=response.get("message"), 
            status=status_code
        )
        
    return jsonify(body), status

@admin_bp.route('/appointments', methods=['GET'])
@jwt_required_guard()
@roles_allowed('admin')
def view_all_appointments():
    """
    Allows system administrators to extract global appointment audit summaries.
    """
    response = AdminService.get_system_appointments()
    status_code = response.pop('status_code', 200)
    
    if "error" in response:
        body, status = ApiResponse.error(
            message=response.get("error"), 
            details=response.get("details"), 
            status=status_code
        )
    else:
        body, status = ApiResponse.success(
            data=response.get("appointments"), 
            message="Global appointment record entries compiled cleanly.", 
            status=status_code
        )
        
    return jsonify(body), status


@admin_bp.route('/patient/search', methods=['GET'])
@jwt_required_guard()
@roles_allowed('admin')
def search_patient():
    query = request.args.get('query')
    if not query:
        body, status = ApiResponse.error("Query parameter 'query' is required", status=400)
        return jsonify(body), status

    response = AdminService.search_patient(query)
    status_code = response.pop('status_code', 200)

    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(response, "Patient details found", status_code)
    return jsonify(body), status


@admin_bp.route('/patient/<int:patient_id>', methods=['DELETE'])
@jwt_required_guard()
@roles_allowed('admin')
def delete_patient(patient_id):
    response = AdminService.delete_patient(patient_id)
    status_code = response.pop('status_code', 200)
    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(None, response['message'], status_code)
    return jsonify(body), status


@admin_bp.route('/doctor/<int:doctor_id>', methods=['DELETE'])
@jwt_required_guard()
@roles_allowed('admin')
def delete_doctor(doctor_id):
    response = AdminService.delete_doctor(doctor_id)
    status_code = response.pop('status_code', 200)
    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(None, response['message'], status_code)
    return jsonify(body), status


@admin_bp.route('/department', methods=['POST'])
@jwt_required_guard()
@roles_allowed('admin')
def add_department():
    try:
        data = request.get_json() or {}
        name = data.get("name")
        if not name or not name.strip():
            return jsonify({"success": False, "error": "Department name is required"}), 400
        
        name = name.strip()
        from models.department import Department
        existing = Department.query.filter(Department.name.ilike(name)).first()
        if existing:
            return jsonify({"success": False, "error": f"Department '{name}' already exists"}), 409
            
        new_dept = Department(name=name)
        db.session.add(new_dept)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Department '{name}' started successfully.",
            "data": new_dept.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Failed to add department",
            "details": str(e)
        }), 500


@admin_bp.route('/doctor/update/<int:doctor_id>', methods=['PUT'])
@jwt_required_guard()
@roles_allowed('admin')
def update_doctor(doctor_id):
    try:
        from models.doctor import Doctor
        from extensions import db
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return jsonify({"success": False, "error": "Doctor profile not found"}), 404
            
        data = request.get_json() or {}
        
        # Validations and updates
        if 'full_name' in data:
            doctor.full_name = data['full_name'].strip()
        if 'email' in data:
            email = data['email'].strip()
            # Unique email check
            from models.patient import Patient
            from models.admin import Admin
            is_duplicate = False
            if Patient.query.filter_by(email=email).first() or \
               Admin.query.filter_by(email=email).first():
                is_duplicate = True
            else:
                doc_existing = Doctor.query.filter_by(email=email).first()
                if doc_existing and doc_existing.id != doctor.id:
                    is_duplicate = True
            if is_duplicate:
                return jsonify({"success": False, "error": "An account with this email address already exists"}), 409
            doctor.email = email
            
        if 'specialty' in data:
            doctor.specialty = data['specialty'].strip()
        if 'department' in data:
            doctor.department = data['department'].strip()
        if 'room_number' in data:
            doctor.room_number = data['room_number'].strip()
        if 'no_of_sessions' in data:
            doctor.no_of_sessions = int(data['no_of_sessions'])
            
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Doctor profile updated successfully.",
            "data": doctor.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Failed to update doctor profile",
            "details": str(e)
        }), 500