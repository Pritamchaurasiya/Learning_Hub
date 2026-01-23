import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestAuthThrottling:

    def setup_method(self):
        cache.clear()

    def test_login_throttling(self, user_factory):
        """
        Verify that the login endpoint is throttled after 5 attempts per minute.
        """
        user_factory(email="throttle@test.com", password="StrongPassword123!")
        client = APIClient()
        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": "WrongPassword"}

        # Make 5 requests (allowed)
        for i in range(5):
            response = client.post(url, data)
            # Should be 400 Bad Request (invalid credentials) or 200 OK (if valid)
            # We use invalid password to avoid successful login logic overhead,
            # but throttling counts requests regardless of success.
            assert (
                response.status_code != status.HTTP_429_TOO_MANY_REQUESTS
            ), f"Request {i+1} was throttled"

        # Make 6th request (should be throttled)
        response = client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Request was throttled" in str(response.data)

    def test_register_throttling(self):
        """
        Verify that the register endpoint is throttled.
        """
        client = APIClient()
        url = reverse("auth:register")
        data = {
            "email": "newuser@test.com",
            "username": "newuser",
            "password": "StrongPassword123!@#",
            "password_confirm": "StrongPassword123!@#",
            "display_name": "New User",
        }

        # Make 5 requests
        for i in range(5):
            # We vary the email to avoid unique constraint errors if
            # registration succeeds. But here we just want to hit the endpoint.
            # If registration succeeds, it's 201. If fails validation, 400.
            # Throttling applies to IP/User scope.
            data["email"] = f"newuser{i}@test.com"
            data["username"] = f"newuser{i}"
            response = client.post(url, data)
            assert (
                response.status_code != status.HTTP_429_TOO_MANY_REQUESTS
            ), f"Request {i+1} was throttled"

        # 6th request
        data["email"] = "newuser_blocked@test.com"
        response = client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
