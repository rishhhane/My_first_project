"""
utils/response.py
--------------------
CRITICAL: Your uploaded routes (admin.py, auth.py, doctor.py, patient.py,
prescription.py, queue.py) ALL import this:
    from utils.response import ApiResponse
...but this file was never included in your document. Every route would
fail at import time with ModuleNotFoundError / ImportError.

This implements ApiResponse.success() and ApiResponse.error() matching
exactly how your routes call them, e.g.:
    body, status = ApiResponse.error(message=..., details=..., status=...)
    body, status = ApiResponse.success(data=..., message=..., status=...)
"""


class ApiResponse:

    @staticmethod
    def success(data=None, message="Success", status=200):
        return {
            "success": True,
            "message": message,
            "data":    data,
        }, status

    @staticmethod
    def error(message="Something went wrong", details=None, status=400):
        body = {
            "success": False,
            "error":   message,
        }
        if details:
            body["details"] = details
        return body, status