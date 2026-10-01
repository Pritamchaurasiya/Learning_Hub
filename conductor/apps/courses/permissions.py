"""
Course Permissions for Learning Hub Backend.
Granular permission classes for Course, Lesson, Enrollment, Review, and Note access.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.courses.models import Course, Enrollment


class IsInstructorOrReadOnly(BasePermission):
    """
    Allow read-only requests for any user.
    Require instructor or staff privileges for unsafe (create/edit/delete) operations.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user.is_staff
            or getattr(user, "role", "") in ("instructor", "admin", "superadmin")
            or getattr(user, "is_instructor", False)
        )


class IsCourseInstructorOrAdmin(BasePermission):
    """
    Object-level permission: Only the course instructor or an admin can modify the course.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or getattr(user, "role", "") in ("admin", "superadmin"):
            return True
        course = obj if isinstance(obj, Course) else getattr(obj, "course", None)
        return bool(course and course.instructor_id == user.id)


class IsEnrolledInCourse(BasePermission):
    """
    Object-level or view-level permission ensuring user is actively enrolled in the course.
    Instructors of the course and staff bypass this check.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or getattr(user, "role", "") in ("admin", "superadmin"):
            return True
        # If slug or course_id is in view kwargs, check enrollment
        course_slug = view.kwargs.get("slug") or view.kwargs.get("course_slug")
        course_id = view.kwargs.get("course_id")
        if course_slug:
            return (
                Course.objects.filter(slug=course_slug, instructor=user).exists()
                or Enrollment.objects.filter(user=user, course__slug=course_slug).exists()
            )
        if course_id:
            return (
                Course.objects.filter(id=course_id, instructor=user).exists()
                or Enrollment.objects.filter(user=user, course_id=course_id).exists()
            )
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or getattr(user, "role", "") in ("admin", "superadmin"):
            return True
        course = obj if isinstance(obj, Course) else getattr(obj, "course", None)
        if not course:
            return True
        if course.instructor_id == user.id:
            return True
        return Enrollment.objects.filter(user=user, course=course).exists()


class IsCourseCompleted(BasePermission):
    """
    Permission ensuring the user has completed 100% of the course.
    Used for claiming completion certificates.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        course_slug = view.kwargs.get("slug") or view.kwargs.get("course_slug")
        if course_slug:
            return Enrollment.objects.filter(
                user=user, course__slug=course_slug, progress_percentage=100
            ).exists()
        return True


class IsReviewAuthorOrReadOnly(BasePermission):
    """
    Review author or staff can modify/delete; all users can read.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_staff or obj.user_id == user.id)


class IsNoteOwner(BasePermission):
    """
    Student notes are strictly private; only the author can view or edit.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return bool(request.user and obj.user_id == request.user.id)
