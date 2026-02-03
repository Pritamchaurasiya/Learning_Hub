import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestAuthThrottling:

    def test_login_throttling(self, api_client, user_factory):
        password = "StrongPassword123!@#"
        user_factory(email="throttle@test.com", password=password)

        url = reverse("auth:login")
        data = {"email": "throttle@test.com", "password": password}

        # First 5 attempts should be allowed
        for i in range(5):
            response = api_client.post(url, data)
            assert response.status_code != status.HTTP_429_TOO_MANY_REQUESTS

        # 6th attempt should fail with 429 Too Many Requests
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
