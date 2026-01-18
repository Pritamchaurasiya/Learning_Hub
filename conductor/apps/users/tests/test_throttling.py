import pytest
from django.urls import reverse
from rest_framework import status
from django.core.cache import cache

@pytest.mark.django_db
class TestAuthThrottling:

    def setup_method(self):
        cache.clear()

    def test_login_throttling(self, api_client, user_factory):
        """
        Verify that login attempts are throttled.
        """
        password = "StrongPassword123!@#"
        email = "throttle@test.com"
        user_factory(email=email, password=password)

        url = reverse("auth:login")
        data = {"email": email, "password": password}

        # First 5 requests should succeed (assuming 5/m limit)
        for i in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_200_OK, f"Request {i+1} failed with {response.status_code}"

        # 6th request should be throttled
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS, "Request 6 should be throttled"
