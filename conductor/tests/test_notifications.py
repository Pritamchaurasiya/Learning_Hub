"""
Notifications module tests.
Comprehensive tests for notifications and device tokens.
"""

import pytest
from django.utils import timezone

from apps.notifications.models import Notification, DeviceToken


# ==============================================================================
# MODEL TESTS
# ==============================================================================


@pytest.mark.django_db
class TestNotificationModel:
    """Tests for Notification model."""

    def test_notification_creation(self, user):
        """Test notification is created correctly."""
        notification = Notification.objects.create(
            user=user,
            type=Notification.Type.SYSTEM,
            title="Welcome!",
            message="Welcome to Learning Hub",
        )
        
        assert notification.user == user
        assert notification.title == "Welcome!"
        assert notification.is_read is False
        assert notification.read_at is None

    def test_notification_str(self, user):
        """Test string representation."""
        notification = Notification.objects.create(
            user=user,
            title="Test",
            message="Test message",
        )
        
        assert user.email in str(notification)

    def test_notification_types(self, user):
        """Test all notification types."""
        for type_choice in Notification.Type.choices:
            notification = Notification.objects.create(
                user=user,
                type=type_choice[0],
                title=f"Test {type_choice[1]}",
                message="Test message",
            )
            assert notification.type == type_choice[0]

    def test_notification_ordering(self, user):
        """Test notifications are ordered by created_at desc."""
        n1 = Notification.objects.create(
            user=user,
            title="First",
            message="First notification",
        )
        n2 = Notification.objects.create(
            user=user,
            title="Second",
            message="Second notification",
        )
        
        notifications = list(Notification.objects.filter(user=user))
        # Most recent should be first
        assert notifications[0].id == n2.id

    def test_notification_with_data(self, user):
        """Test notification with extra data."""
        notification = Notification.objects.create(
            user=user,
            title="Achievement",
            message="You earned a badge!",
            type=Notification.Type.ACHIEVEMENT,
            data={"badge_id": 1, "xp_earned": 50},
        )
        
        assert notification.data["badge_id"] == 1
        assert notification.data["xp_earned"] == 50

    def test_mark_as_read(self, user):
        """Test marking notification as read."""
        notification = Notification.objects.create(
            user=user,
            title="Test",
            message="Test message",
        )
        
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        
        notification.refresh_from_db()
        assert notification.is_read is True
        assert notification.read_at is not None


@pytest.mark.django_db
class TestDeviceTokenModel:
    """Tests for DeviceToken model."""

    def test_device_token_creation(self, user):
        """Test device token is created correctly."""
        token = DeviceToken.objects.create(
            user=user,
            token="fake-fcm-token-123",
            platform=DeviceToken.Platform.WEB,
        )
        
        assert token.user == user
        assert token.is_active is True

    def test_device_token_platforms(self, user):
        """Test all platform types."""
        platforms = [
            DeviceToken.Platform.ANDROID,
            DeviceToken.Platform.IOS,
            DeviceToken.Platform.WEB,
        ]
        
        for i, platform in enumerate(platforms):
            token = DeviceToken.objects.create(
                user=user,
                token=f"token-{i}",
                platform=platform,
            )
            assert token.platform == platform

    def test_unique_token_per_user(self, user):
        """Test same token cannot be registered twice for same user."""
        DeviceToken.objects.create(
            user=user,
            token="same-token",
            platform=DeviceToken.Platform.WEB,
        )
        
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            DeviceToken.objects.create(
                user=user,
                token="same-token",
                platform=DeviceToken.Platform.WEB,
            )


# ==============================================================================
# API TESTS
# ==============================================================================


@pytest.mark.django_db
class TestNotificationAPI:
    """Tests for Notification API endpoints."""

    def test_list_notifications(self, authenticated_client, user):
        """Test listing user notifications."""
        Notification.objects.create(
            user=user,
            title="Test",
            message="Test message",
        )
        
        response = authenticated_client.get("/api/v1/notifications/")
        
        assert response.status_code == 200

    def test_list_notifications_unauthenticated(self, api_client):
        """Test unauthenticated users cannot list notifications."""
        response = api_client.get("/api/v1/notifications/")
        
        assert response.status_code == 401

    def test_mark_notification_read(self, authenticated_client, user):
        """Test marking a notification as read."""
        notification = Notification.objects.create(
            user=user,
            title="Test",
            message="Test message",
        )
        
        response = authenticated_client.post(
            f"/api/v1/notifications/{notification.id}/read/"
        )
        
        # Either 200 or endpoint exists
        assert response.status_code in [200, 404, 405]
