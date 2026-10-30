"""
N+1 Query Detection Middleware

Development-only middleware that detects N+1 query patterns in Django ORM.
Helps identify performance issues early in development.
"""

import logging
import threading
from django.db import connection
from django.conf import settings

logger = logging.getLogger(__name__)


class NPlusOneDetectionMiddleware:
    """
    Middleware to detect N+1 query patterns during development.

    Usage:
    1. Add to MIDDLEWARE in settings.py (only for DEBUG=True)
    2. Set NPLUSONE_RAISE = True to raise exceptions on N+1 detection
    3. Set NPLUSONE_LOG_LEVEL = 'WARNING' to log warnings
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self._enabled = getattr(settings, 'NPLUSONE_DETECTION_ENABLED', False)
        self._raise = getattr(settings, 'NPLUSONE_RAISE', False)
        self._log_level = getattr(settings, 'NPLUSONE_LOG_LEVEL', 'WARNING')
        self._whitelist = getattr(settings, 'NPLUSONE_WHITELIST', [])
        self._threshold = getattr(settings, 'NPLUSONE_THRESHOLD', 10)

    def __call__(self, request):
        if not self._enabled or not settings.DEBUG:
            return self.get_response(request)

        # Track queries before request
        initial_queries = len(connection.queries)

        response = self.get_response(request)

        # Track queries after request
        final_queries = len(connection.queries)
        query_count = final_queries - initial_queries

        if query_count > self._threshold:
            self._analyze_queries(connection.queries[initial_queries:])

        return response

    def _analyze_queries(self, queries):
        """Analyze queries for N+1 patterns."""
        # Group by SQL pattern (normalized)
        from collections import defaultdict
        query_groups = defaultdict(list)

        for query in queries:
            sql = query.get('sql', '')
            # Normalize: remove specific values, keep structure
            normalized = self._normalize_sql(sql)
            query_groups[normalized].append(sql)

        # Find groups with many similar queries (potential N+1)
        for pattern, instances in query_groups.items():
            if len(instances) > 3:  # More than 3 similar queries
                # Check if it's whitelisted
                if self._is_whitelisted(pattern):
                    continue

                message = (
                    f"Potential N+1 query detected: {len(instances)} similar queries "
                    f"matching pattern:\n{pattern}"
                )

                if self._raise:
                    from django.core.exceptions import ImproperlyConfigured
                    raise ImproperlyConfigured(message)

                log_func = getattr(logger, self._log_level.lower(), logger.warning)
                log_func(message)

    def _normalize_sql(self, sql: str) -> str:
        """Normalize SQL by replacing values with placeholders."""
        import re

        # Replace string literals
        sql = re.sub(r"'[^']*'", "'?'", sql)
        # Replace numbers
        sql = re.sub(r'\b\d+\b', '?', sql)
        # Replace IN clauses
        sql = re.sub(r'IN \([^)]+\)', 'IN (?,...)', sql)
        # Normalize whitespace
        sql = re.sub(r'\s+', ' ', sql).strip()

        return sql

    def _is_whitelisted(self, pattern: str) -> bool:
        """Check if query pattern is whitelisted."""
        for whitelist_pattern in self._whitelist:
            if whitelist_pattern in pattern:
                return True
        return False


# Query counting context manager for tests
class CaptureQueriesContext:
    """Context manager to capture queries in tests."""

    def __init__(self, connection):
        self.connection = connection
        self.initial_queries = []
        self.captured_queries = []

    def __enter__(self):
        self.initial_queries = len(self.connection.queries)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.captured_queries = self.connection.queries[self.initial_queries:]

    @property
    def count(self):
        return len(self.captured_queries)

    def assert_max_queries(self, max_queries: int, message: str = None):
        """Assert that no more than max_queries were executed."""
        if self.count > max_queries:
            msg = message or f"Expected at most {max_queries} queries, got {self.count}"
            raise AssertionError(msg)