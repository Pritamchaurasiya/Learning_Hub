"""
User management URLs for Learning Hub API.
"""

from django.urls import path

from ..views import UserProfileViewSet

app_name = "users"

# ViewSet actions
profile_view = UserProfileViewSet.as_view(
    {
        "get": "profile",
        "put": "update_profile",
    }
)

avatar_view = UserProfileViewSet.as_view(
    {
        "post": "avatar",
    }
)

urlpatterns = [
    path("profile/", profile_view, name="profile"),
    path("avatar/", avatar_view, name="avatar"),
]
