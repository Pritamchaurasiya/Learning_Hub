from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NeuroTelemetryViewSet

router = DefaultRouter()
router.register(r'telemetry', NeuroTelemetryViewSet, basename='bci-telemetry')

app_name = 'neuro'

urlpatterns = [
    path('', include(router.urls)),
]
