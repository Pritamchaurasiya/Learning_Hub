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
        password = "StrongPassword123!@#"
        user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": "wrong_password"}

        # Make 6 requests (assuming limit is 5/min)
        for _ in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_400_BAD_REQUEST

        # The 6th request should be throttled
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
