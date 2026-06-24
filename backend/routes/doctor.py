from flask import Blueprint, request, jsonify
from services.doctor_service import DoctorService
from utils.response import ApiResponse
from middlewares.jwt_guard import jwt_required_guard
from middlewares.role_guard import roles_allowed

doctor_bp = Blueprint('doctor', __name__, url_prefix='/api/doctor')


@doctor_bp.route('/attendance', methods=['POST'])
@jwt_required_guard()
@roles_allowed('doctor', 'admin')
def toggle_status():
    """
    POST /api/doctor/attendance
    Body: { "doctor_id": 1, "status": "IN" | "OUT" }
    """
    data = request.get_json() or {}
    doctor_id = data.get('doctor_id')
    status    = data.get('status')

    if not doctor_id or not status:
        # BUG 10 FIX: jsonify(*ApiResponse.error(...)) was discarding the HTTP status
        # code and wrapping the response as a JSON array. Unpacked properly below.
        body, http_status = ApiResponse.error("Missing doctor_id or status value", status=400)
        return jsonify(body), http_status

    response    = DoctorService.toggle_attendance(doctor_id, status)
    status_code = response.pop('status_code', 200)

    if "error" in response:
        body, http_status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, http_status = ApiResponse.success(response['doctor'], response['message'], status_code)

    return jsonify(body), http_status


@doctor_bp.route('/schedule', methods=['POST'])
@jwt_required_guard()
@roles_allowed('doctor', 'admin')
def configure_calendar():
    """
    POST /api/doctor/schedule
    Body: { "doctor_id": 1, "date": "2026-07-01", "is_available": true, "max_sessions": 20 }
    """
    data = request.get_json() or {}

    response    = DoctorService.set_availability_calendar(data)
    status_code = response.pop('status_code', 200)

    if "error" in response:
        body, http_status = ApiResponse.error(response['error'], response.get('details'), status_code)
    else:
        body, http_status = ApiResponse.success(response['schedule'], response['message'], status_code)

    return jsonify(body), http_status


@doctor_bp.route('/<int:doctor_id>/schedules', methods=['GET'])
@jwt_required_guard()
def get_schedules(doctor_id):
    """
    GET /api/doctor/<doctor_id>/schedules
    Retrieves all schedule allocations for a doctor.
    """
    try:
        from models.doctor_schedule import DoctorSchedule
        schedules = DoctorSchedule.query.filter_by(doctor_id=doctor_id).all()
        return jsonify({
            "success": True,
            "message": "Schedules fetched successfully.",
            "data": [s.to_dict() for s in schedules]
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch schedules",
            "details": str(e)
        }), 500