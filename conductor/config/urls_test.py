"""
Test URL configuration.

Includes auth and user routes for testing, but excludes heavy AI engine
endpoints that may have import-time issues with optional dependencies.
"""

from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse


def simple_health(request):
    """Simple health check for tests."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    # Admin URLs (required for reverse('admin:...') in tests)
    path("admin/", admin.site.urls),
    # Health check endpoints (matching main urls.py patterns)
    path(
        "health/",
        simple_health,
        name="health",
    ),
    path(
        "health/live/",
        simple_health,
        name="liveness_probe",
    ),
    path(
        "health/ready/",
        simple_health,
        name="readiness_probe",
    ),
    path(
        "health/metrics/",
        lambda request: JsonResponse({"metrics": {}}),
        name="app_metrics",
    ),
    # API v1 — include the routes that tests actually need
    path(
        "api/v1/",
        include([
            path("auth/", include("apps.users.urls.auth")),
            path("users/", include("apps.users.urls.users")),
            path("organizations/", include("apps.users.urls.orgs")),
            path("courses/", include("apps.courses.urls")),
            path("core/", include("apps.core.urls")),
            path("gamification/", include("apps.gamification.urls")),
            path("notifications/", include("apps.notifications.urls")),
            path("payments/", include("apps.payments.urls")),
            path("ai/", include("apps.ai_engine.urls")),
            path("dsa/", include("apps.dsa.urls")),
            path("quizzes/", include("apps.quiz.urls")),
            path("discussions/", include("apps.discussions.urls")),
            path("support/", include("apps.support.urls")),
            path("chat/", include("apps.chat.urls")),
            path("dashboard/", include("apps.dashboard.urls")),
            path("tutors/", include("apps.tutors.urls")),
            path("live/", include("apps.live_sessions.urls")),
            path("downloads/", include("apps.downloads.urls")),
            path("study/", include("apps.study_groups.urls")),
            path("search/", include("apps.search.urls")),
            path("analytics/", include("apps.analytics.urls")),
        ]),
    ),
]
