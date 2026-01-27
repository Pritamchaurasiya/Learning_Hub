import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestAuthThrottling:

    def test_login_throttling(self, api_client, user_factory):
        password = "StrongPassword123!"
        user = user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": password}

        # Make 5 requests (allowed)
        for i in range(5):
            response = api_client.post(url, data)
            assert response.status_code == status.HTTP_200_OK, f"Request {i+1} failed with {response.status_code}"

        # Make 6th request (should be throttled)
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
