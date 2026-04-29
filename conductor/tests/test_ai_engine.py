"""
AI Engine tests.
Comprehensive tests for recommendation, user behavior, and analytics services.
"""

import pytest
from django.utils import timezone
from datetime import timedelta

from apps.ai_engine.services import (
    UserBehaviorService,
    CourseAnalyticsService,
)
from apps.courses.models import Course, Category, Enrollment


# ==============================================================================
# FIXTURES
# ==============================================================================


@pytest.fixture
def category(db):
    """Create a test category."""
    return Category.objects.create(
        name="Python Programming",
        slug="python",
        description="Learn Python",
        is_active=True,
    )


@pytest.fixture
def category_web(db):
    """Create a web development category."""
    return Category.objects.create(
        name="Web Development",
        slug="web",
        description="Learn web development",
        is_active=True,
    )


@pytest.fixture
def course(db, category, instructor):
    """Create a test course."""
    return Course.objects.create(
        title="Python Basics",
        slug="python-basics",
        description="Learn Python fundamentals",
        category=category,
        instructor=instructor,
        price=0,
        is_published=True,
        avg_rating=4.5,
    )


@pytest.fixture
def course_web(db, category_web, instructor):
    """Create a web development course."""
    return Course.objects.create(
        title="HTML & CSS",
        slug="html-css",
        description="Learn HTML and CSS",
        category=category_web,
        instructor=instructor,
        price=0,
        is_published=True,
        avg_rating=4.0,
    )


@pytest.fixture
def enrollment(db, user, course):
    """Create an enrollment for the test user."""
    return Enrollment.objects.create(
        user=user,
        course=course,
        progress_percentage=50,
    )



# ==============================================================================
# USER BEHAVIOR SERVICE TESTS
# ==============================================================================


@pytest.mark.django_db
class TestUserBehaviorService:
    """Tests for UserBehaviorService."""

    def test_get_user_learning_stats_no_enrollments(self, user):
        """Test stats for user with no enrollments."""
        stats = UserBehaviorService.get_user_learning_stats(user)
        
        assert stats["total_courses"] == 0
        assert stats["completed_courses"] == 0
        assert stats["completion_rate"] == 0
        assert stats["average_progress"] == 0

    def test_get_user_learning_stats_with_enrollments(self, user, enrollment):
        """Test stats for user with enrollments."""
        stats = UserBehaviorService.get_user_learning_stats(user)
        
        assert stats["total_courses"] == 1
        assert stats["average_progress"] == 50.0

    def test_get_user_learning_stats_completed(self, user, course):
        """Test stats with completed courses."""
        Enrollment.objects.create(
            user=user,
            course=course,
            progress_percentage=100,
        )
        
        stats = UserBehaviorService.get_user_learning_stats(user)
        
        assert stats["completed_courses"] == 1
        assert stats["completion_rate"] == 100

    def test_predict_course_completion_no_history(self, user, course):
        """Test prediction for user with no history."""
        prediction = UserBehaviorService.predict_course_completion(user, course)
        
        assert prediction == 0.5  # Neutral prediction

    def test_predict_course_completion_with_history(self, user, course, category, instructor):
        """Test prediction with completion history."""
        # Create completed enrollment
        Enrollment.objects.create(
            user=user,
            course=course,
            progress_percentage=100,
        )
        
        # Create new course in same category
        new_course = Course.objects.create(
            title="Python Advanced",
            slug="python-advanced",
            category=category,
            instructor=instructor,
            is_published=True,
        )
        
        prediction = UserBehaviorService.predict_course_completion(user, new_course)
        
        # Should be higher due to familiarity
        assert prediction >= 0.5


# ==============================================================================
# COURSE ANALYTICS SERVICE TESTS
# ==============================================================================


@pytest.mark.django_db
class TestCourseAnalyticsService:
    """Tests for CourseAnalyticsService."""

    def test_get_course_performance_no_enrollments(self, course):
        """Test performance metrics for course with no enrollments."""
        metrics = CourseAnalyticsService.get_course_performance(course)
        
        assert metrics["total_enrollments"] == 0
        assert metrics["active_students"] == 0
        assert metrics["completion_rate"] == 0

    def test_get_course_performance_with_enrollments(self, course, enrollment):
        """Test performance metrics with enrollments."""
        metrics = CourseAnalyticsService.get_course_performance(course)
        
        assert metrics["total_enrollments"] == 1
        assert metrics["average_progress"] == 50.0

    def test_get_popular_categories(self, category, category_web, course, course_web):
        """Test getting popular categories."""
        categories = CourseAnalyticsService.get_popular_categories(limit=10)
        
        assert isinstance(categories, list)
        # Categories should have expected fields
        if categories:
            assert "name" in categories[0]
            assert "slug" in categories[0]
            assert "course_count" in categories[0]
