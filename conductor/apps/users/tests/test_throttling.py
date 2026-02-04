import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestAuthThrottling:

    def test_login_throttling(self, api_client, user_factory):
        """
        Verify that login endpoint is throttled after 5 requests per minute.
        """
        password = "StrongPassword123!@#"
        user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        # Use wrong password to trigger 400s (still counts towards throttle)
        data = {"email": "throttle@test.com", "password": "wrong_password"}

        # Make 5 requests (should be allowed)
        for i in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_400_BAD_REQUEST, (
                f"Request {i+1} failed with status {response.status_code}"
            )

        # Make 6th request (should be throttled)
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS, (
            "Request 6 should be throttled"
        )
