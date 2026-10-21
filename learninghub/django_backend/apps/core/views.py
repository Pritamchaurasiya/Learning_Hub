from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .responses import success_response
from .permissions import IsAdminUserRole
import sys
import platform

class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return success_response(
            data={
                'status': 'healthy',
                'service': 'learninghub-django-api',
                'timestamp': timezone.now().isoformat(),
                'version': '1.0.0',
                'python_version': sys.version.split()[0],
                'platform': platform.system(),
            },
            message='LearningHub Django API is operational'
        )

class HealthReadyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db import connection
        db_healthy = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            db_healthy = False

        return success_response(
            data={
                'ready': db_healthy,
                'database': 'connected' if db_healthy else 'disconnected',
            },
            message='Readiness probe check successful'
        )

class HealthLiveView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return success_response(
            data={'alive': True},
            message='Liveness probe check successful'
        )

class SystemMetricsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        import psutil
        import os
        from django.db import connection

        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()

        db_queries_count = len(connection.queries) if hasattr(connection, 'queries') else 0

        metrics = {
            'service': 'learninghub-django-asgi',
            'uptime_seconds': round(process.create_time()),
            'cpu_percent': process.cpu_percent(interval=None),
            'memory_rss_mb': round(mem_info.rss / (1024 * 1024), 2),
            'threads_count': process.num_threads(),
            'db_connection': connection.vendor,
            'db_queries_executed': db_queries_count,
            'timestamp': timezone.now().isoformat()
        }

        return success_response(data=metrics, message='System telemetry metrics retrieved successfully')

class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.middleware.csrf import get_token
        token = get_token(request)
        session_id = request.session.session_key or ""
        response = success_response(data={
            'csrfToken': token,
            'sessionId': session_id
        }, message='CSRF token generated')
        response.set_cookie('csrf-token', token, samesite='Lax')
        return response

class DashboardAnalyticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .learner_analytics import LearnerAnalyticsService
        user = request.user if (request.user and request.user.is_authenticated) else None
        data = LearnerAnalyticsService.get_dashboard_stats(user)
        return success_response(data=data)


class LearningActivityAnalyticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .learner_analytics import LearnerAnalyticsService
        try:
            days = int(request.query_params.get('days', 30))
        except (ValueError, TypeError):
            days = 30
        user = request.user if (request.user and request.user.is_authenticated) else None
        activity = LearnerAnalyticsService.get_learning_activity(user, days=days)
        return success_response(data=activity, meta={'days': len(activity)})


class PerformanceTrendAnalyticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .learner_analytics import LearnerAnalyticsService
        try:
            days = int(request.query_params.get('days', 30))
        except (ValueError, TypeError):
            days = 30
        user = request.user if (request.user and request.user.is_authenticated) else None
        trend = LearnerAnalyticsService.get_performance_trend(user, days=days)
        return success_response(data=trend, meta={'days': len(trend)})


class WeakAreasAnalyticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .learner_analytics import LearnerAnalyticsService
        user = request.user if (request.user and request.user.is_authenticated) else None
        weak_areas = LearnerAnalyticsService.get_weak_areas(user)
        return success_response(data={'weak_areas': weak_areas}, meta={'count': len(weak_areas)})


class UserAnalyticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .learner_analytics import LearnerAnalyticsService
        user = request.user if (request.user and request.user.is_authenticated) else None
        data = LearnerAnalyticsService.get_user_comprehensive_analytics(user)
        return success_response(data=data)


class NextBestActionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .learner_analytics import LearnerAnalyticsService
        user = request.user if (request.user and request.user.is_authenticated) else None
        data = LearnerAnalyticsService.get_next_best_action(user)
        return success_response(data=data)



