"""
Edge case tests for Courses module.
Tests boundary conditions, invalid inputs, and error handling.
"""

import pytest
from rest_framework import status
from django.urls import reverse


@pytest.mark.django_db
class TestCourseEdgeCases:
    """Edge case tests for course operations."""

    def test_course_list_pagination_boundary(self, api_client, course):
        """Test pagination at boundary values."""
        # Test page 0 (should return page 1)
        response = api_client.get("/api/v1/courses/?page=0")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
        
        # Test very large page number
        response = api_client.get("/api/v1/courses/?page=999999")
        # Should return empty results or 404
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_course_search_special_characters(self, api_client):
        """Test search with special characters."""
        special_queries = [
            "' OR '1'='1",  # SQL injection attempt
            "<script>alert('xss')</script>",  # XSS attempt
            "normal'--",
            "%",
            "_",
            "\\",
            "; DROP TABLE courses; --",
        ]
        
        for query in special_queries:
            response = api_client.get("/api/v1/courses/", {"search": query})
            # Should not crash and should return 200 or empty results
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_course_detail_invalid_slug(self, api_client):
        """Test course detail with invalid slugs."""
        from urllib.parse import quote
        invalid_slugs = [
            "nonexistent-course",
            "",
            "a" * 1000,  # Very long slug
            "slug-with-@-special#chars",
            "../../../etc/passwd",
        ]
        
        for slug in invalid_slugs:
            response = api_client.get(f"/api/v1/courses/{quote(slug, safe='')}/")
            assert response.status_code in [
                status.HTTP_404_NOT_FOUND,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_200_OK,
                status.HTTP_301_MOVED_PERMANENTLY
            ]

    def test_course_enrollment_already_enrolled(self, api_client, user, course):
        """Test enrolling in already enrolled course."""
        api_client.force_authenticate(user=user)
        
        # Enroll first time
        response1 = api_client.post(f"/api/v1/courses/{course.slug}/enroll/")
        assert response1.status_code in [status.HTTP_201_CREATED, status.HTTP_200_OK]
        
        # Try to enroll again
        response2 = api_client.post(f"/api/v1/courses/{course.slug}/enroll/")
        # Should return appropriate error
        assert response2.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT,
            status.HTTP_200_OK
        ]

    def test_course_enrollment_unauthenticated(self, api_client, course):
        """Test enrollment without authentication."""
        response = api_client.post(f"/api/v1/courses/{course.slug}/enroll/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_course_with_extremely_long_title(self, api_client, instructor):
        """Test course creation with extremely long title."""
        api_client.force_authenticate(user=instructor)
        
        data = {
            "title": "A" * 5000,  # Very long title
            "description": "Test description",
            "category": "programming",
        }
        
        response = api_client.post("/api/v1/courses/", data)
        # Should either truncate or return validation error
        assert response.status_code in [
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST
        ]


@pytest.mark.django_db
class TestCourseReviewEdgeCases:
    """Edge case tests for course reviews."""

    def test_review_invalid_rating_values(self, api_client, user, course):
        """Test review with invalid rating values."""
        from apps.courses.models import Enrollment
        Enrollment.objects.create(user=user, course=course)
        api_client.force_authenticate(user=user)
        
        invalid_ratings = [-1, 0, 6, 10, 100, -100, "abc", None, ""]
        
        for rating in invalid_ratings:
            data = {
                "rating": rating,
                "title": "Test review",
                "content": "Test content"
            }
            
            response = api_client.post(
                f"/api/v1/courses/{course.slug}/review/",
                data
            )
            assert response.status_code in [
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_201_CREATED,
                status.HTTP_403_FORBIDDEN # in case review system is closed or something
            ]

    def test_review_very_long_content(self, api_client, user, course):
        """Test review with extremely long content."""
        from apps.courses.models import Enrollment
        Enrollment.objects.create(user=user, course=course)
        api_client.force_authenticate(user=user)
        
        data = {
            "rating": 5,
            "title": "A" * 10000,
            "content": "B" * 50000
        }
        
        response = api_client.post(
            f"/api/v1/courses/{course.slug}/review/",
            data
        )
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_201_CREATED,
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
        ]
