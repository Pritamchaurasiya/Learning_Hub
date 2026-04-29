"""
Custom pagination classes for Learning Hub API.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination with customizable page size.

    Query parameters:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        """Return paginated response with metadata."""
        return Response(
            {
                "status": "success",
                "message": "Data retrieved successfully",
                "data": data,
                "meta": {
                    "page": self.page.number,
                    "page_size": self.page.paginator.per_page,
                    "total_pages": self.page.paginator.num_pages,
                    "total_count": self.page.paginator.count,
                    "has_next": self.page.has_next(),
                    "has_previous": self.page.has_previous(),
                },
            }
        )


class SmallResultsSetPagination(PageNumberPagination):
    """Small pagination for limited results (e.g., notifications)."""

    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class LargeResultsSetPagination(PageNumberPagination):
    """Large pagination for bulk operations."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200
