import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestAuthThrottling:
    """
    Tests for authentication rate limiting.
    """

    def test_login_throttling(self):
        """
        Verify that login endpoint is throttled after 5 attempts per minute.
        """
        client = APIClient()
        email = "throttle_test@example.com"
        password = "StrongPassword123!"
        User.objects.create_user(email=email, password=password)

        url = reverse("auth:login")
        data = {"email": email, "password": password}

        # First 5 requests should succeed
        for i in range(5):
            response = client.post(url, data, format="json")
            assert response.status_code == status.HTTP_200_OK, f"Request {i+1} failed"

        # 6th request should be throttled
        response = client.post(url, data, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        # Optional: check if detail contains 'throttled' or time
        # assert "throttled" in str(response.data.get("detail", "")).lower()
