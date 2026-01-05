from django.db.models import Avg, QuerySet
from django.db import transaction
from typing import Dict, Any, cast
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import PaymentRequiredException
from core.signals import user_enrolled
from .models import Course, Enrollment, Review


class CourseService:
    """
    Service layer for Course related operations.
    """

    @staticmethod
    def enroll_user(user, course) -> "Enrollment":
        """
        Enroll a user in a course.

        Raises ValidationError if already enrolled or PaymentRequiredException
        if course is paid.
        """
        # Check if already enrolled
        if Enrollment.objects.filter(user=user, course=course).exists():
            raise ValidationError("Already enrolled in this course.")

        # Check if course is paid (simple check for now)
        if not course.is_free and course.price > 0:
            # In a real scenario, we'd check for successful transaction here
            raise PaymentRequiredException(
                "This is a paid course. Please complete payment first."
            )

        # Atomic transaction to ensure consistency
        enrollment: Enrollment
        with transaction.atomic():
            enrollment = Enrollment.objects.create(user=user, course=course)

            # Trigger signal
            user_enrolled.send(
                sender=Course, user=user, course=course, enrollment=enrollment
            )

            # Update stats
            course.enrollment_count += 1
            course.save(update_fields=["enrollment_count"])

        return enrollment

    @staticmethod
    def add_review(user, course, review_data: Dict[str, Any]) -> "Review":
        """
        Add a review for a course.
        Raises PermissionDenied if not enrolled, ValidationError if already reviewed.
        """
        enrollment_exists = Enrollment.objects.filter(user=user, course=course).exists()
        if not enrollment_exists:
            raise PermissionDenied("You must be enrolled to review this course.")

        if Review.objects.filter(user=user, course=course).exists():
            raise ValidationError("You have already reviewed this course.")

        with transaction.atomic():
            review = cast(
                Review, Review.objects.create(user=user, course=course, **review_data)
            )

            # Update agg stats
            avg = Review.objects.filter(course=course).aggregate(Avg("rating"))[
                "rating__avg"
            ]
            course.avg_rating = avg or 0
            course.review_count += 1
            course.save(update_fields=["avg_rating", "review_count"])

        return review

    @staticmethod
    def get_course_reviews(course) -> QuerySet:
        """Get approved reviews for a course."""
        return Review.objects.filter(course=course, is_approved=True)

    @staticmethod
    def get_user_enrollments(user) -> QuerySet:
        """Get enrollments for a user."""
        return Enrollment.objects.filter(user=user).select_related("course")

    @staticmethod
    def get_featured_courses() -> QuerySet:
        """Get featured courses."""
        return Course.objects.filter(
            is_published=True, is_featured=True
        ).select_related("instructor", "category")[:10]
