"""
Custom exception handling for Learning Hub API.
"""

from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException as DRFAPIException


def custom_exception_handler(
    exc: Exception, context: dict[str, Any]
) -> Response | None:
    """
    Custom exception handler that returns consistent API responses.

    Response format:
    {
        "status": "error",
        "message": "Error description",
        "errors": {...} or null
    }
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Extract error details
        error_message = "An error occurred"
        errors = None

        if isinstance(response.data, dict):
            # Handle DRF validation errors
            if "detail" in response.data:
                error_message = str(response.data["detail"])
            elif "non_field_errors" in response.data:
                error_message = response.data["non_field_errors"][0]
                errors = response.data
            else:
                error_message = "Validation error"
                errors = response.data
        elif isinstance(response.data, list):
            error_message = response.data[0] if response.data else "An error occurred"

        # Build consistent response
        response.data = {
            "status": "error",
            "message": error_message,
            "errors": errors,
        }

    return response


class APIException(DRFAPIException):
    """Base exception for API errors."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = "An unexpected error occurred"
    default_code = "error"

    def __init__(self, detail: str | None = None, code: int | None = None):
        super().__init__(detail, code)
        self.message = detail or self.default_detail


class BadRequestException(APIException):
    """400 Bad Request."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Bad request"


class UnauthorizedException(APIException):
    """401 Unauthorized."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Authentication required"


class ForbiddenException(APIException):
    """403 Forbidden."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Permission denied"


class NotFoundException(APIException):
    """404 Not Found."""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Resource not found"


class ConflictException(APIException):
    """409 Conflict."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Resource conflict"


class PaymentRequiredException(APIException):
    """402 Payment Required."""

    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Payment required"


# Alias for backward compatibility
AppError = BadRequestException
