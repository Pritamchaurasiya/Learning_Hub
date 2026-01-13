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
        password = "StrongPassword123!@#"
        user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": "wrong_password"}

        # Make 5 requests
        for _ in range(5):
            response = api_client.post(url, data)
            # Expect 400 because password is wrong
            assert response.status_code == status.HTTP_400_BAD_REQUEST

        # 6th request should be throttled
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_register_throttling(self, api_client):
        url = reverse("auth:register")
        # Invalid data to fail validation but hit the throttle
        data = {}

        # Make 5 requests
        for _ in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_400_BAD_REQUEST

        # 6th request should be throttled
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
