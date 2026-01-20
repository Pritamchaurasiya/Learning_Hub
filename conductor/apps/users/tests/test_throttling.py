import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core.cache import cache


User = get_user_model()


@pytest.mark.django_db
class TestLoginThrottling:
    def setup_method(self):
        self.client = APIClient()
        self.login_url = reverse('auth:login')
        self.user_data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'StrongPassword123!',
            'display_name': 'Test User'
        }
        self.user = User.objects.create_user(**self.user_data)
        self.login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        # Clear cache to reset throttling counters
        cache.clear()

    def test_login_rate_limiting(self):
        """
        Test that login endpoint is rate limited to 5 requests per minute.
        """
        # Make 5 allowed requests
        for i in range(5):
            response = self.client.post(self.login_url, self.login_data)
            assert response.status_code == status.HTTP_200_OK, f"Request {i+1} failed"

        # The 6th request should be blocked
        response = self.client.post(self.login_url, self.login_data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS, (
            "Rate limit not enforced"
        )
