from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsEbookOwnerOrReadOnly(BasePermission):
    """Allows read access to everyone, but write access only to staff or owner."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsHighlightOwner(BasePermission):
    """Object-level permission allowing users to manage only their own highlights."""

    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and obj.user == request.user)


class IsBookmarkOwner(BasePermission):
    """Object-level permission allowing users to manage only their own bookmarks."""

    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and obj.user == request.user)
