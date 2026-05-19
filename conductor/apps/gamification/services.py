from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from django.db.models import F, Sum, Count
from django.core.cache import cache
import logging

from .models import UserXP, UserBadge, Badge, Streak, Guild, GuildMembership

logger = logging.getLogger(__name__)


class GamificationService:
    """
    Enhanced Gamification Service with advanced features:
    - XP management with multipliers
    - Streak tracking with freeze protection
    - Badge awarding with progress tracking
    - Leaderboards (global, weekly, seasonal)
    - Guild competitions
    - Achievement system
    """
    
    LEADERBOARD_CACHE_KEY = "gamification_leaderboard"
    LEADERBOARD_CACHE_TIMEOUT = 300  # 5 minutes
    XP_MULTIPLIER_CACHE_KEY = "xp_multiplier_event"
    
    # XP Values for different activities
    XP_VALUES = {
        'lesson_complete': 50,
        'course_complete': 500,
        'quiz_perfect': 100,
        'quiz_pass': 50,
        'daily_login': 10,
        'streak_bonus': 25,  # Per day of streak
        'dsa_easy': 50,
        'dsa_medium': 100,
        'dsa_hard': 200,
        'challenge_complete': 150,
        'badge_earn': 50,
        'review_submit': 25,
        'discussion_reply': 15,
        'helpful_answer': 50,
    }
    
    @staticmethod
    def get_user_stats(user):
        """
        Get complete gamification stats for a user.
        Creates records if they don't exist and caches the result.
        """
        cache_key = f"gamification_user_stats_{user.id}"
        stats = cache.get(cache_key)
        
        if stats:
            return stats

        xp, _ = UserXP.objects.get_or_create(user=user)
        streak, _ = Streak.objects.get_or_create(user=user)
        badges = list(UserBadge.objects.filter(user=user).select_related('badge'))
        
        # Calculate user rank
        rank = GamificationService.get_user_rank(user)
        
        stats = {
            "xp": xp,
            "streak": streak,
            "badges": badges,
            "level": xp.level,
            "total_xp": xp.total_xp,
            "weekly_xp": xp.weekly_xp,
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak,
            "rank": rank,
            "badge_count": len(badges),
            "next_level_xp": (xp.level * 100) - (xp.total_xp % 100),
        }
        
        # Cache for 2 minutes to serve frequent Dashboard requests efficiently
        cache.set(cache_key, stats, timeout=120)
        return stats
    
    @classmethod
    def award_xp(cls, user, amount, reason="Activity"):
        """
        Award XP to a user with multiplier support and level-up logic.
        Updates Redis Leaderboard and triggers Async Achievement check.
        Uses pessimistic database locking to prevent concurrent race conditions.
        Includes Redis-backed Anti-Cheat Rate Limiting.
        """
        # Anti-Cheat Rate Limiter (Redis-backed window)
        # Prevents users from scripting an endpoint to farm XP rapidly
        import hashlib
        action_hash = hashlib.md5(reason.encode('utf-8')).hexdigest()
        anti_cheat_key = f"anti_cheat_xp_{user.id}_{action_hash}"
        
        # Lock this specific action for 15 seconds to prevent spamming
        # Use atomic cache.add to prevent race conditions where concurrent requests both pass get()
        if not cache.add(anti_cheat_key, True, timeout=15):
            logger.warning("ANTI_CHEAT_BLOCKED: user=%s, reason=%s (Rate Limited)", user.id, reason)
            return {'xp': None, 'awarded': 0, 'multiplier': 1.0, 'leveled_up': False, 'blocked': True}

        from apps.gamification.leaderboard_service import LeaderboardService
        from apps.gamification.tasks import check_achievements_task

        # Apply multiplier if active
        multiplier = cls.get_active_multiplier()
        final_amount = int(amount * multiplier)
        
        with transaction.atomic():
            # Acquire row-level lock
            xp, created = UserXP.objects.select_for_update().get_or_create(user=user)
            
            xp.total_xp += final_amount
            xp.weekly_xp += final_amount
            
            # Level Up Logic (100 XP per level)
            new_level = (xp.total_xp // 100) + 1
            leveled_up = False
            
            if new_level > xp.level:
                xp.level = new_level
                leveled_up = True
            
            xp.save()

        if leveled_up:
            # Broadcast level up event
            cls._broadcast_gamification_event(user, "level_up", {
                "new_level": new_level,
                "message": f"{user.username} reached Level {new_level}!"
            })
            
            # Check for level-based badges
            cls._check_level_badges(user, new_level)
            
        # Update guild contribution if member
        cls._update_guild_contribution(user, final_amount)
        
        # 1. Update Redis Leaderboards (Real-time, O(log N))
        LeaderboardService.update_score(user.id, xp.total_xp, period="all")
        LeaderboardService.update_score(user.id, xp.weekly_xp, period="weekly")
        
        # 2. Trigger Async Achievement Check (Offload heavy logic)
        check_achievements_task.delay(user.id)
        
        # Log the XP award
        logger.info("XP_AWARD: user=%s, amount=%d, multiplier=%.1f, reason=%s", user.id, final_amount, multiplier, reason)
        
        # Invalidate the user stats cache since XP just changed
        cache.delete(f"gamification_user_stats_{user.id}")
        
        return {
            'xp': xp,
            'awarded': final_amount,
            'multiplier': multiplier,
            'leveled_up': leveled_up,
            'new_level': new_level if leveled_up else None,
            'blocked': False
        }

    @classmethod
    def get_active_multiplier(cls) -> float:
        """
        Get the currently active XP multiplier from cache.
        Returns 1.0 if no event multiplier is active.
        """
        multiplier = cache.get(cls.XP_MULTIPLIER_CACHE_KEY)
        if multiplier is not None:
            try:
                return float(multiplier)
            except (ValueError, TypeError):
                return 1.0
        return 1.0

    @classmethod
    def set_xp_multiplier(cls, multiplier: float, duration_hours: int = 24):
        """
        Set a temporary XP multiplier event (e.g., 2x XP weekend).
        
        Args:
            multiplier: The XP multiplier value (e.g., 2.0 for double XP).
            duration_hours: How long the multiplier should last.
        """
        timeout = duration_hours * 3600
        cache.set(cls.XP_MULTIPLIER_CACHE_KEY, multiplier, timeout=timeout)
        logger.info(
            "XP_MULTIPLIER_SET: multiplier=%.1f, duration=%dh",
            multiplier, duration_hours
        )

    @classmethod
    def check_streaks(cls, user):
        """
        Check and update user's learning streak.
        Awards bonus XP for streak milestones and broadcasts events.
        Locked via transaction to prevent artificial prolongation from concurrent pings.
        """
        today = timezone.now().date()
        streak_bonus_triggered = False
        
        with transaction.atomic():
            streak, _ = Streak.objects.select_for_update().get_or_create(user=user)
            
            if streak.last_activity_date == today:
                # Already logged activity today
                return streak

            if streak.last_activity_date == today - timedelta(days=1):
                # Consecutive day — extend streak
                streak.current_streak += 1
            else:
                # Streak broken — reset
                streak.current_streak = 1

            # Update longest streak record
            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak

            streak.last_activity_date = today
            streak.save()
            
            if streak.current_streak > 0 and streak.current_streak % 7 == 0:
                streak_bonus_triggered = True

        # Award streak bonus XP every 7 days (Run outside the atomic DB lock)
        if streak_bonus_triggered:
            bonus = cls.XP_VALUES['streak_bonus'] * (streak.current_streak // 7)
            cls.award_xp(user, bonus, f"Streak Bonus ({streak.current_streak} days)")

            # Broadcast streak milestone to social feed
            cls._broadcast_gamification_event(user, "streak_milestone", {
                "current_streak": streak.current_streak,
                "message": (
                    f"{user.username} is on a {streak.current_streak}-day "
                    f"learning streak! 🔥"
                ),
            })

        # Invalidate stats cache
        cache.delete(f"gamification_user_stats_{user.id}")

        return streak

    @classmethod
    def award_badge(cls, user, badge_name: str):
        """
        Award a badge to a user if they don't already have it.
        Broadcasts a real-time 'badge_unlocked' event on success.
        Locked via transaction to ensure the badge is only inserted exactly once
        even during rapid polling event cascades.
        
        Returns:
            The UserBadge instance if newly awarded, None otherwise.
        """
        try:
            badge = Badge.objects.get(name=badge_name)
        except Badge.DoesNotExist:
            logger.warning("BADGE_NOT_FOUND: %s", badge_name)
            return None

        with transaction.atomic():
            # Check strictly for existence before creating to use locks across inserts
            exists = UserBadge.objects.select_for_update().filter(user=user, badge=badge).exists()
            if exists:
                return None
                
            user_badge = UserBadge.objects.create(user=user, badge=badge)
            created = True

        if created:
            logger.info(
                "BADGE_AWARDED: user=%s, badge=%s", user.id, badge_name
            )

            # Broadcast badge unlock to social feed
            cls._broadcast_gamification_event(user, "badge_unlocked", {
                "badge_name": badge.name,
                "badge_icon": badge.icon if hasattr(badge, 'icon') else "🏆",
                "message": (
                    f"{user.username} earned the '{badge.name}' badge!"
                ),
            })

            # Invalidate stats cache
            cache.delete(f"gamification_user_stats_{user.id}")
            return user_badge

        return None

    @staticmethod
    def get_user_rank(user) -> int:
        """
        Get user's global rank from Redis.
        """
        from apps.gamification.leaderboard_service import LeaderboardService
        rank_info = LeaderboardService.get_user_rank(user.id, period="all")
        if rank_info:
            return rank_info['rank']
        return 0
    
    @staticmethod
    def get_leaderboard(limit=10, period="all"):
        """
        Get the leaderboard from Redis.
        Hydrates user details from DB.
        """
        from apps.gamification.leaderboard_service import LeaderboardService
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Get raw data from Redis (ID, Score, Rank)
        top_data = LeaderboardService.get_top_users(limit=limit, period=period)
        
        if not top_data:
            return []
            
        # Hydrate with User details (Bulk Fetch)
        user_ids = [int(entry['user_id']) for entry in top_data]
        users = User.objects.filter(id__in=user_ids).in_bulk()
        
        leaderboard = []
        for entry in top_data:
            uid = int(entry['user_id'])
            user = users.get(uid)
            if user:
                # Get Level approximation or fetch? 
                # For speed, approx level from score or fetch UserXP if crucial
                # Let's keep it simple: Level = TotalXP // 100 + 1
                level = (entry['score'] // 100) + 1
                
                leaderboard.append({
                    "rank": entry['rank'],
                    "user_id": str(uid),
                    "username": user.username,
                    "display_name": getattr(user, 'display_name', user.username),
                    "total_xp": entry['score'], # or weekly_xp if period='weekly', Redis stores correct score
                    "level": level,
                    "avatar": user.avatar.url if hasattr(user, 'avatar') and user.avatar else None,
                })
        
        return leaderboard
    
    @staticmethod
    def get_guild_leaderboard(limit=10):
        """
        Get guild leaderboard.
        
        Returns:
            List of guilds sorted by total XP
        """
        guilds = Guild.objects.annotate(
            member_count=Count('memberships')
        ).order_by('-total_xp')[:limit]
        
        return [
            {
                'rank': idx + 1,
                'name': guild.name,
                'emblem': guild.emblem,
                'total_xp': guild.total_xp,
                'level': guild.level,
                'member_count': guild.member_count,
            }
            for idx, guild in enumerate(guilds)
        ]
    
    @staticmethod
    def invalidate_leaderboard():
        """
        Invalidate the leaderboard cache.
        Called when XP changes occur.
        """
        # Delete all leaderboard cache keys
        for period in ["all", "weekly", "monthly"]:
            for limit in [10, 25, 50, 100]:
                cache_key = f"{GamificationService.LEADERBOARD_CACHE_KEY}_{period}_{limit}"
                cache.delete(cache_key)
    
    @staticmethod
    def reset_weekly_xp():
        """
        Reset weekly XP for all users.
        Should be called via celery task on weekly basis.
        """
        UserXP.objects.all().update(weekly_xp=0)
        GamificationService.invalidate_leaderboard()
        logger.info("WEEKLY_XP_RESET: All users weekly XP reset to 0")
    
    @classmethod
    def _broadcast_gamification_event(cls, user, event_type, extra_data=None):
        """Broadcast a generic gamification event via WebSockets."""
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            
            if channel_layer:
                data = {
                    "user_id": str(user.id),
                    "username": user.username,
                }
                if extra_data:
                    data.update(extra_data)
                    
                async_to_sync(channel_layer.group_send)(
                    "global_activity_feed",
                    {
                        "type": "feed_event",
                        "event_type": event_type,
                        "data": data,
                        "timestamp": str(timezone.now())
                    }
                )
        except Exception as e:
            logger.warning("Failed to broadcast %s event: %s", event_type, e)
    
    @classmethod
    def _check_level_badges(cls, user, level):
        """Award level-based badges."""
        level_badges = {
            5: "Rising Star",
            10: "Dedicated Learner",
            25: "Knowledge Seeker",
            50: "Scholar",
            100: "Master Learner"
        }
        
        if level in level_badges:
            cls.award_badge(user, level_badges[level])
    
    @classmethod
    def _update_guild_contribution(cls, user, xp_amount):
        """Update guild contribution when user earns XP."""
        try:
            membership = GuildMembership.objects.select_related('guild').get(user=user)
            
            # Use update() to ensure thread-safety and avoid F-expression gotchas with .save()
            GuildMembership.objects.filter(id=membership.id).update(
                contribution_xp=F('contribution_xp') + xp_amount
            )
            
            # Update guild total XP atomically
            Guild.objects.filter(id=membership.guild_id).update(
                total_xp=F('total_xp') + xp_amount
            )
        except GuildMembership.DoesNotExist:
            pass  # User not in a guild
    
    @classmethod
    def check_achievements(cls, user):
        """
        Check and award any pending achievements for a user.
        
        This method checks various criteria and awards badges accordingly.
        """
        from apps.courses.models import Enrollment, LessonCompletion
        from apps.dsa.models import Submission
        
        achievements_awarded = []
        
        # Course completion achievements
        completed_courses = Enrollment.objects.filter(
            user=user, progress_percentage=100
        ).count()
        
        course_badges = {
            1: "First Course Complete",
            5: "Course Enthusiast",
            10: "Course Master",
            25: "Learning Champion"
        }
        
        for count, badge_name in course_badges.items():
            if completed_courses >= count:
                result = cls.award_badge(user, badge_name)
                if result:
                    achievements_awarded.append(badge_name)
        
        # DSA problem achievements
        solved_problems = Submission.objects.filter(
            user=user, status='AC'
        ).values('problem').distinct().count()
        
        dsa_badges = {
            1: "First Solution",
            10: "Problem Solver",
            50: "Code Warrior",
            100: "Algorithm Master"
        }
        
        for count, badge_name in dsa_badges.items():
            if solved_problems >= count:
                result = cls.award_badge(user, badge_name)
                if result:
                    achievements_awarded.append(badge_name)
        
        return achievements_awarded

