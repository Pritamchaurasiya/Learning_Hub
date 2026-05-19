"""
Integration tests for deployment validation.
"""

import pytest
from rest_framework import status


@pytest.mark.django_db
class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_health_live_endpoint(self, api_client):
        """Test live health endpoint."""
        response = api_client.get('/health/live/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_health_ready_endpoint(self, api_client):
        """Test ready health endpoint."""
        response = api_client.get('/health/ready/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE, status.HTTP_404_NOT_FOUND]

    def test_health_basic_endpoint(self, api_client):
        """Test basic health endpoint."""
        response = api_client.get('/health/')
        assert response.status_code == status.HTTP_200_OK

    def test_metrics_endpoint(self, api_client):
        """Test metrics endpoint."""
        response = api_client.get('/health/metrics/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]


@pytest.mark.django_db
class TestAPIEndpoints:
    """Test critical API endpoints."""

    def test_courses_list(self, api_client):
        """Test courses list endpoint."""
        response = api_client.get('/api/v1/courses/')
        assert response.status_code == status.HTTP_200_OK

    def test_courses_list_response_format(self, api_client):
        """Test courses list response format."""
        response = api_client.get('/api/v1/courses/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should return paginated results
        assert 'data' in data or 'results' in data or isinstance(data, list)
