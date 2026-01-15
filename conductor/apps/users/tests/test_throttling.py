import pytest
from django.urls import reverse
from rest_framework import status
from django.core.cache import cache

@pytest.mark.django_db
class TestAuthThrottling:

    def setup_method(self):
        cache.clear()

    def teardown_method(self):
        cache.clear()

    def test_login_throttling(self, api_client, user_factory):
        # Create a user
        password = "StrongPassword123!"
        user_factory(email="throttle@test.com", password=password)
        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": password}

        # Make 5 allowed requests
        for _ in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_200_OK

        # The 6th request should be throttled
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_register_throttling(self, api_client):
        url = reverse("auth:register")

        # Make 5 allowed requests
        for i in range(5):
            data = {
                "email": f"newuser{i}@test.com",
                "username": f"newuser{i}",
                "password": "StrongPassword123!",
                "password_confirm": "StrongPassword123!",
                "display_name": "New User"
            }
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_201_CREATED

        # 6th request
        data = {
            "email": "blocked@test.com",
            "username": "blocked",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "display_name": "New User"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
