import pytest
import datetime
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework import status
from apps.courses.models import Course, Category, Enrollment
from apps.courses.services import CourseService

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def superuser():
    return User.objects.create_superuser(username="admin", email="admin@test.com", password="password")

@pytest.fixture
def instructor():
    return User.objects.create_user(username="instructor", email="instructor@test.com", password="password", role="instructor")

@pytest.fixture
def student():
    return User.objects.create_user(username="student", email="student@test.com", password="password", role="student")

@pytest.fixture
def setup_course_data(instructor):
    category = Category.objects.create(name="Programming", slug="programming", is_active=True)
    course = Course.objects.create(
        title="Python Mastery",
        slug="python-mastery",
        description="Learn Python from scratch.",
        instructor=instructor,
        category=category,
        is_published=True,
        price=49.99
    )
    return course, category

@pytest.mark.django_db
class TestCourseAPI:
    def test_list_courses(self, api_client, setup_course_data):
        course, _ = setup_course_data
        response = api_client.get('/api/v1/courses/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data.get('results', response.data)) > 0
        assert response.data.get('results', response.data)[0]['title'] == "Python Mastery"

    def test_trending_courses(self, api_client, setup_course_data, student):
        course, _ = setup_course_data
        
        # Add an enrollment to make it trending
        Enrollment.objects.create(user=student, course=course)
        
        response = api_client.get('/api/v1/courses/trending/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == "success"
        assert len(response.data['data']) == 1

    def test_course_enroll(self, api_client, setup_course_data, student):
        course, _ = setup_course_data
        api_client.force_authenticate(user=student)
        response = api_client.post(f'/api/v1/courses/{course.slug}/enroll/')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == "success"
        
        # Verify in DB
        assert Enrollment.objects.filter(user=student, course=course).exists()

    def test_course_analytics(self, setup_course_data, student):
        course, _ = setup_course_data
        Enrollment.objects.create(user=student, course=course, progress_percentage=100)
        
        analytics = CourseService.get_course_analytics(course)
        assert analytics["total_enrollments"] == 1
        assert analytics["completion_rate"] == 100.0
        assert analytics["average_progress"] == 100.0
        assert analytics["total_revenue"] == 49.99
