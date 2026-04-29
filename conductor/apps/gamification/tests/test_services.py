import pytest
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta
from apps.gamification.models import UserXP, Streak
from apps.gamification.services import GamificationService
import hashlib

@pytest.mark.django_db
class TestGamificationService:

    def test_award_xp_basic(self, test_user):
        """Test basic XP awarding and leveling up."""
        result = GamificationService.award_xp(test_user, 50, reason="test_reason")
        
        assert result['awarded'] == 50
        assert result['leveled_up'] is False
        
        xp_obj = UserXP.objects.get(user=test_user)
        assert xp_obj.total_xp == 50
        assert xp_obj.level == 1
        
        # Award more to trigger level up (100 XP per level)
        result_2 = GamificationService.award_xp(test_user, 60, reason="test_reason_2")
        assert result_2['awarded'] == 60
        assert result_2['leveled_up'] is True
        
        xp_obj.refresh_from_db()
        assert xp_obj.total_xp == 110
        assert xp_obj.level == 2

    @patch('apps.gamification.services.cache.get')
    @patch('apps.gamification.services.cache.set')
    def test_award_xp_anti_cheat(self, mock_cache_set, mock_cache_get, test_user):
        """Test that anti-cheat prevents rapid XP farming for the same action."""
        reason = "lesson_complete"
        
        # Mock cache to return True, meaning the anti-cheat flag is already set
        mock_cache_get.return_value = True
        
        result = GamificationService.award_xp(test_user, 50, reason=reason)
        
        assert result['blocked'] is True
        assert result['awarded'] == 0
        
        # Ensure nothing was written to DB
        assert UserXP.objects.filter(user=test_user).exists() is False

    def test_update_streak_active(self, test_user):
        """Test streak incrementation on consecutive days."""
        # Initial streak setup (pretend yesterday was active)
        yesterday = timezone.now() - timedelta(days=1)
        streak = Streak.objects.create(
            user=test_user,
            current_streak=5,
            longest_streak=5,
            last_activity_date=yesterday.date()
        )
        
        # Update streak for today
        GamificationService.check_streaks(test_user)
        
        streak.refresh_from_db()
        assert streak.current_streak == 6
        assert streak.longest_streak == 6
        assert streak.last_activity_date == timezone.now().date()

    def test_update_streak_broken(self, test_user):
        """Test streak resets if more than 24 hours pass."""
        two_days_ago = timezone.now() - timedelta(days=2)
        streak = Streak.objects.create(
            user=test_user,
            current_streak=5,
            longest_streak=5,
            last_activity_date=two_days_ago.date()
        )
        
        GamificationService.check_streaks(test_user)
        
        streak.refresh_from_db()
        assert streak.current_streak == 1  # Reset to 1 for today's activity
        assert streak.longest_streak == 5  # Preserved
        assert streak.last_activity_date == timezone.now().date()
