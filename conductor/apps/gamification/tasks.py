
from celery import shared_task
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(bind=True, queue='default', autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3}) 
def check_achievements_task(self, user_id):
    """
    Async task to check if user unlocked any new badges/achievements.
    Processing this in background prevents API latency during simple actions like 'completing a lesson'.
    """
    from apps.gamification.services import GamificationService
    
    try:
        user = User.objects.get(id=user_id)
        # Check and award
        new_badges = GamificationService.check_achievements(user)
        
        if new_badges:
            logger.info("User %s earned benchmarks: %s", user.username, new_badges)
            # Optionally send push notification here
            
    except User.DoesNotExist:
        pass
    except Exception as e:
        logger.error("Achievement Check Failed for user %s: %s", user_id, e)

@shared_task(bind=True, queue='default', autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def sync_xp_to_redis_task(self, user_id, total_xp, weekly_xp):
    """
    Syncs a single user's XP to Redis leaderboards.
    """
    from apps.gamification.leaderboard_service import LeaderboardService
    LeaderboardService.update_score(user_id, total_xp, period="all")
    LeaderboardService.update_score(user_id, weekly_xp, period="weekly")
