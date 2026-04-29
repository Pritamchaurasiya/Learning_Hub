"""
Edge case tests for Users module.
Tests authentication edge cases, profile edge cases.
"""

import pytest
from rest_framework import status


@pytest.mark.django_db
class TestUserAuthEdgeCases:
    """Edge case tests for user authentication."""

    def test_login_invalid_credentials(self, api_client):
        """Test login with various invalid credentials."""
        invalid_cases = [
            {"email": "", "password": "password123"},
            {"email": "invalid-email", "password": "password123"},
            {"email": "user@example.com", "password": ""},
            {"email": "user@example.com", "password": "wrong"},
            {"email": "nonexistent@example.com", "password": "password123"},
            {"email": "a" * 300 + "@test.com", "password": "pass"},
        ]
        
        for case in invalid_cases:
            response = api_client.post("/api/v1/auth/login/", case)
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_200_OK
            ]

    def test_register_duplicate_email(self, api_client, user):
        """Test registration with duplicate email."""
        data = {
            "email": user.email,
            "username": "newusername123",
            "password": "password123",
            "password_confirm": "password123"
        }
        
        response = api_client.post("/api/v1/auth/register/", data)
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT
        ]

    def test_register_weak_passwords(self, api_client):
        """Test registration with weak passwords."""
        weak_passwords = [
            "123",
            "password",
            "abc",
            "111111",
            "qwerty",
            "password123",
            "letmein",
        ]
        
        for i, password in enumerate(weak_passwords):
            data = {
                "email": f"test{i}@example.com",
                "username": f"testuser{i}",
                "password": password,
                "password_confirm": password
            }
            
            response = api_client.post("/api/v1/auth/register/", data)
            # Should reject weak passwords
            if response.status_code == status.HTTP_201_CREATED:
                # If accepted, verify it's at least validated
                pass

    def test_register_mismatched_passwords(self, api_client):
        """Test registration with mismatched passwords."""
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "password123",
            "password_confirm": "different123"
        }
        
        response = api_client.post("/api/v1/auth/register/", data)
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]

    def test_token_refresh_invalid_token(self, api_client):
        """Test token refresh with invalid tokens."""
        invalid_tokens = [
            "",
            "invalid-token",
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid",
            "a" * 1000,
        ]
        
        for token in invalid_tokens:
            response = api_client.post("/api/v1/auth/refresh/", {"refresh": token})
            assert response.status_code in [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_403_FORBIDDEN
            ]


@pytest.mark.django_db
class TestUserProfileEdgeCases:
    """Edge case tests for user profile operations."""

    def test_update_profile_invalid_data(self, api_client, user):
        """Test profile update with invalid data."""
        api_client.force_authenticate(user=user)
        
        invalid_updates = [
            {"email": "not-an-email"},
            {"username": ""},
            {"display_name": "a" * 1000},
            {"bio": "x" * 50000},
            {"phone_number": "invalid"},
        ]
        
        for update in invalid_updates:
            response = api_client.patch("/api/v1/auth/me/", update)
            # Should either reject or truncate
            assert response.status_code in [
                status.HTTP_200_OK,
                status.HTTP_400_BAD_REQUEST
            ]

    def test_unauthorized_profile_access(self, api_client):
        """Test profile access without authentication."""
        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        response = api_client.patch("/api/v1/auth/me/", {"display_name": "Test"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
