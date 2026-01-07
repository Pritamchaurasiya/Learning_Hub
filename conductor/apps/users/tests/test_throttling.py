import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from apps.users.models import User

@pytest.mark.django_db
class TestThrottling:

    def setup_method(self):
        cache.clear()

    def teardown_method(self):
        cache.clear()

    def test_login_throttling(self, api_client, user_factory):
        # Create user
        password = "StrongPassword123!@#"
        user = user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": password}

        # Make 5 successful login attempts (allowed)
        for _ in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_200_OK

        # The 6th attempt should be throttled
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_register_throttling(self, api_client):
        url = reverse("auth:register")

        # Make 5 successful registration attempts (allowed)
        for i in range(5):
            data = {
                "email": f"newuser{i}@test.com",
                "username": f"newuser{i}",
                "password": "StrongPassword123!@#",
                "password_confirm": "StrongPassword123!@#",
                "display_name": f"New User {i}"
            }
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_201_CREATED

        # The 6th attempt should be throttled
        data = {
            "email": "newuser_throttled@test.com",
            "username": "newuser_throttled",
            "password": "StrongPassword123!@#",
            "password_confirm": "StrongPassword123!@#",
            "display_name": "New User Throttled"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
