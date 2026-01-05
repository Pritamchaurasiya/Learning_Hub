"""
Custom permissions for Learning Hub API.
"""

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Permission that allows only the owner of an object to access it.

    The object must have a 'user' attribute or 'owner' attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Check for 'user' attribute first, then 'owner'
        owner = getattr(obj, "user", None) or getattr(obj, "owner", None)
        return owner == request.user


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission that allows read access to anyone, but write access only to owner.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only to owner
        owner = getattr(obj, "user", None) or getattr(obj, "owner", None)
        return owner == request.user


class IsInstructor(permissions.BasePermission):
    """Permission that allows only instructors."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            "instructor",
            "admin",
        ]


class IsAdmin(permissions.BasePermission):
    """Permission that allows only admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsEnrolled(permissions.BasePermission):
    """
    Permission that checks if user is enrolled in a course.

    View must have 'course_id' in kwargs or the object must be a Course.
    """

    def has_object_permission(self, request, view, obj):
        from apps.courses.models import Enrollment

        course = obj if hasattr(obj, "enrollments") else getattr(obj, "course", None)

        if not course:
            return False

        return Enrollment.objects.filter(user=request.user, course=course).exists()
