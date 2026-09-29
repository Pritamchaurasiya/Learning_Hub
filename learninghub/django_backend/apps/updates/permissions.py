"""
Permissions for LearningHub Student Updates Hub.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    """
    Grants read access to anyone, write/delete access strictly to staff/admins.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsBookmarkOwner(BasePermission):
    """
    Object-level permission allowing users to manage only their own bookmarks.
    """
    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and obj.user == request.user)


class IsReminderOwner(BasePermission):
    """
    Object-level permission allowing users to manage only their own reminders.
    """
    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and obj.user == request.user)


class IsSubscriptionOwner(BasePermission):
    """
    Object-level permission allowing users to manage only their own subscriptions.
    """
    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and obj.user == request.user)
