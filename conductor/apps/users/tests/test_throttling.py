import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
def test_login_throttling(api_client, user_factory):
    # Create a user to login with
    email = "test_throttle@example.com"
    password = "StrongPassword123!"
    user_factory(email=email, password=password, display_name="Test User")

    url = reverse('auth:login')
    data = {
        'email': email,
        'password': password
    }

    # Send 10 requests.
    # Without throttling, all should be 200.
    # With throttling (limit 5/min), the 6th+ should be 429.

    responses = []
    for _ in range(10):
        response = api_client.post(url, data, format='json')
        responses.append(response.status_code)

    # With throttling, we expect at least one 429 response
    assert status.HTTP_429_TOO_MANY_REQUESTS in responses
