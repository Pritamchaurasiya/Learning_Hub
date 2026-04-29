"""
Core permissions for the application.
"""
from rest_framework import permissions


class IsEnrolled(permissions.BasePermission):
    """
    Permission to only allow enrolled students to access course content.
    """
    message = "You must be enrolled in this course to access this content."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        if hasattr(obj, 'course'):
            course = obj.course
        elif hasattr(obj, 'id'):
            course = obj
        else:
            return False
        from apps.courses.models import Enrollment
        return Enrollment.objects.filter(user=request.user, course=course).exists()


class IsCourseOwner(permissions.BasePermission):
    """
    Permission to only allow course instructors to modify course content.
    """
    message = "Only the course instructor can modify this content."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        if hasattr(obj, 'instructor'):
            return obj.instructor == request.user
        if hasattr(obj, 'course') and hasattr(obj.course, 'instructor'):
            return obj.course.instructor == request.user
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission to only allow admin users to edit objects.
    Regular users can only read.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsActiveUser(permissions.BasePermission):
    """
    Permission to only allow active users to access content.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_active
        )


class IsInstructor(permissions.BasePermission):
    """
    Allocates access only to users with the 'instructor' role.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'instructor' or request.user.is_staff


class IsOwner(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        # if request.method in permissions.SAFE_METHODS:
        #    return True

        # Instance must have an attribute named `owner`.
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'author'):
            return obj.author == request.user
            
        return False
