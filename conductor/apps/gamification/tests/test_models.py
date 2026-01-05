import pytest
from apps.gamification.models import UserXP, Streak
from typing import cast
from apps.users.models import User
from django.utils import timezone


@pytest.fixture
def user() -> User:
    return cast(
        User,
        User.objects.create_user(
            email="gamer@test.com", username="gamer", password="password123"
        ),
    )


@pytest.mark.django_db
class TestGamificationModels:

    def test_xp_addition(self, user: User) -> None:
        xp = UserXP.objects.create(user=user)
        xp.add_xp(500)
        assert xp.total_xp == 500
        # God Mode Scaling: (500/100)^(1/1.5) approx 2.9 -> Level 2
        assert xp.level == 2

        xp.add_xp(600)  # Total 1100
        assert xp.total_xp == 1100
        # God Mode Scaling: (1100/100)^(1/1.5) approx 4.9 -> Level 4
        assert xp.level == 4

    def test_streak_update(self, user: User) -> None:
        streak = Streak.objects.create(user=user)
        assert streak.current_streak == 0

        streak.update_streak()
        assert streak.current_streak == 1
        assert streak.last_activity_date == timezone.now().date()
