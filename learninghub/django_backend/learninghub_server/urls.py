from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

api_v1_patterns = [
    path('', include('apps.core.urls')),
    path('', include('apps.users.urls')),
    path('', include('apps.courses.urls')),
    path('', include('apps.problems.urls')),
    path('', include('apps.tests_engine.urls')),
    path('', include('apps.gamification.urls')),
    path('', include('apps.social.urls')),
    path('', include('apps.ecommerce.urls')),
    path('', include('apps.ai_tutor.urls')),
    path('ebooks/', include('apps.ebooks.urls')),
    path('updates/', include('apps.updates.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),

    # OpenAPI Schema & Swagger Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API v1 Versioned Routes
    path('api/v1/', include(api_v1_patterns)),

    # Legacy / direct /api/ path fallbacks for frontend
    path('api/', include(api_v1_patterns)),
]
