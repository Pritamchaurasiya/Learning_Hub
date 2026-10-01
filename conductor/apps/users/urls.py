"""
Canonical Clean Architecture URLs for Users app.
Provides top-level routes for auth and user management.
"""

from django.urls import path, include

urlpatterns = [
    path("auth/", include("apps.users.urls.auth")),
    path("", include("apps.users.urls.users")),
    path("orgs/", include("apps.users.urls.orgs")),
]
