"""
Comprehensive utilities for API views with error handling, logging, and response formatting.
"""

import logging
from functools import wraps
from typing import Any, Dict, Optional

from django.core.exceptions import ValidationError, ObjectDoesNotExist, PermissionDenied
from django.db import IntegrityError, DatabaseError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied as DRFPermissionDenied,
    Throttled,
    ValidationError as DRFValidationError,
)

logger = logging.getLogger(__name__)


class APIResponse:
    """Standardized API response formatter."""

    @staticmethod
    def success(
        data: Any = None,
        message: str = "Success",
        status_code: int = status.HTTP_200_OK,
        **kwargs,
    ) -> Response:
        """
        Format successful API response.

        Args:
            data: Response data
            message: Success message
            status_code: HTTP status code
            **kwargs: Additional response fields

        Returns:
            Response: Formatted DRF Response
        """
        response_data = {
            "status": "success",
            "message": message,
        }

        if data is not None:
            response_data["data"] = data

        response_data.update(kwargs)

        return Response(response_data, status=status_code)

    @staticmethod
    def error(
        message: str,
        errors: Optional[Dict] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        **kwargs,
    ) -> Response:
        """
        Format error API response.

        Args:
            message: Error message
            errors: Detailed error information
            status_code: HTTP status code
            **kwargs: Additional response fields

        Returns:
            Response: Formatted DRF Response
        """
        response_data = {
            "status": "error",
            "message": message,
        }

        if errors:
            response_data["errors"] = errors

        response_data.update(kwargs)

        return Response(response_data, status=status_code)

    @staticmethod
    def paginated(
        data: list, page: int, total: int, page_size: int, message: str = "Success"
    ) -> Response:
        """
        Format paginated API response.

        Args:
            data: List of items
            page: Current page number
            total: Total number of items
            page_size: Items per page
            message: Success message

        Returns:
            Response: Formatted paginated response
        """
        total_pages = (total + page_size - 1) // page_size

        return Response(
            {
                "status": "success",
                "message": message,
                "data": {
                    "results": data,
                    "pagination": {
                        "page": page,
                        "page_size": page_size,
                        "total": total,
                        "total_pages": total_pages,
                        "has_next": page < total_pages,
                        "has_previous": page > 1,
                    },
                },
            },
            status=status.HTTP_200_OK,
        )


def handle_api_exceptions(func):
    """
    Decorator for comprehensive exception handling in API views.

    Catches common exceptions and returns properly formatted error responses.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)

        except NotFound as e:
            logger.warning(f"Not found: {str(e)}")
            return APIResponse.error(
                message=str(e) or "Resource not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        except (PermissionDenied, DRFPermissionDenied) as e:
            logger.warning(f"Permission denied: {str(e)}")
            return APIResponse.error(
                message=str(e) or "You don't have permission to perform this action",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        except (ValidationError, DRFValidationError) as e:
            logger.info(f"Validation error: {str(e)}")
            errors = e.detail if hasattr(e, "detail") else str(e)
            return APIResponse.error(
                message="Validation failed",
                errors=errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        except IntegrityError as e:
            logger.error(f"Database integrity error: {str(e)}", exc_info=True)
            return APIResponse.error(
                message="Database integrity error. The operation cannot be completed.",
                status_code=status.HTTP_409_CONFLICT,
            )

        except DatabaseError as e:
            logger.error(f"Database error: {str(e)}", exc_info=True)
            return APIResponse.error(
                message="A database error occurred. Please try again.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        except Throttled as e:
            logger.warning(f"Rate limit exceeded: {str(e)}")
            wait_time = e.wait if hasattr(e, "wait") else None
            return APIResponse.error(
                message="Rate limit exceeded. Please try again later.",
                wait_seconds=wait_time,
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        except ObjectDoesNotExist as e:
            logger.warning(f"Object not found: {str(e)}")
            return APIResponse.error(
                message="The requested resource does not exist",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            return APIResponse.error(
                message="An unexpected error occurred. Please try again.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return wrapper


def log_api_call(func):
    """
    Decorator to log API calls with request details.
    """

    @wraps(func)
    def wrapper(self, request, *args, **kwargs):
        view_name = self.__class__.__name__
        action = getattr(self, "action", "unknown")
        user = getattr(request, "user", None)
        user_id = user.id if user and user.is_authenticated else "anonymous"

        logger.info(
            f"API Call: {view_name}.{action} | "
            f"User: {user_id} | "
            f"Method: {request.method} | "
            f"Path: {request.path}"
        )

        try:
            response = func(self, request, *args, **kwargs)
            logger.info(
                f"API Response: {view_name}.{action} | "
                f"Status: {response.status_code}"
            )
            return response
        except Exception as e:
            logger.error(
                f"API Error: {view_name}.{action} | " f"Error: {str(e)}", exc_info=True
            )
            raise

    return wrapper


class QueryOptimizationMixin:
    """
    Mixin to add query optimization helpers to ViewSets.
    """

    def get_optimized_queryset(
        self, queryset, select_related_fields=None, prefetch_related_fields=None
    ):
        """
        Apply select_related and prefetch_related to optimize queries.

        Args:
            queryset: Base queryset
            select_related_fields: List of fields for select_related
            prefetch_related_fields: List of fields for prefetch_related

        Returns:
            Optimized queryset
        """
        if select_related_fields:
            queryset = queryset.select_related(*select_related_fields)

        if prefetch_related_fields:
            queryset = queryset.prefetch_related(*prefetch_related_fields)

        return queryset

    def apply_common_filters(self, queryset):
        """
        Apply common filtering logic (e.g., is_active, is_published).
        Override this method in your viewset.
        """
        return queryset


def validate_request_data(required_fields: list):
    """
    Decorator to validate required fields in request data.

    Args:
        required_fields: List of required field names
    """

    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            missing_fields = [
                field for field in required_fields if field not in request.data
            ]

            if missing_fields:
                return APIResponse.error(
                    message="Missing required fields",
                    errors={"missing_fields": missing_fields},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            return func(self, request, *args, **kwargs)

        return wrapper

    return decorator


# Example usage in views:
"""
from apps.core.view_utils import handle_api_exceptions, APIResponse, log_api_call

class MyViewSet(viewsets.ModelViewSet):
    
    @handle_api_exceptions
    @log_api_call
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(data=serializer.data)
    
    @handle_api_exceptions
    @action(detail=True, methods=['post'])
    def custom_action(self, request, pk=None):
        instance = self.get_object()
        # ... your logic ...
        return APIResponse.success(
            data={"id": instance.id},
            message="Action completed successfully"
        )
"""
