import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.users.models import User

@pytest.mark.django_db
class TestAuthThrottling:
    def setup_method(self):
        self.client = APIClient()
        self.user_data = {
            "email": "throttle@example.com",
            "password": "Password123!",
            "display_name": "ThrottleUser"
        }
        self.user = User.objects.create_user(**self.user_data)
        self.login_url = reverse("auth:login")

    def test_login_throttling(self):
        """
        Test that login endpoint is throttled after multiple attempts.
        """
        # We expect a limit of 5/min.
        # Making 6 requests should trigger throttling on the 6th.

        # 5 successful or failed attempts
        for _ in range(5):
            response = self.client.post(self.login_url, {
                "email": self.user_data["email"],
                "password": "WrongPassword"
            })
            assert response.status_code == status.HTTP_400_BAD_REQUEST or response.status_code == status.HTTP_401_UNAUTHORIZED

        # 6th attempt should be throttled
        response = self.client.post(self.login_url, {
            "email": self.user_data["email"],
            "password": "WrongPassword"
        })

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
