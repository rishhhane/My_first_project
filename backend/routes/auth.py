from flask import Blueprint, request, jsonify
from services.auth_service import AuthService
from utils.response import ApiResponse

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}

    response, status_code = AuthService.register_patient(data)

    if "error" in response:
        body, status = ApiResponse.error(
            message=response.get("error"),
            details=response.get("details"),
            status=status_code
        )
    else:
        # FIX: AuthService.register_patient returns ApiResponse.success(new_patient.to_dict(), ...)
        # which packs the patient dict under the key "data", not "patient"
        body, status = ApiResponse.success(
            data=response.get("data"),
            message=response.get("message"),
            status=status_code
        )

    return jsonify(body), status


@auth_bp.route('/signup/doctor', methods=['POST'])
def signup_doctor():
    data = request.get_json() or {}

    response, status_code = AuthService.register_doctor(data)

    if "error" in response:
        body, status = ApiResponse.error(
            message=response.get("error"),
            details=response.get("details"),
            status=status_code
        )
    else:
        body, status = ApiResponse.success(
            data=response.get("data"),
            message=response.get("message"),
            status=status_code
        )

    return jsonify(body), status


@auth_bp.route('/signup/admin', methods=['POST'])
def signup_admin():
    data = request.get_json() or {}

    response, status_code = AuthService.register_admin(data)

    if "error" in response:
        body, status = ApiResponse.error(
            message=response.get("error"),
            details=response.get("details"),
            status=status_code
        )
    else:
        body, status = ApiResponse.success(
            data=response.get("data"),
            message=response.get("message"),
            status=status_code
        )

    return jsonify(body), status


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}

    response, status_code = AuthService.login_user(data)

    if "error" in response:
        body, status = ApiResponse.error(
            message=response.get("error"),
            details=response.get("details"),
            status=status_code
        )
    else:
        body, status = ApiResponse.success(
            data=response.get("data"),
            message=response.get("message"),
            status=status_code
        )

    return jsonify(body), status
