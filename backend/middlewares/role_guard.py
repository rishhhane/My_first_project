"""
middlewares/role_guard.py
---------------------------
FIXED (this file was NOT updated in your RAR — still had the old broken version):

  Old version read from request.user_identity and expected it to be a dict
  with a "role" key. But the fixed auth_service.py now creates tokens with
  additional_claims, and the fixed jwt_guard.py stores the role on g.user_role
  — not on request.user_identity.

  Result: old role_guard got a string from request.user_identity
  (because jwt_guard stored the plain user_id string there on parse failure),
  the isinstance(user_identity, dict) check failed, and every request
  was blocked with a 403 before any business logic ran.

  This version reads g.user_role set by the fixed jwt_guard.py.
"""

from functools import wraps
from flask import jsonify, g


def roles_allowed(*allowed_roles):
    """
    Checks that the logged-in user's role matches one of the allowed roles.
    Must always be placed AFTER @jwt_required_guard() in the decorator stack.

    Usage:
        @jwt_required_guard()
        @roles_allowed("doctor")              # only doctors
        @roles_allowed("admin", "doctor")     # admin or doctor
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_role = getattr(g, "user_role", None)

            if not user_role:
                return jsonify({
                    "error":   "Access denied",
                    "details": "No role found in token. Did you forget @jwt_required_guard() above this?",
                }), 403

            if user_role not in allowed_roles:
                return jsonify({
                    "error":          "Unauthorized access level",
                    "details":        f"Your role '{user_role}' cannot access this endpoint.",
                    "required_roles": list(allowed_roles),
                }), 403

            return f(*args, **kwargs)

        return decorated_function
    return decorator
