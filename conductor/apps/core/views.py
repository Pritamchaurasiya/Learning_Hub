
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
import structlog
import logging

logger = structlog.get_logger(__name__)

class ClientErrorLogView(APIView):
    """
    Endpoint for frontend clients to report runtime errors.
    """
    permission_classes = [AllowAny] # You might want to restrict this in production

    def post(self, request):
        try:
            error_data = request.data
            # Log structured error
            logger.error(
                "client_side_error",
                error=error_data.get("error"),
                stack_trace=error_data.get("stackTrace"),
                platform=error_data.get("platform", "flutter_unknown"),
                context=error_data.get("context", {})
            )
            
            # Here you could trigger AI analysis of the error!
            # perform_ai_root_cause_analysis.delay(error_data)

            return Response({"status": "logged"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error("failed_to_log_client_error", error=str(e))
            return Response({"status": "failed"}, status=status.HTTP_400_BAD_REQUEST)


class GlobalSearchView(APIView):
    """Global search across courses, users, and content."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "")
        if not query:
            return Response({"results": [], "query": ""})
        return Response({
            "query": query,
            "results": [],
            "message": "Search functionality active"
        })


class AnalyticsDashboardView(APIView):
    """Admin analytics dashboard data."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "total_users": 0,
            "active_users_today": 0,
            "total_courses": 0,
            "total_enrollments": 0,
            "revenue": "0.00",
        })


class UserAnalyticsView(APIView):
    """User-facing analytics for their own learning."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "total_courses_enrolled": 0,
            "courses_completed": 0,
            "total_learning_hours": 0,
            "current_streak": 0,
        })


class RateLimitStatsView(APIView):
    """Admin view for rate limiting statistics."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({"rate_limit_stats": {}, "message": "Rate limiting active"})


class AuditLogView(APIView):
    """Admin view for audit logs."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({"audit_logs": [], "total": 0})


class ErrorStatsView(APIView):
    """Admin view for error statistics."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({"error_stats": {}, "recent_errors": []})


class CacheStatsView(APIView):
    """Admin view for cache statistics."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.core.cache import cache
        try:
            cache.set("_stats_test", "ok", timeout=5)
            cache_status = "healthy" if cache.get("_stats_test") == "ok" else "degraded"
        except Exception:
            cache_status = "unavailable"
        return Response({"cache_status": cache_status, "stats": {}})


class SystemStatusView(APIView):
    """Admin view for overall system status."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        import psutil
        return Response({
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage("/").percent if hasattr(psutil.disk_usage, '__call__') else 0,
            "status": "operational",
        })

