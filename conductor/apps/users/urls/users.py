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

bookmarks_view = UserProfileViewSet.as_view(
    {
        "get": "bookmarks",
        "post": "add_bookmark",
    }
)

bookmark_detail_view = UserProfileViewSet.as_view(
    {
        "delete": "remove_bookmark",
    }
)

urlpatterns = [
    path("profile/", profile_view, name="profile"),
    path("avatar/", avatar_view, name="avatar"),
    path("profile/bookmarks/", bookmarks_view, name="bookmarks"),
    path("profile/bookmarks/<uuid:course_id>/", bookmark_detail_view, name="bookmark-detail"),
]
