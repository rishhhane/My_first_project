from flask import Blueprint, request, jsonify
from services.queue_service import QueueService
from utils.response import ApiResponse
from middlewares.jwt_guard import jwt_required_guard
from middlewares.role_guard import roles_allowed
 
queue_bp = Blueprint("queue", __name__, url_prefix="/api/queue")
 
 
@queue_bp.route("/<int:doctor_id>/today", methods=["GET"])
@jwt_required_guard()
@roles_allowed("doctor", "admin")
def full_queue_snapshot(doctor_id):
    """
    GET /api/queue/<doctor_id>/today?date=YYYY-MM-DD
    Full queue grouped by status.
    """
    from flask import g
    if g.user_role == 'doctor' and g.user_id != doctor_id:
        body, status = ApiResponse.error("Access Forbidden", "You are not authorized to view another doctor's queue snapshot.", status=403)
        return jsonify(body), status

    date_str = request.args.get("date")
    response    = QueueService.get_full_queue_snapshot(doctor_id, date_str)
    status_code = response.pop("status_code", 200)
 
    if "error" in response:
        body, status = ApiResponse.error(response["error"], response.get("details"), status_code)
    else:
        body, status = ApiResponse.success(response, "Queue snapshot fetched.", status_code)
 
    return jsonify(body), status
 
 
@queue_bp.route("/<int:doctor_id>/capacity", methods=["GET"])
@jwt_required_guard()
def queue_capacity(doctor_id):
    """
    GET /api/queue/<doctor_id>/capacity?date=YYYY-MM-DD
    Slots booked vs available — used by patient booking page.
    BUG 12 FIX: Was <string:doctor_id>.
    """
    date_str = request.args.get("date")
    if not date_str:
        body, status = ApiResponse.error("Query param 'date' is required. Example: ?date=2026-06-25", status=400)
        return jsonify(body), status
 
    response    = QueueService.get_queue_capacity(doctor_id, date_str)
    status_code = response.pop("status_code", 200)
 
    if "error" in response:
        body, status = ApiResponse.error(response["error"], response.get("details"), status_code)
    else:
        body, status = ApiResponse.success(response, "Capacity fetched.", status_code)
 
    return jsonify(body), status
 
 
@queue_bp.route("/<int:doctor_id>/active", methods=["GET"])
@jwt_required_guard()
@roles_allowed("doctor", "admin")
def active_queue(doctor_id):
    """
    GET /api/queue/<doctor_id>/active?date=YYYY-MM-DD
    Active queue (pending + called) for the doctor's live view.
    BUG 12 FIX: Was <string:doctor_id>.
    """
    from flask import g
    if g.user_role == 'doctor' and g.user_id != doctor_id:
        body, status = ApiResponse.error("Access Forbidden", "You are not authorized to view another doctor's active queue.", status=403)
        return jsonify(body), status

    date_str    = request.args.get("date")
    response    = QueueService.get_doctor_queue(doctor_id, date_str)
    status_code = response.pop("status_code", 200)
 
    if "error" in response:
        body, status = ApiResponse.error(response["error"], response.get("details"), status_code)
    else:
        body, status = ApiResponse.success(response, "Active queue fetched.", status_code)
 
    return jsonify(body), status
 
 
@queue_bp.route("/<int:appointment_id>/callout", methods=["PUT"])
@jwt_required_guard()
@roles_allowed("doctor", "admin")
def callout(appointment_id):
    """PUT /api/queue/<appointment_id>/callout"""
    from flask import g
    response    = QueueService.callout_patient(appointment_id, g.user_id, g.user_role)
    status_code = response.pop("status_code", 200)
 
    if "error" in response:
        body, status = ApiResponse.error(response["error"], response.get("details"), status_code)
    else:
        body, status = ApiResponse.success(None, response["message"], status_code)
 
    return jsonify(body), status
 
 
@queue_bp.route("/<int:appointment_id>/complete", methods=["PUT"])
@jwt_required_guard()
@roles_allowed("doctor", "admin")
def complete(appointment_id):
    """
    PUT /api/queue/<appointment_id>/complete
    Body (optional): { "reason": "Blood pressure checkup" }
    """
    data   = request.get_json() or {}
    reason = data.get("reason")
 
    from flask import g
    response    = QueueService.complete_session(appointment_id, g.user_id, g.user_role, reason)
    status_code = response.pop("status_code", 200)
 
    if "error" in response:
        body, status = ApiResponse.error(response["error"], response.get("details"), status_code)
    else:
        body, status = ApiResponse.success(response.get("visit_history"), response["message"], status_code)
 
    return jsonify(body), status
 
 
@queue_bp.route("/<int:appointment_id>/skip", methods=["PUT"])
@jwt_required_guard()
@roles_allowed("doctor", "admin")
def skip(appointment_id):
    """PUT /api/queue/<appointment_id>/skip"""
    from flask import g
    response    = QueueService.skip_patient(appointment_id, g.user_id, g.user_role)
    status_code = response.pop("status_code", 200)
 
    if "error" in response:
        body, status = ApiResponse.error(response["error"], response.get("details"), status_code)
    else:
        body, status = ApiResponse.success(None, response["message"], status_code)
 
    return jsonify(body), status