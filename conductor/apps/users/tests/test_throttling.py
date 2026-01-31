import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestThrottling:

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        cache.clear()

    def test_login_rate_limiting(self, api_client, user_factory):
        """
        Verifies that rate limiting is applied to login endpoint.
        We expect 5 successful logins, then 429 Too Many Requests.
        """
        password = "StrongPassword123!"
        user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": password}

        # Attempt to login 10 times
        for i in range(10):
            response = api_client.post(url, data)

            if i < 5:
                assert response.status_code == status.HTTP_200_OK, (
                    f"Request {i+1} should succeed but got {response.status_code}"
                )
            else:
                assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS, (
                    f"Request {i+1} should be throttled but got {response.status_code}"
                )
