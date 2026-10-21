from django.urls import path
from .views import (
    HealthCheckView, HealthReadyView, HealthLiveView, SystemMetricsView, CsrfTokenView,
    DashboardAnalyticsView, UserAnalyticsView, LearningActivityAnalyticsView,
    PerformanceTrendAnalyticsView, WeakAreasAnalyticsView, NextBestActionView
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
    path('analytics/learning-activity', LearningActivityAnalyticsView.as_view(), name='analytics-learning-activity'),
    path('analytics/learning-activity/', LearningActivityAnalyticsView.as_view(), name='analytics-learning-activity-slash'),
    path('analytics/performance-trend', PerformanceTrendAnalyticsView.as_view(), name='analytics-performance-trend'),
    path('analytics/performance-trend/', PerformanceTrendAnalyticsView.as_view(), name='analytics-performance-trend-slash'),
    path('analytics/weak-areas', WeakAreasAnalyticsView.as_view(), name='analytics-weak-areas'),
    path('analytics/weak-areas/', WeakAreasAnalyticsView.as_view(), name='analytics-weak-areas-slash'),
    path('user-analytics/me', UserAnalyticsView.as_view(), name='user-analytics-me'),
    path('user-analytics/me/', UserAnalyticsView.as_view(), name='user-analytics-me-slash'),
    path('admin/dashboard', DashboardAnalyticsView.as_view(), name='admin-dashboard-alias'),
    path('admin/dashboard/', DashboardAnalyticsView.as_view(), name='admin-dashboard-alias-slash'),


    path('analytics/next-best-action', NextBestActionView.as_view(), name='analytics-next-best-action'),
    path('analytics/next-best-action/', NextBestActionView.as_view(), name='analytics-next-best-action-slash'),
]


