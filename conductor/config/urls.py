"""
URL configuration for Learning Hub Backend.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView, TemplateView
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.core.admin_site import god_admin


def health_check(request):
    """Health check endpoint for monitoring."""
    from django.db import connection
    from django.core.cache import cache
    
    status = {"service": "Learning Hub API", "components": {}}
    http_status = 200

    # Check Database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        status["components"]["database"] = "healthy"
    except Exception as e:
        status["components"]["database"] = f"unhealthy: {str(e)}"
        http_status = 503

    # Check Cache (Redis)
    try:
        cache.set("health_check", "ok", timeout=5)
        if cache.get("health_check") == "ok":
            status["components"]["cache"] = "healthy"
        else:
            status["components"]["cache"] = "unhealthy: read failed"
            http_status = 503
    except Exception as e:
        status["components"]["cache"] = f"unhealthy: {str(e)}"
        http_status = 503

    status["status"] = "healthy" if http_status == 200 else "unhealthy"
    return JsonResponse(status, status=http_status)


urlpatterns = [
    # Website Entry Points
    path("", TemplateView.as_view(template_name="index.html"), name="root"),
    path("courses", TemplateView.as_view(template_name="courses.html"), name="courses"),
    path("courses/", TemplateView.as_view(template_name="courses.html")),
    path("quiz", TemplateView.as_view(template_name="quiz.html"), name="quiz"),
    path("quiz/", TemplateView.as_view(template_name="quiz.html")),
    path("about", TemplateView.as_view(template_name="about.html"), name="about"),
    path("about/", TemplateView.as_view(template_name="about.html")),
    path("contact", TemplateView.as_view(template_name="contact.html"), name="contact"),
    path("contact/", TemplateView.as_view(template_name="contact.html")),
    path("login", TemplateView.as_view(template_name="login.html"), name="login"),
    path("login/", TemplateView.as_view(template_name="login.html")),
    path("signup", TemplateView.as_view(template_name="signup.html"), name="signup"),
    path("signup/", TemplateView.as_view(template_name="signup.html")),
    # Health check
    path("health/", health_check, name="health"),

    # Prometheus Metrics (optional)
]

try:
    import django_prometheus  # noqa: F401
    urlpatterns += [path("", include("django_prometheus.urls"))]
except ImportError:
    pass

urlpatterns += [
    # Admin
    path("god-admin/", god_admin.urls), # God Mode Portal
    path("admin/", admin.site.urls),
    # API v1
    path(
        "api/v1/",
        include(
            [
                path("auth/", include("apps.users.urls.auth")),
                path("users/", include("apps.users.urls.users")),
                path("organizations/", include("apps.users.urls.orgs")),
                path("core/", include("apps.core.urls")),
                path("courses/", include("apps.courses.urls")),
                # path("content/", include("apps.content.urls")),
                path("gamification/", include("apps.gamification.urls")),
                path("payments/", include("apps.payments.urls")),
                path("notifications/", include("apps.notifications.urls")),
                path("ai/", include("apps.ai_engine.urls")),
                path("dsa/", include("apps.dsa.urls")),
                path("quizzes/", include("apps.quiz.urls")),
                path("discussions/", include("apps.discussions.urls")),
                path("support/", include("apps.support.urls")),
                path("chat/", include("apps.chat.urls")),
                path("dashboard/", include("apps.dashboard.urls")),
                path("tutors/", include("apps.tutors.urls")),
                path("live/", include("apps.live_sessions.urls")),
                path("web3/", include("apps.web3.urls", namespace='web3')),
                path("neuro/", include("apps.neuro.urls", namespace='neuro')),

                path("downloads/", include("apps.downloads.urls")),
                path("study/", include("apps.study_groups.urls")),
                path("search/", include("apps.search.urls")),
                path("analytics/", include("apps.analytics.urls")),
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

# Serve Flutter Web assets from root
from django.views.static import serve
import os


from apps.core.health import DeepHealthCheckView
from apps.core.health_check import liveness_view, readiness_view, metrics_view

# Serve SPA with fallback
def serve_spa(request, path):
    """
    Serve Flutter Web assets. If file not found, serve index.html for SPA routing.
    """
    import posixpath
    from pathlib import Path
    from django.http import Http404
    from django.conf import settings
    
    path = posixpath.normpath(path).lstrip('/')
    
    # GOD MODE: Serve from staticfiles/flutter where deploy script puts them
    build_root = settings.BASE_DIR / 'staticfiles' / 'flutter'
    
    # Try to serve the actual file (e.g. main.dart.js, assets/...)
    try:
        file_path = build_root / path
        if file_path.is_file():
            return serve(request, path, document_root=build_root)
    except Exception:
        pass
        
    # Fallback to index.html for any other route (SPA)
    # We serve from TEMPLATES directory where index.html was copied
    return TemplateView.as_view(template_name="index.html")(request)

urlpatterns += [
    path("health/deep/", DeepHealthCheckView.as_view(), name="deep_health_check"),
    path("health/live/", liveness_view, name="liveness_probe"),
    path("health/ready/", readiness_view, name="readiness_probe"),
    path("health/metrics/", metrics_view, name="app_metrics"),
    path("monitoring/", include("apps.monitoring.urls")),
    re_path(r'^(?!api|admin|health|metrics|monitoring|static)(?P<path>.*)$', serve_spa),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
