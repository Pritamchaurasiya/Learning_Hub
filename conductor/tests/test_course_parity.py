"""
Tests for Course parity endpoints:
- GET /api/v1/courses/enrolled/
- POST /api/v1/courses/{id_or_slug}/rate/
- POST /api/v1/courses/enroll/ (body-based)
- GET /api/v1/courses/{uuid}/ (UUID lookup fallback)
"""

import pytest
from rest_framework import status
from apps.courses.models import Course, Category, Enrollment


@pytest.mark.django_db
class TestCourseParity:
    @pytest.fixture
    def instructor(self, django_user_model):
        return django_user_model.objects.create_user(
            username="parity_instructor",
            email="parity_instructor@example.com",
            password="testpassword123",
            role="instructor",
        )

    @pytest.fixture
    def student(self, django_user_model):
        return django_user_model.objects.create_user(
            username="parity_student",
            email="parity_student@example.com",
            password="testpassword123",
            role="student",
        )

    @pytest.fixture
    def category(self):
        return Category.objects.create(name="Web Development", slug="web-dev")

    @pytest.fixture
    def free_course(self, instructor, category):
        return Course.objects.create(
            title="Modern TypeScript & React",
            slug="modern-typescript-react",
            instructor=instructor,
            category=category,
            price=0.00,
            is_published=True,
        )

    def test_lookup_by_uuid(self, api_client, free_course):
        response = api_client.get(f"/api/v1/courses/{free_course.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["slug"] == free_course.slug
        assert data["title"] == free_course.title

    def test_lookup_by_slug(self, api_client, free_course):
        response = api_client.get(f"/api/v1/courses/{free_course.slug}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == str(free_course.id)

    def test_enroll_by_body(self, api_client, student, free_course):
        api_client.force_authenticate(user=student)
        payload = {"course_id": str(free_course.id)}
        response = api_client.post("/api/v1/courses/enroll/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "success"
        assert "enrollment_id" in data
        assert Enrollment.objects.filter(user=student, course=free_course).exists()

    def test_enrolled_courses_alias(self, api_client, student, free_course):
        api_client.force_authenticate(user=student)
        Enrollment.objects.create(user=student, course=free_course)

        response = api_client.get("/api/v1/courses/enrolled/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert len(data["data"]) == 1

    def test_rate_endpoint(self, api_client, student, free_course):
        api_client.force_authenticate(user=student)
        Enrollment.objects.create(user=student, course=free_course)

        payload = {"rating": 5, "comment": "Outstanding course!"}
        response = api_client.post(
            f"/api/v1/courses/{free_course.slug}/rate/",
            payload,
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
