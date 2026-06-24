from flask import Blueprint, request, jsonify, g
from services.patient_service import PatientService
from services.appointment_service import AppointmentService
from utils.response import ApiResponse
from middlewares.jwt_guard import jwt_required_guard
from middlewares.role_guard import roles_allowed

patient_bp = Blueprint('patient', __name__, url_prefix='/api/patient')


@patient_bp.route('/profile/update/<int:patient_id>', methods=['PUT'])
@jwt_required_guard()
def update_profile(patient_id):
    if g.user_role != 'admin' and (g.user_role != 'patient' or g.user_id != patient_id):
        body, status = ApiResponse.error("Access Forbidden", "You are not authorized to modify this profile.", status=403)
        return jsonify(body), status

    data = request.get_json() or {}
    response = PatientService.update_demographics(patient_id, data)
    status_code = response.pop('status_code', 200)

    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(response['patient'], response['message'], status_code)

    return jsonify(body), status


@patient_bp.route('/doctors', methods=['GET'])
@jwt_required_guard()
def search_directory():
    department = request.args.get('department')
    response = PatientService.browse_doctors(department)
    status_code = response.pop('status_code', 200)

    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(response['doctors'], "Doctor directory fetched successfully.", status_code)

    return jsonify(body), status


@patient_bp.route('/departments', methods=['GET'])
def list_departments():
    try:
        from models.department import Department
        depts = Department.query.order_by(Department.name.asc()).all()
        return jsonify({
            "success": True,
            "message": "Departments fetched successfully.",
            "data": [d.name for d in depts]
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch departments",
            "details": str(e)
        }), 500


# ADDED: was completely missing — no route called AppointmentService.book() anywhere
@patient_bp.route('/appointment/book', methods=['POST'])
@jwt_required_guard()
def book_appointment():
    """POST /api/patient/appointment/book  Body: { "doctor_id": 1, "date": "YYYY-MM-DD" }"""
    if g.user_role != 'patient':
        body, status = ApiResponse.error("Access Forbidden", "Only patients can book appointments.", status=403)
        return jsonify(body), status

    data = request.get_json() or {}
    data['patient_id'] = g.user_id  # patients can only book for themselves

    response = AppointmentService.book(data)
    status_code = response.pop('status_code', 201)

    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(response['appointment'], response['message'], status_code)

    return jsonify(body), status


# ADDED: AppointmentService.cancel() existed but had no route
@patient_bp.route('/appointment/<int:appointment_id>/cancel', methods=['DELETE'])
@jwt_required_guard()
def cancel_appointment(appointment_id):
    """DELETE /api/patient/appointment/<id>/cancel"""
    if g.user_role not in ['patient', 'admin']:
        body, status = ApiResponse.error("Access Forbidden", "Only patients or admins can cancel appointments.", status=403)
        return jsonify(body), status

    response = AppointmentService.cancel(appointment_id, g.user_id, g.user_role)
    status_code = response.pop('status_code', 200)

    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(None, response['message'], status_code)

    return jsonify(body), status


# ADDED: AppointmentService.get_all() existed but had no route
@patient_bp.route('/appointments', methods=['GET'])
@jwt_required_guard()
def get_my_appointments():
    """GET /api/patient/appointments"""
    if g.user_role != 'patient':
        body, status = ApiResponse.error("Access Forbidden", "Only patients can view their appointments via this endpoint.", status=403)
        return jsonify(body), status

    response = AppointmentService.get_all(g.user_id)
    status_code = response.pop('status_code', 200)

    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(response['appointments'], "Appointments fetched successfully.", status_code)

    return jsonify(body), status


# ADDED: AppointmentService.get_position() existed but had no route
@patient_bp.route('/appointment/<int:appointment_id>/position', methods=['GET'])
@jwt_required_guard()
def get_queue_position(appointment_id):
    """GET /api/patient/appointment/<id>/position"""
    response = AppointmentService.get_position(appointment_id, g.user_id, g.user_role)
    status_code = response.pop('status_code', 200)

    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(response, "Queue position fetched successfully.", status_code)

    return jsonify(body), status


@patient_bp.route('/<int:patient_id>/details', methods=['GET'])
@jwt_required_guard()
@roles_allowed('doctor', 'admin', 'patient')
def get_patient_details(patient_id):
    """GET /api/patient/<patient_id>/details"""
    if g.user_role == 'patient' and g.user_id != patient_id:
        body, status = ApiResponse.error("Access Forbidden", "You can only view your own details.", status=403)
        return jsonify(body), status

    response = PatientService.get_patient_details_and_history(patient_id)
    status_code = response.pop('status_code', 200)

    if "error" in response:
        body, status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, status = ApiResponse.success(response, "Patient details and history fetched.", status_code)

    return jsonify(body), status