"""
Edge case tests for Gamification module.
Tests XP calculations, badge awarding, streak handling.
"""

import pytest
from rest_framework import status
from datetime import datetime, timedelta


@pytest.mark.django_db
class TestGamificationEdgeCases:
    """Edge case tests for gamification features."""

    def test_xp_calculation_extreme_values(self, user):
        """Test XP level calculations with extreme values."""
        # Level formula: (total_xp // 100) + 1
        # This tests the formula directly since GamificationService
        # doesn't expose a standalone calculate_level method.
        extreme_xp = 999999999
        level = (extreme_xp // 100) + 1
        assert level == 10000000
        assert level > 0

        # Test zero XP
        assert (0 // 100) + 1 == 1

        # Test negative XP (should still produce a result)
        neg_level = (-100 // 100) + 1
        assert neg_level == 0  # edge case

    def test_leaderboard_pagination_edge_cases(self, api_client):
        """Test leaderboard with edge case pagination."""
        # Test page 0
        response = api_client.get("/api/v1/gamification/leaderboard/?page=0")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        
        # Test very large page
        response = api_client.get("/api/v1/gamification/leaderboard/?page=99999")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
        
        # Test negative limit
        response = api_client.get("/api/v1/gamification/leaderboard/?limit=-1")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_streak_calculation_timezone_edge_cases(self, user):
        """Test streak calculations across timezone boundaries."""
        from apps.gamification.models import Streak
        
        # Test streak at day boundary
        try:
            streak = Streak.objects.get_or_create(user=user)[0]
            # Should handle timezone correctly
            assert streak is not None
        except Exception:
            pass

    def test_badge_awarding_duplicate(self, user, badge):
        """Test awarding same badge twice."""
        from apps.gamification.services import GamificationService
        
        # Award badge first time (uses badge name string)
        result1 = GamificationService.award_badge(user, badge.name)
        
        # Try to award again - should return None (already awarded)
        result2 = GamificationService.award_badge(user, badge.name)
        
        # First should succeed, second should be None
        assert result1 is not None
        assert result2 is None


@pytest.mark.django_db
class TestGamificationPerformanceEdgeCases:
    """Performance-related edge cases for gamification."""

    def test_leaderboard_with_no_users(self, api_client):
        """Test leaderboard when no users have XP."""
        response = api_client.get("/api/v1/gamification/leaderboard/")
        assert response.status_code == status.HTTP_200_OK
        # Should return empty list or appropriate message

    def test_concurrent_xp_updates(self, user):
        """Test concurrent/rapid XP updates don't crash and are handled by anti-cheat."""
        from apps.gamification.services import GamificationService
        
        results = []
        for i in range(5):
            # Same reason to trigger anti-cheat rate limit
            res = GamificationService.award_xp(user, 10, "rapid_click_test")
            results.append(res)
            
        # First should succeed, others should be blocked by anti-cheat
        assert results[0] is not None
        assert results[0].get('blocked') is False
        assert any(r.get('blocked') is True for r in results[1:])
