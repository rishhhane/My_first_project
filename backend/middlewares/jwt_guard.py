from flask import request, jsonify, g
from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity


def jwt_required_guard():
    """
    Verifies JWT token, extracts identity dict, and exposes:
      - g.user_id   (int)
      - g.user_role (str: 'patient' | 'doctor' | 'admin')

    FIX: identity is now stored as a plain dict by auth_service,
    so no json.loads() or single-quote replacement is needed.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()

                identity = get_jwt_identity()
                if isinstance(identity, str):
                    import json
                    try:
                        identity = json.loads(identity)
                    except ValueError:
                        pass

                if not isinstance(identity, dict):
                    raise ValueError("Token identity is not a valid dict payload.")

                request.user_identity = identity
                g.user_id   = identity.get("id")
                g.user_role = identity.get("role")

                return f(*args, **kwargs)

            except Exception as e:
                import traceback
                traceback.print_exc()
                return jsonify({
                    "success": False,
                    "error":   "Authentication Guard Blocked Request",
                    "details": f"Missing, expired, or invalid authorization token credentials. Error: {str(e)}",
                }), 401

        return decorated_function
    return decorator
