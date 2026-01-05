import pytest
from apps.notifications.models import Notification
from apps.users.models import User


@pytest.mark.django_db
class TestNotificationModels:

    @pytest.fixture
    def user(self):
        return User.objects.create_user(
            email="notif@test.com", username="notif", password="pass"
        )

    def test_create_notification(self, user):
        notif = Notification.objects.create(
            user=user, title="Welcome", message="Hello!", type=Notification.Type.SYSTEM
        )
        assert not notif.is_read
        assert str(notif) == "notif@test.com - Welcome"
