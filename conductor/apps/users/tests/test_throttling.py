import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestAuthenticationThrottling:
    def test_login_throttling(self):
        client = APIClient()
        user = User.objects.create_user(
            email="test@example.com",
            password="strong_password_123",
            display_name="Test User"
        )
        url = "/api/v1/auth/login/"
        data = {
            "email": "test@example.com",
            "password": "wrong_password"
        }

        # Attempt to login multiple times
        # If throttling is 5/min, the 6th attempt should fail with 429
        responses = []
        for _ in range(10):
            response = client.post(url, data)
            responses.append(response.status_code)

        print(f"Responses: {responses}")

        # Check if any response was 429
        has_throttled = any(status_code == status.HTTP_429_TOO_MANY_REQUESTS for status_code in responses)

        # Verify that throttling occurred
        assert has_throttled, "Requests were not throttled as expected!"
