"""
URL configuration for Learning Hub Backend.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # API v1
    path(
        "api/v1/",
        include(
            [
                path("auth/", include("apps.users.urls.auth")),
                path("users/", include("apps.users.urls.users")),
                path("courses/", include("apps.courses.urls")),
                path("content/", include("apps.content.urls")),
                path("gamification/", include("apps.gamification.urls")),
                path("payments/", include("apps.payments.urls")),
                path("notifications/", include("apps.notifications.urls")),
            ]
        ),
    ),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
