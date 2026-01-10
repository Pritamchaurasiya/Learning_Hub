import pytest
from django.urls import reverse
from rest_framework import status
from django.core.cache import cache

@pytest.mark.django_db
def test_login_throttling(api_client, user_factory):
    # Ensure cache is clear
    cache.clear()

    password = "StrongPassword123!@#"
    user = user_factory(email="throttle@test.com", password=password)
    url = reverse("auth:login")
    data = {"email": "throttle@test.com", "password": "wrong_password"}

    # Attempt to login 10 times (assuming limit is 5/min)
    got_429 = False
    for i in range(10):
        response = api_client.post(url, data)
        if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            got_429 = True
            break

    # Assert that we eventually got a 429
    assert got_429, "Expected 429 Too Many Requests, but never received it."
