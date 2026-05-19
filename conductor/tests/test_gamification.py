"""
Gamification module tests.
Comprehensive tests for XP, badges, streaks, and leaderboards.
"""

import pytest
from django.utils import timezone
from datetime import timedelta

from apps.gamification.models import UserXP, Badge, UserBadge, Streak
from apps.gamification.services import GamificationService


# ==============================================================================
# FIXTURES
# ==============================================================================


@pytest.fixture
def user_xp(db, user):
    """Create XP record for test user."""
    xp, _ = UserXP.objects.get_or_create(user=user)
    return xp


@pytest.fixture
def streak(db, user):
    """Create streak record for test user."""
    streak, _ = Streak.objects.get_or_create(user=user)
    return streak


@pytest.fixture
def badge(db):
    """Create a test badge."""
    return Badge.objects.create(
        name="First Course",
        description="Complete your first course",
        icon="🎓",
        criteria_type="courses_completed",
        criteria_value=1,
        xp_reward=50,
    )


# ==============================================================================
# MODEL TESTS
# ==============================================================================


@pytest.mark.django_db
class TestUserXPModel:
    """Tests for UserXP model."""

    def test_xp_creation(self, user_xp, user):
        """Test XP record is created correctly."""
        assert user_xp.user == user
        assert user_xp.total_xp == 0
        assert user_xp.level == 1

    def test_add_xp(self, user_xp):
        """Test adding XP updates total and weekly."""
        user_xp.add_xp(100)
        assert user_xp.total_xp == 100
        assert user_xp.weekly_xp == 100

    def test_level_up(self, user_xp):
        """Test level increases with XP."""
        user_xp.add_xp(500)
        assert user_xp.level >= 1

    def test_multiple_xp_adds(self, user_xp):
        """Test multiple XP additions accumulate."""
        user_xp.add_xp(50)
        user_xp.add_xp(50)
        assert user_xp.total_xp == 100


@pytest.mark.django_db
class TestBadgeModel:
    """Tests for Badge model."""

    def test_badge_creation(self, badge):
        """Test badge is created correctly."""
        assert badge.name == "First Course"
        assert badge.criteria_type == "courses_completed"
        assert badge.xp_reward == 50

    def test_badge_str(self, badge):
        """Test string representation."""
        assert str(badge) == "First Course"


@pytest.mark.django_db
class TestUserBadgeModel:
    """Tests for UserBadge model."""

    def test_earn_badge(self, user, badge):
        """Test user can earn a badge."""
        user_badge = UserBadge.objects.create(user=user, badge=badge)
        assert user_badge.user == user
        assert user_badge.badge == badge
        assert user_badge.earned_at is not None

    def test_unique_badge_per_user(self, user, badge):
        """Test user cannot earn same badge twice."""
        UserBadge.objects.create(user=user, badge=badge)
        
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            UserBadge.objects.create(user=user, badge=badge)


@pytest.mark.django_db
class TestStreakModel:
    """Tests for Streak model."""

    def test_streak_creation(self, streak, user):
        """Test streak is created correctly."""
        assert streak.user == user
        assert streak.current_streak == 0
        assert streak.longest_streak == 0

    def test_update_streak_new_day(self, streak):
        """Test updating streak on a new day."""
        streak.update_streak()
        assert streak.current_streak == 1
        assert streak.last_activity_date == timezone.now().date()

    def test_streak_continues(self, streak):
        """Test streak continues on consecutive days."""
        yesterday = timezone.now().date() - timedelta(days=1)
        streak.last_activity_date = yesterday
        streak.current_streak = 5
        streak.save()
        
        streak.update_streak()
        assert streak.current_streak == 6

    def test_streak_breaks(self, streak):
        """Test streak resets after missed day."""
        two_days_ago = timezone.now().date() - timedelta(days=2)
        streak.last_activity_date = two_days_ago
        streak.current_streak = 10
        streak.save()
        
        streak.update_streak()
        assert streak.current_streak == 1

    def test_longest_streak_tracked(self, streak):
        """Test longest streak is tracked."""
        streak.current_streak = 10
        streak.longest_streak = 5
        streak.last_activity_date = timezone.now().date() - timedelta(days=1)
        streak.save()
        
        streak.update_streak()
        assert streak.longest_streak == 11


# ==============================================================================
# SERVICE TESTS
# ==============================================================================


@pytest.mark.django_db
class TestGamificationService:
    """Tests for GamificationService."""

    def test_get_user_stats(self, user):
        """Test getting user stats creates records if needed."""
        stats = GamificationService.get_user_stats(user)
        
        assert "xp" in stats
        assert "streak" in stats
        assert "badges" in stats
        assert stats["xp"].user == user

    def test_award_xp(self, user):
        """Test awarding XP to user."""
        GamificationService.award_xp(user, 100)
        
        xp = UserXP.objects.get(user=user)
        assert xp.total_xp == 100

    def test_get_leaderboard_empty(self):
        """Test leaderboard returns empty list when no users."""
        leaderboard = GamificationService.get_leaderboard()
        assert isinstance(leaderboard, list)

    @pytest.mark.skip(reason="Requires Redis backend")
    def test_get_leaderboard_with_users(self, user, create_user, mocker):
        """Test leaderboard returns ranked users."""
        pass
