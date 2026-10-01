from rest_framework.permissions import BasePermission

class IsAdminUserRole(BasePermission):
    """
    Allows access only to authenticated users with ADMIN/SUPERADMIN role, staff status, or superuser privileges.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                getattr(request.user, 'role', '') in ['ADMIN', 'SUPERADMIN'] or
                getattr(request.user, 'is_staff', False) or
                getattr(request.user, 'is_superuser', False)
            )
        )

class IsInstructorOrAdmin(BasePermission):
    """
    Allows access to authenticated users with INSTRUCTOR, ADMIN, or SUPERADMIN roles, or staff status.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                getattr(request.user, 'role', '') in ['INSTRUCTOR', 'ADMIN', 'SUPERADMIN'] or
                getattr(request.user, 'is_staff', False) or
                getattr(request.user, 'is_superuser', False)
            )
        )

class IsModeratorOrAdmin(BasePermission):
    """
    Allows access to authenticated users with MODERATOR, ADMIN, or SUPERADMIN roles.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                getattr(request.user, 'role', '') in ['MODERATOR', 'ADMIN', 'SUPERADMIN'] or
                getattr(request.user, 'is_staff', False) or
                getattr(request.user, 'is_superuser', False)
            )
        )

class IsEnterpriseUser(BasePermission):
    """
    Allows access to authenticated users with ENTERPRISE or ADMIN/SUPERADMIN roles.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                getattr(request.user, 'role', '') in ['ENTERPRISE', 'ADMIN', 'SUPERADMIN'] or
                getattr(request.user, 'is_staff', False) or
                getattr(request.user, 'is_superuser', False)
            )
        )

class IsOwnerOrAdmin(BasePermission):
    """
    Allows object-level access only to the resource owner or an administrator.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'role', '') in ['ADMIN', 'SUPERADMIN'] or request.user.is_staff or request.user.is_superuser:
            return True
        user_field = getattr(obj, 'user', None) or getattr(obj, 'owner', None)
        return user_field == request.user

class IsCourseInstructorOrAdmin(BasePermission):
    """
    Allows object-level modification only to the course instructor or an administrator.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                getattr(request.user, 'role', '') in ['INSTRUCTOR', 'ADMIN', 'SUPERADMIN'] or
                getattr(request.user, 'is_staff', False) or
                getattr(request.user, 'is_superuser', False)
            )
        )

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'role', '') in ['ADMIN', 'SUPERADMIN'] or request.user.is_staff or request.user.is_superuser:
            return True
        instructor = getattr(obj, 'instructor', None) or getattr(obj, 'user', None) or getattr(obj, 'author', None)
        return instructor == request.user
