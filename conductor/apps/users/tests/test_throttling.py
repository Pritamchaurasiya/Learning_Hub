import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from apps.users.models import User
from django.core.cache import cache

@pytest.mark.django_db
class TestThrottling:
    def test_login_throttling(self):
        # Clear cache to reset throttle counters
        cache.clear()

        client = APIClient()
        url = reverse('auth:login')
        data = {
            'email': 'test@example.com',
            'password': 'password123'
        }

        # User doesn't need to exist for throttling to trigger on invalid attempts
        User.objects.create_user(email='test@example.com', password='password123', display_name='testuser')

        # Try to spam the endpoint
        # With "5/m" limit, we expect the 6th attempt to fail

        for i in range(5):
            response = client.post(url, data)
            # The first 5 should not be 429
            # They might be 200 (if login successful) or 400 (if invalid data)
            # But we are testing throttling, so as long as it's not 429, it's "allowed"
            assert response.status_code != 429, f"Request {i+1} was throttled unexpectedly"

        # The 6th attempt should be throttled
        response = client.post(url, data)
        assert response.status_code == 429
