import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from apps.users.models import User

@pytest.mark.django_db
def test_login_throttling(db):
    """
    Test that the login endpoint is throttled after 5 attempts per minute.
    """
    client = APIClient()
    # Create a user to try logging in with (though we can fail auth too)
    user = User.objects.create_user(email="throttle@example.com", password="StrongPassword123!")

    url = reverse('auth:login')
    data = {
        "email": "throttle@example.com",
        "password": "WrongPassword"
    }

    # Make 5 requests - should all be allowed (either 200 or 400)
    for i in range(5):
        response = client.post(url, data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST], \
            f"Request {i+1} failed with status {response.status_code}"

    # The 6th request should be throttled
    response = client.post(url, data)
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS, \
        f"Request 6 should be throttled but got {response.status_code}"
