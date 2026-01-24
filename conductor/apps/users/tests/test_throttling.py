import pytest
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class ThrottlingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='StrongPassword123!',
            display_name='Test User'
        )
        self.login_url = reverse('auth:login')

    def test_login_throttling(self):
        """
        Ensure login endpoint is throttled after 5 attempts.
        """
        data = {
            'email': 'test@example.com',
            'password': 'WrongPassword'
        }

        # Make 5 failed attempts
        for _ in range(5):
            response = self.client.post(self.login_url, data)
            # Should be 401 Unauthorized (because password is wrong) or 400 Bad Request
            # We don't care about success here, just that it's NOT throttled yet
            self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # Make the 6th attempt
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
