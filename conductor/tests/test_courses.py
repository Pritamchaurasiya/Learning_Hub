"""
Course API tests.
"""

import pytest
from rest_framework import status

from apps.courses.models import Category, Course, Enrollment


@pytest.fixture
def category(db):
    """Create a test category."""
    return Category.objects.create(
        name="Programming", slug="programming", description="Learn to code"
    )


@pytest.fixture
def course(db, instructor, category):
    """Create a test course."""
    return Course.objects.create(
        title="Python Basics",
        slug="python-basics",
        description="Learn Python from scratch",
        short_description="Python for beginners",
        instructor=instructor,
        category=category,
        is_published=True,
        is_free=True,
    )


@pytest.fixture
def paid_course(db, instructor, category):
    """Create a paid test course."""
    return Course.objects.create(
        title="Advanced Python",
        slug="advanced-python",
        description="Master Python",
        short_description="Advanced concepts",
        instructor=instructor,
        category=category,
        is_published=True,
        is_free=False,
        price=999.00,
    )


@pytest.mark.django_db
class TestCourseList:
    """Tests for course listing."""

    def test_list_courses(self, api_client, course):
        """Test listing published courses."""
        response = api_client.get("/api/v1/courses/")

        assert response.status_code == status.HTTP_200_OK
        # Handle both paginated (results) and non-paginated (data) responses
        results = response.data.get("results") or response.data.get("data", [])
        assert len(results) >= 1

    def test_list_excludes_unpublished(self, api_client, instructor, category):
        """Test unpublished courses are excluded."""
        Course.objects.create(
            title="Draft Course",
            slug="draft-course",
            description="Not ready",
            short_description="Draft",
            instructor=instructor,
            category=category,
            is_published=False,
        )

        response = api_client.get("/api/v1/courses/")

        # Handle both paginated (results) and non-paginated (data) responses
        results = response.data.get("results") or response.data.get("data", [])
        for course_data in results:
            assert course_data["title"] != "Draft Course"


@pytest.mark.django_db
class TestCourseDetail:
    """Tests for course detail view."""

    def test_get_course_detail(self, api_client, course):
        """Test getting course details by slug."""
        response = api_client.get(f"/api/v1/courses/{course.slug}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Python Basics"

    def test_course_not_found(self, api_client):
        """Test 404 for non-existent course."""
        response = api_client.get("/api/v1/courses/nonexistent/")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCourseEnrollment:
    """Tests for course enrollment."""

    def test_enroll_free_course(self, authenticated_client, course):
        """Test enrolling in a free course."""
        response = authenticated_client.post(f"/api/v1/courses/{course.slug}/enroll/")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "success"

    def test_enroll_unauthenticated(self, api_client, course):
        """Test enrollment fails without authentication."""
        response = api_client.post(f"/api/v1/courses/{course.slug}/enroll/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_enroll_paid_course_without_payment(
        self, authenticated_client, paid_course
    ):
        """Test paid course enrollment requires payment."""
        response = authenticated_client.post(
            f"/api/v1/courses/{paid_course.slug}/enroll/"
        )

        # API returns 402 for payment required
        assert response.status_code == status.HTTP_402_PAYMENT_REQUIRED

    def test_duplicate_enrollment(self, api_client, course, user):
        """Test cannot enroll twice in same course."""
        api_client.force_authenticate(user=user)
        Enrollment.objects.create(user=user, course=course)

        response = api_client.post(f"/api/v1/courses/{course.slug}/enroll/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCourseReview:
    """Tests for course reviews."""

    def test_submit_review_enrolled(self, api_client, course, user):
        """Test submitting review when enrolled."""
        api_client.force_authenticate(user=user)
        Enrollment.objects.create(user=user, course=course)

        data = {"rating": 5, "title": "Great!", "content": "Loved it"}
        response = api_client.post(
            f"/api/v1/courses/{course.slug}/review/", data
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_submit_review_not_enrolled(self, authenticated_client, course):
        """Test review fails when not enrolled."""
        data = {"rating": 5, "title": "Great!", "content": "Loved it"}
        response = authenticated_client.post(
            f"/api/v1/courses/{course.slug}/review/", data
        )

        # API returns 403 for permission errors (not enrolled)
        assert response.status_code == status.HTTP_403_FORBIDDEN
