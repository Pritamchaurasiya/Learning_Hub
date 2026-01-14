
import pytest
from django.urls import reverse
from rest_framework import status
from django.core.cache import cache

@pytest.mark.django_db
class TestAuthenticationThrottling:
    """Test rate limiting on authentication endpoints."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_login_throttling(self, api_client, user_factory):
        """Test that login is throttled after 5 attempts."""
        user = user_factory(email="testlogin@example.com", password="password123")
        url = reverse("auth:login")
        data = {"email": user.email, "password": "password123"}

        # Make 5 successful attempts (limit is 5/min)
        for i in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_200_OK, f"Request {i+1} failed"

        # The 6th attempt should fail
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Request was throttled" in str(response.data)

    def test_register_throttling(self, api_client):
        """Test that registration is throttled."""
        url = reverse("auth:register")

        # Make 5 attempts
        for i in range(5):
            data = {
                "email": f"test{i}@example.com",
                "username": f"user{i}",
                "password": "StrongPassword123!",
                "password_confirm": "StrongPassword123!"
            }
            response = api_client.post(url, data)
            # Either 201 or 400 (validation) counts towards throttle if view is hit.
            # We aim for valid requests here to be sure.
            if response.status_code != status.HTTP_201_CREATED:
                print(f"Request {i+1} failed with status {response.status_code}: {response.data}")
            assert response.status_code == status.HTTP_201_CREATED, f"Request {i+1} failed"

        # 6th attempt
        data = {
            "email": "test6@example.com",
            "username": "user6",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
