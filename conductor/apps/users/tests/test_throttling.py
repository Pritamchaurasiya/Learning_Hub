import pytest
from django.urls import reverse
from rest_framework import status
from django.core.cache import cache

@pytest.mark.django_db
class TestAuthThrottling:

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        cache.clear()

    def test_login_rate_limit(self, api_client, user_factory):
        password = "StrongPassword123!@#"
        user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": password}

        # First 5 requests should succeed
        for _ in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_200_OK

        # 6th request should fail
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
