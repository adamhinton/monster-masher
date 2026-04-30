"""
Custom DRF exception handler for Monster Masher.

All API error responses are normalized to a consistent shape:

    {"error": {"code": "string_code", "message": "Human-readable message", "details": {}}}

This handler wraps DRF's default handler. If the default handler cannot handle the
exception (i.e. it returns None — a true unhandled 500), this handler also returns
None so Django and Sentry can capture the real crash without interference.
"""

from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def _code_for_exception(exc) -> str:
    if isinstance(exc, drf_exceptions.NotFound):
        return "not_found"
    if isinstance(exc, drf_exceptions.MethodNotAllowed):
        return "method_not_allowed"
    if isinstance(exc, drf_exceptions.PermissionDenied):
        return "permission_denied"
    if isinstance(exc, drf_exceptions.ValidationError):
        return "validation_error"
    if isinstance(exc, drf_exceptions.NotAuthenticated):
        return "not_authenticated"
    return "error"


def custom_exception_handler(exc, context) -> Response | None:
    response = drf_exception_handler(exc, context)

    if response is None:
        # Unhandled exception — let Django/Sentry capture the real crash.
        return None

    code = _code_for_exception(exc)
    message = str(exc.detail) if hasattr(exc, "detail") else str(exc)

    details: dict = {}
    if isinstance(exc, drf_exceptions.ValidationError) and isinstance(exc.detail, dict):
        details = exc.detail

    response.data = {
        "error": {
            "code": code,
            "message": message,
            "details": details,
        }
    }
    return response
