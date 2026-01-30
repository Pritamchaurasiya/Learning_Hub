import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestAuthThrottling:

    def test_login_throttling(self, api_client, user_factory):
        password = "StrongPassword123!@#"
        user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": password}

        # First 5 attempts should succeed
        for i in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_200_OK, f"Attempt {i+1} failed with status {response.status_code}"

        # 6th attempt should be throttled
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS, \
            f"Expected 429, got {response.status_code}. Throttling not active."
