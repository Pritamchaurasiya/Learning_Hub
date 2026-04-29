"""
Monitoring URLs Configuration
"""

from django.urls import path
from . import views

urlpatterns = [
    path('', views.monitoring_dashboard, name='monitoring_dashboard'),
    path('api/metrics/', views.api_health_metrics, name='api_metrics'),
    path('api/processes/', views.api_processes, name='api_processes'),
    path('api/database/', views.api_database_status, name='api_database'),
    path('api/cache/', views.api_cache_status, name='api_cache'),
    path('api/disk-io/', views.api_disk_io, name='api_disk_io'),
]
