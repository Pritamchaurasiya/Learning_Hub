"""Gamification business logic."""

from typing import Dict, Any, List
from apps.users.models import User
from .models import UserXP, Streak, UserBadge


class GamificationService:
    @staticmethod
    def get_user_stats(user: User) -> Dict[str, Any]:
        """Get or create complete gamification stats for a user."""
        xp, _ = UserXP.objects.get_or_create(user=user)
        streak, _ = Streak.objects.get_or_create(user=user)
        badges = UserBadge.objects.filter(user=user).select_related("badge")

        return {"xp": xp, "streak": streak, "badges": badges}

    @staticmethod
    def get_leaderboard(limit: int = 20) -> List[Dict[str, Any]]:
        """Get top users by XP."""
        top_users = UserXP.objects.order_by("-total_xp")[:limit].select_related("user")

        return [
            {
                "rank": i + 1,
                "username": xp.user.username,
                "display_name": xp.user.display_name,  # type: ignore
                "total_xp": xp.total_xp,
                "level": xp.level,
            }
            for i, xp in enumerate(top_users)
        ]
