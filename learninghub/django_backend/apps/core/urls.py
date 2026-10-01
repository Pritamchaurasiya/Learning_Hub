from django.urls import path
from .views import (
    HealthCheckView, HealthReadyView, HealthLiveView, SystemMetricsView, CsrfTokenView,
    DashboardAnalyticsView, UserAnalyticsView
)

urlpatterns = [
    path('health', HealthCheckView.as_view(), name='health-check'),
    path('health/', HealthCheckView.as_view(), name='health-check-slash'),
    path('health/ready', HealthReadyView.as_view(), name='health-ready'),
    path('health/live', HealthLiveView.as_view(), name='health-live'),
    path('metrics', SystemMetricsView.as_view(), name='system-metrics'),
    path('metrics/', SystemMetricsView.as_view(), name='system-metrics-slash'),
    path('csrf-token', CsrfTokenView.as_view(), name='csrf-token'),
    path('csrf-token/', CsrfTokenView.as_view(), name='csrf-token-slash'),
    path('analytics/dashboard', DashboardAnalyticsView.as_view(), name='analytics-dashboard'),
    path('analytics/dashboard/', DashboardAnalyticsView.as_view(), name='analytics-dashboard-slash'),
    path('user-analytics/me', UserAnalyticsView.as_view(), name='user-analytics-me'),
    path('user-analytics/me/', UserAnalyticsView.as_view(), name='user-analytics-me-slash'),
    path('admin/dashboard', DashboardAnalyticsView.as_view(), name='admin-dashboard-alias'),
    path('admin/dashboard/', DashboardAnalyticsView.as_view(), name='admin-dashboard-alias-slash'),
]


