"""
RBAC Permissions for Users app.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStudent(BasePermission):
    """Allows access to verified student accounts."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ["student", "STUDENT"]
        )


class IsInstructor(BasePermission):
    """Allows access to instructor or staff accounts."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", None) in ["instructor", "INSTRUCTOR"]
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


class IsAdminRole(BasePermission):
    """Allows access to users with ADMIN role, is_staff, or is_superuser."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", None) in ["admin", "ADMIN"]
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


class IsSuperAdmin(BasePermission):
    """Allows access strictly to Django superusers."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsModerator(BasePermission):
    """Allows access to moderators and administrative staff."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", None) in ["moderator", "MODERATOR", "admin", "ADMIN"]
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


class IsOwnerOrReadOnly(BasePermission):
    """Object-level permission allowing only the owner to edit their resource."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = getattr(obj, "user", None) or getattr(obj, "owner", None) or obj
        return bool(request.user and request.user.is_authenticated and user == request.user)
