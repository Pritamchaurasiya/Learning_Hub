import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
def test_login_throttling(api_client, user_factory):
    """
    Verify that rate limiting is applied to login.
    After 5 requests, the 6th should return 429 Too Many Requests.
    """
    # Create user
    password = "StrongPassword123!@#"
    user_factory(email="login_throttle@test.com", password=password)

    url = reverse("auth:login")
    data = {"email": "login_throttle@test.com", "password": "wrong_password"}

    # Send 5 requests - should be 400 Bad Request (invalid credentials)
    for i in range(5):
        response = api_client.post(url, data)
        assert (
            response.status_code == status.HTTP_400_BAD_REQUEST
        ), f"Request {i+1} failed with {response.status_code}"

    # 6th request should be throttled
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
