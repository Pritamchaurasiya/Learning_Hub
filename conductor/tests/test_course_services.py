"""
Course Service tests.
Tests for course enrollment, reviews, and service layer logic.
"""

import pytest
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.courses.models import Enrollment, Review
from apps.courses.services import CourseService
from apps.core.exceptions import PaymentRequiredException


@pytest.mark.django_db
class TestCourseServiceEnrollment:
    """Tests for CourseService enrollment logic."""

    def test_enroll_free_course(self, user, course):
        """Test enrolling in a free course."""
        course.is_free = True
        course.price = 0
        course.save()
        
        enrollment = CourseService.enroll_user(user, course)
        
        assert enrollment.user == user
        assert enrollment.course == course
        assert Enrollment.objects.filter(user=user, course=course).exists()

    def test_enroll_paid_course_raises_error(self, user, course):
        """Test paid course requires payment."""
        course.is_free = False
        course.price = 99.99
        course.save()
        
        with pytest.raises(PaymentRequiredException):
            CourseService.enroll_user(user, course)

    def test_duplicate_enrollment_raises_error(self, user, course):
        """Test cannot enroll twice."""
        course.is_free = True
        course.save()
        
        CourseService.enroll_user(user, course)
        
        with pytest.raises(ValidationError):
            CourseService.enroll_user(user, course)

    def test_enrollment_updates_count(self, user, course):
        """Test enrollment increments course enrollment_count."""
        course.is_free = True
        course.enrollment_count = 0
        course.save()
        
        CourseService.enroll_user(user, course)
        
        course.refresh_from_db()
        assert course.enrollment_count == 1


@pytest.mark.django_db
class TestCourseServiceReviews:
    """Tests for CourseService review logic."""

    def test_add_review_when_enrolled(self, user, course, enrollment):
        """Test adding review when enrolled."""
        review_data = {
            "rating": 5,
            "title": "Great course!",
            "content": "Really enjoyed it.",
        }
        
        review = CourseService.add_review(user, course, review_data)
        
        assert review.user == user
        assert review.rating == 5

    def test_review_requires_enrollment(self, user, course):
        """Test review fails without enrollment."""
        review_data = {"rating": 5, "title": "Test", "content": "Test"}
        
        with pytest.raises(PermissionDenied):
            CourseService.add_review(user, course, review_data)

    def test_duplicate_review_raises_error(self, user, course, enrollment):
        """Test cannot review twice."""
        review_data = {"rating": 5, "title": "Test", "content": "Test"}
        
        CourseService.add_review(user, course, review_data)
        
        with pytest.raises(ValidationError):
            CourseService.add_review(user, course, review_data)

    def test_review_updates_course_stats(self, user, course, enrollment):
        """Test review updates avg_rating and review_count."""
        course.avg_rating = 0
        course.review_count = 0
        course.save()
        
        review_data = {"rating": 4, "title": "Good", "content": "Nice"}
        CourseService.add_review(user, course, review_data)
        
        course.refresh_from_db()
        assert course.avg_rating == 4.0
        assert course.review_count == 1


@pytest.mark.django_db
class TestCourseServiceQueries:
    """Tests for CourseService query methods."""

    def test_get_user_enrollments(self, user, course, enrollment):
        """Test getting user enrollments."""
        enrollments = CourseService.get_user_enrollments(user)
        
        assert len(enrollments) == 1
        assert enrollments[0].course == course

    def test_get_featured_courses(self, course, instructor, category):
        """Test getting featured courses."""
        course.is_featured = True
        course.save()
        
        featured = CourseService.get_featured_courses()
        
        assert course in featured
