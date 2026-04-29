
import pytest
from apps.courses.services import CourseService, EnrollmentService
from apps.courses.models import Course, Enrollment, Review
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError, PermissionDenied

User = get_user_model()

@pytest.mark.django_db
class TestCourseService:
    def test_search_courses(self, create_course):
        course1 = create_course(title="Python for Beginners", slug="py-begin", is_published=True)
        course2 = create_course(title="Advanced Django", slug="adv-django", is_published=True)
        course3 = create_course(title="Data Science with Python", slug="ds-python", is_published=True)
        
        # Test basic search
        results = CourseService.search_courses("Python")
        assert len(results) >= 2
        ids = [c.id for c in results]
        assert course1.id in ids
        assert course3.id in ids
        assert course2.id not in ids
        
        # Test empty query
        results = CourseService.search_courses("")
        assert results.count() >= 3

@pytest.mark.django_db
class TestEnrollmentService:
    def test_enroll_user(self, user_factory, create_course):
        user = user_factory()
        course = create_course(slug="enroll-1")
        
        enrollment = EnrollmentService.enroll(user, course)
        assert enrollment.user == user
        assert enrollment.course == course
        course.refresh_from_db()
        assert course.enrollment_count == 1
        
    def test_enroll_already_enrolled(self, user_factory, create_course):
        user = user_factory()
        course = create_course(slug="enroll-2")
        EnrollmentService.enroll(user, course)
        
        with pytest.raises(ValidationError):
            EnrollmentService.enroll(user, course)
            
    def test_add_review(self, user_factory, create_course):
        user = user_factory()
        course = create_course(slug="review-1")
        EnrollmentService.enroll(user, course)
        
        review_data = {"rating": 5, "content": "Great course!"}
        review = EnrollmentService.add_review(user, course, review_data)
        
        assert review.rating == 5
        assert review.course.avg_rating == 5
        assert review.course.review_count == 1
        
    def test_add_review_not_enrolled(self, user_factory, create_course):
        user = user_factory()
        course = create_course(slug="review-2")
        
        review_data = {"rating": 5, "content": "Great course!"}
        with pytest.raises(PermissionDenied):
            EnrollmentService.add_review(user, course, review_data)
