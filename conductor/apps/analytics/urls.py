"""
Analytics API endpoints for reporting and statistics.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard analytics
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),
    path('courses/', views.course_analytics, name='course-analytics'),
    path('users/', views.user_analytics, name='user-analytics'),
    path('revenue/', views.revenue_analytics, name='revenue-analytics'),
    path('engagement/', views.engagement_analytics, name='engagement-analytics'),
    
    # Reports
    path('reports/generate/', views.generate_report, name='generate-report'),
    path('reports/<str:report_id>/download/', views.download_report, name='download-report'),
]
