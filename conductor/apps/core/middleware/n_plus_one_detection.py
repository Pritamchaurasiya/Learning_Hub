"""
N+1 Query Detection Middleware
Development-only middleware to detect and log N+1 query patterns.
"""

import logging
import threading
from django.db import connection
from django.conf import settings

logger = logging.getLogger(__name__)

# Thread-local storage for query tracking
_query_tracker = threading.local()


class NPlusOneDetectionMiddleware:
    """
    Middleware to detect N+1 query patterns in development.

    Usage:
    1. Add to MIDDLEWARE in settings.development (after Django's middleware)
    2. Set NPLUS_ONE_DETECTION_ENABLED = True in development settings
    3. Check logs for N+1 warnings
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, "NPLUS_ONE_DETECTION_ENABLED", False)
        self.threshold = getattr(settings, "NPLUS_ONE_THRESHOLD", 10)
        self.ignored_paths = getattr(
            settings,
            "NPLUS_ONE_IGNORED_PATHS",
            [
                "/health/",
                "/admin/",
                "/static/",
                "/media/",
                "/api/schema/",
                "/api/docs/",
            ],
        )

    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)

        # Skip ignored paths
        if any(request.path.startswith(path) for path in self.ignored_paths):
            return self.get_response(request)

        # Reset query tracking for this request
        _query_tracker.queries = []
        _query_tracker.models = {}

        # Monkey-patch cursor.execute to track queries
        original_execute = connection.cursor().execute

        def tracking_execute(sql, params=None):
            _query_tracker.queries.append(sql)
            # Simple model detection from SQL
            self._track_model_access(sql)
            return original_execute(sql, params)

        connection.cursor().execute = tracking_execute

        try:
            response = self.get_response(request)
        finally:
            # Restore original execute
            connection.cursor().execute = original_execute

            # Analyze queries for N+1 patterns
            self._analyze_queries(request)

        return response

    def _track_model_access(self, sql):
        """Track which models are being queried."""
        sql_lower = sql.lower()
        # Simple heuristic: detect SELECT from table patterns
        if "select" in sql_lower and "from" in sql_lower:
            # Extract table name (simplified)
            try:
                from_part = sql_lower.split("from")[1].split()[0].strip('"`')
                if from_part not in _query_tracker.models:
                    _query_tracker.models[from_part] = 0
                _query_tracker.models[from_part] += 1
            except (IndexError, AttributeError):
                pass

    def _analyze_queries(self, request):
        """Analyze queries for N+1 patterns."""
        if not hasattr(_query_tracker, "models"):
            return

        for model, count in _query_tracker.models.items():
            if count >= self.threshold:
                logger.warning(
                    f"N+1 QUERY DETECTED: {model} queried {count} times "
                    f"in {request.method} {request.path} "
                    f"(threshold: {self.threshold})"
                )

                # Log sample queries for debugging
                model_queries = [
                    q for q in _query_tracker.queries if model in q.lower()
                ][:5]
                for i, query in enumerate(model_queries):
                    logger.debug(f"  Query {i+1}: {query[:200]}...")


class QueryCountMiddleware:
    """
    Simpler middleware that just logs total query count per request.
    Less invasive, good for production monitoring.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, "QUERY_COUNT_LOGGING", False)
        self.slow_threshold = getattr(settings, "SLOW_QUERY_THRESHOLD_MS", 1000)

    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)

        # Reset queries
        if hasattr(connection, "queries"):
            initial_count = len(connection.queries)
        else:
            initial_count = 0

        import time

        start_time = time.time()

        response = self.get_response(request)

        duration_ms = (time.time() - start_time) * 1000
        query_count = (
            len(connection.queries) - initial_count
            if hasattr(connection, "queries")
            else 0
        )

        # Log if slow or too many queries
        if duration_ms > self.slow_threshold or query_count > 50:
            logger.warning(
                f"SLOW/HIGH-QUERY REQUEST: {request.method} {request.path} "
                f"queries={query_count} duration={duration_ms:.1f}ms"
            )

        # Add headers for debugging
        response["X-Query-Count"] = str(query_count)
        response["X-Query-Duration-MS"] = f"{duration_ms:.1f}"

        return response


# Utility functions for manual N+1 detection in tests/views


def assert_num_queries(expected, func, *args, **kwargs):
    """
    Assert that a function executes exactly the expected number of queries.

    Usage:
        assert_num_queries(3, lambda: list(MyModel.objects.all()))
    """
    from django.test.utils import CaptureQueriesContext
    from django.db import connection

    with CaptureQueriesContext(connection) as context:
        result = func(*args, **kwargs)

    actual = len(context.captured_queries)
    if actual != expected:
        raise AssertionError(
            f"Expected {expected} queries, got {actual}. "
            f"Queries: {[q['sql'] for q in context.captured_queries]}"
        )
    return result


def get_query_count(func, *args, **kwargs):
    """Get the number of queries executed by a function."""
    from django.test.utils import CaptureQueriesContext
    from django.db import connection

    with CaptureQueriesContext(connection) as context:
        result = func(*args, **kwargs)

    return len(context.captured_queries), result


def print_queries(func, *args, **kwargs):
    """Execute function and print all queries for debugging."""
    from django.test.utils import CaptureQueriesContext
    from django.db import connection

    with CaptureQueriesContext(connection) as context:
        result = func(*args, **kwargs)

    print(f"\n=== Queries executed ({len(context.captured_queries)}) ===")
    for i, query in enumerate(context.captured_queries):
        print(f"{i+1}. [{query['time']}s] {query['sql']}")
    print("=== End Queries ===\n")
    return result
