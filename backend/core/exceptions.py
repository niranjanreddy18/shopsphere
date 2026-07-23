"""
Centralised exception handling.

Design decision:
    DRF's default exception handler returns inconsistent response shapes
    (sometimes a list, sometimes a dict, sometimes a bare string). Frontend
    code becomes fragile trying to branch on all these shapes. We normalise
    every error response into a single predictable envelope:

        {
            "success": false,
            "message": "Human readable summary",
            "errors": { "field": ["error 1", "error 2"], ... } | null
        }
"""

import logging

from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("apps")


class ApplicationError(Exception):
    """
    Base exception for predictable, business-logic-level errors raised from
    the service layer (e.g. "cannot reset password: token expired").

    Views/services raise this instead of generic Exception so the global
    handler can translate it into a clean 400-level API response instead of
    a 500 Internal Server Error.
    """

    def __init__(self, message: str, code: str = "application_error", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default exception handler to normalise the response body.

    Any exception that reaches here and is NOT handled by DRF's default
    handler (e.g. an uncaught ValueError) is deliberately left to bubble up
    as a 500 in development so it is loud and visible; in production, Django
    logs it via the LOGGING config.
    """
    if isinstance(exc, ApplicationError):
        logger.warning("ApplicationError: %s", exc.message)
        from rest_framework.response import Response

        return Response(
            {"success": False, "message": exc.message, "errors": None},
            status=exc.status_code,
        )

    response = drf_exception_handler(exc, context)

    if response is not None:
        # Normalise DRF's validation error shape into our standard envelope.
        errors = response.data if isinstance(response.data, dict) else {"detail": response.data}
        message = "Validation failed" if response.status_code == 400 else "Request failed"

        response.data = {
            "success": False,
            "message": message,
            "errors": errors,
        }

    return response
