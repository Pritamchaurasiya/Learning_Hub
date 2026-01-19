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
        """
        Verify that the login endpoint is throttled after 5 attempts.
        """
        password = "StrongPassword123!@#"
        user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        # sending invalid credentials to avoid token generation overhead,
        # though throttling happens before validation usually.
        data = {"email": "throttle@test.com", "password": "wrong_password"}

        # Limit is 5/min.
        for i in range(5):
            response = api_client.post(url, data)
            assert response.status_code != status.HTTP_429_TOO_MANY_REQUESTS, f"Request {i+1} was throttled unexpectedly"

        # The 6th request should fail with 429
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
