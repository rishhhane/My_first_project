from flask import Blueprint, request, jsonify, g
from services.prescription_service import PrescriptionService
from utils.response import ApiResponse
from middlewares.jwt_guard import jwt_required_guard
from middlewares.role_guard import roles_allowed

prescription_bp = Blueprint("prescription", __name__, url_prefix="/api/prescription")


@prescription_bp.route("/write", methods=["POST"])
@jwt_required_guard()
@roles_allowed("doctor")
def write_prescription():
    """
    POST /api/prescription/write
    Body: { "visit_id": 1, "diagnosis": "...", "medicines_dosage": "...", "instructions": "..." }
    """
    data = request.get_json() or {}
    response = PrescriptionService.write_prescription(data, g.user_id)
    status_code = response.pop("status_code", 200)

    if "error" in response:
        # BUG 10 FIX: jsonify(*ApiResponse.error(...)) expands to jsonify(dict, int)
        # which Flask serialises as a JSON array and loses the HTTP status code.
        # Correct form: unpack into two variables, return as a tuple.
        body, status = ApiResponse.error(response["error"], response.get("details"), status_code)
        return jsonify(body), status

    body, status = ApiResponse.success(response["prescription"], response["message"], status_code)
    return jsonify(body), status


@prescription_bp.route("/patient/<int:patient_id>", methods=["GET"])
@jwt_required_guard()
@roles_allowed("doctor", "admin", "patient")
def get_patient_prescriptions(patient_id):
    """
    GET /api/prescription/patient/<patient_id>
    BUG 11 FIX: Was <string:patient_id>. Patient PKs are integers.
                Comparing g.user_id (int) != patient_id (str) was always True,
                so patients could never fetch their own prescriptions.
    Patients can only fetch their own; doctors and admins can fetch any.
    """
    if g.user_role == "patient" and g.user_id != patient_id:
        body, status = ApiResponse.error(
            "Access Forbidden",
            "You can only view your own prescriptions.",
            status=403
        )
        return jsonify(body), status

    response = PrescriptionService.get_records_for_patient(patient_id)
    status_code = response.pop("status_code", 200)

    if "error" in response:
        body, status = ApiResponse.error(response["error"], response.get("details"), status_code)
        return jsonify(body), status

    body, status = ApiResponse.success(response["prescriptions"], "Prescriptions fetched successfully.", status_code)
    return jsonify(body), status