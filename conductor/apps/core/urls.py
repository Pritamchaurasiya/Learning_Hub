
from django.urls import path
from .views import (
    GlobalSearchView,
    AnalyticsDashboardView,
    UserAnalyticsView,
    RateLimitStatsView,
    AuditLogView,
    ErrorStatsView,
    CacheStatsView,
    SystemStatusView,
    ClientErrorLogView,
)
from .admin_api import (
    admin_user_list,
    admin_user_bulk_action,
    admin_pending_courses,
    admin_approve_course,
    admin_system_logs,
    admin_system_health,
)
from .health_checks import (
    health_check,
    health_check_detailed,
    health_check_db,
    health_check_cache,
    system_metrics,
)

urlpatterns = [
    # Health Check Endpoints
    path('health/', health_check, name='health_check'),
    path('health/detailed/', health_check_detailed, name='health_check_detailed'),
    path('health/db/', health_check_db, name='health_check_db'),
    path('health/cache/', health_check_cache, name='health_check_cache'),
    path('health/metrics/', system_metrics, name='system_metrics'),

    # Core APIs
    path('client-errors/', ClientErrorLogView.as_view(), name='client_error_log'),
    path('search/', GlobalSearchView.as_view(), name='global_search'),

    # Admin Dashboard APIs
    path('admin/analytics/', AnalyticsDashboardView.as_view(), name='admin_analytics'),
    path('admin/rate-limits/', RateLimitStatsView.as_view(), name='admin_rate_limits'),
    path('admin/audit/', AuditLogView.as_view(), name='admin_audit'),
    path('admin/errors/', ErrorStatsView.as_view(), name='admin_errors'),
    path('admin/cache/', CacheStatsView.as_view(), name='admin_cache'),
    path('admin/system-status/', SystemStatusView.as_view(), name='admin_system_status'),

    # Admin Management APIs
    path('admin/users/', admin_user_list, name='admin_users'),
    path('admin/users/bulk-action/', admin_user_bulk_action, name='admin_user_bulk'),
    path('admin/courses/pending/', admin_pending_courses, name='admin_pending_courses'),
    path('admin/courses/<uuid:course_id>/approve/', admin_approve_course, name='admin_approve_course'),
    path('admin/system-logs/', admin_system_logs, name='admin_system_logs'),
    path('admin/health/', admin_system_health, name='admin_health'),

    # User-facing analytics
    path('my-analytics/', UserAnalyticsView.as_view(), name='user_analytics'),
]

