"""
Custom DRF exception handler for consistent, structured API error responses.

Replaces default DRF exception handler to:
1. Return a consistent JSON error envelope ({status, message, errors, code})
2. Log all 4xx/5xx errors with structured logging
3. Handle Django ValidationError alongside DRF exceptions
4. Never leak internal details in production
"""
import logging
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Enhanced exception handler that wraps all errors in a consistent envelope.
    """
    # Convert Django ValidationError to DRF format
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, 'message_dict'):
            data = {
                "status": "error",
                "message": "Validation failed",
                "errors": exc.message_dict,
                "code": "validation_error",
            }
        else:
            data = {
                "status": "error",
                "message": str(exc.message) if hasattr(exc, 'message') else str(exc),
                "code": "validation_error",
            }
        return Response(data, status=status.HTTP_400_BAD_REQUEST)

    # Call DRF's default handler first
    response = drf_exception_handler(exc, context)

    if response is not None:
        # Structured envelope for DRF-handled exceptions
        view = context.get('view', None)
        view_name = view.__class__.__name__ if view else 'Unknown'

        # Extract error details
        if isinstance(response.data, dict):
            detail = response.data.get('detail', None)
            if detail:
                message = str(detail)
                errors = None
            else:
                message = "Request failed"
                errors = response.data
        elif isinstance(response.data, list):
            message = response.data[0] if response.data else "Request failed"
            errors = response.data
        else:
            message = str(response.data)
            errors = None

        error_code = getattr(exc, 'default_code', 'error')

        response.data = {
            "status": "error",
            "message": message,
            "code": error_code,
        }
        if errors:
            response.data["errors"] = errors

        # Log 4xx as warnings, 5xx as errors
        if response.status_code >= 500:
            logger.error(
                "api_error",
                extra={
                    "status_code": response.status_code,
                    "view": view_name,
                    "error": message,
                }
            )
        elif response.status_code >= 400:
            logger.warning(
                "api_client_error",
                extra={
                    "status_code": response.status_code,
                    "view": view_name,
                    "error": message,
                }
            )

        return response

    # Unhandled exception — return 500 with safe message
    logger.exception("Unhandled exception in API view", exc_info=exc)
    return Response(
        {
            "status": "error",
            "message": "An unexpected error occurred. Please try again later.",
            "code": "internal_error",
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
