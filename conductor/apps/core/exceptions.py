from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import APIException
import logging

logger = logging.getLogger(__name__)


class PaymentRequiredException(APIException):
    """402 Payment Required - for premium content."""
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Payment required to access this content."
    default_code = "payment_required"


class AppError(APIException):
    """400 Bad Request - general application errors."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "An application error occurred."
    default_code = "app_error"


def custom_exception_handler(exc, context):
    """
    Standardize all exception responses to:
    {
        "status": "error",
        "message": "Human readable error",
        "code": "ERROR_CODE",
        "details": { ... }
    }
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    # Dictionary mapping standard DRF codes to human readable messages roughly
    # This can be expanded
    
    if response is not None:
        custom_data = {
            "status": "error",
            "message": "An error occurred",
            "code": "API_ERROR"
        }
        
        # Check for specific DRF errors
        from rest_framework.exceptions import ValidationError, PermissionDenied, NotAuthenticated
        
        if isinstance(exc, ValidationError):
             custom_data["message"] = "Validation failed"
             custom_data["details"] = exc.detail
             custom_data["code"] = "VALIDATION_ERROR"
        elif isinstance(exc, PermissionDenied):
             custom_data["message"] = "You do not have permission to perform this action."
             custom_data["code"] = "FORBIDDEN"
        elif isinstance(exc, NotAuthenticated):
             custom_data["message"] = "Authentication credentials were not provided."
             custom_data["code"] = "UNAUTHORIZED"
        elif hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                custom_data["message"] = "Validation failed"
                custom_data["details"] = exc.detail
                custom_data["code"] = "VALIDATION_ERROR"
            elif isinstance(exc.detail, list):
                custom_data["message"] = exc.detail[0]
                custom_data["code"] = "VALIDATION_ERROR"
            else:
                 custom_data["message"] = str(exc.detail)
        
        # Use simple mapping for standard codes
        if response.status_code == 401:
            custom_data["code"] = "UNAUTHORIZED"
        elif response.status_code == 403:
             custom_data["code"] = "FORBIDDEN"
        elif response.status_code == 404:
             custom_data["code"] = "NOT_FOUND"

        response.data = custom_data

    else:
        # Handle 500s or standard Pythons errors via generic catch-all if middleware allows
        # But DRF exception handler acts only on DRF known exceptions usually.
        # For full 500 catching, we'd need middleware. This is good for API level.
        pass

    return response
