
import logging
import redis
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

class LeaderboardService:
    """
    High-performance Leaderboard using Redis Sorted Sets.
    Operations are O(log N).
    """
    
    KEY_PREFIX = "leaderboard"
    
    @classmethod
    def _get_redis_connection(cls):
        """Get raw redis connection."""
        # We can use django_redis to get the client
        from django_redis import get_redis_connection
        return get_redis_connection("default")
        
    @classmethod
    def update_score(cls, user_id, score, period="all"):
        """
        Update user score in the sorted set.
        """
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            # ZADD key score member
            r.zadd(key, {str(user_id): score})
            
            if period == "all":
                # Also update the weekly one if needed? 
                # Actually, the service caller should handle logic of which leaderboards to update.
                # But typically we update "all" and "weekly" separately.
                pass
                
        except Exception as e:
            # Fallback or log?
            # In gamification, if Redis fails, we might just skip the realtime update 
            # and rely on eventual consistency or DB.
            logger.error("Leaderboard update failed: %s", e)

    @classmethod
    def get_top_users(cls, limit=10, period="all"):
        """
        Get top N users with their scores.
        Returns list of dicts: {'user_id': str, 'score': int, 'rank': int}
        """
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            
            # ZREVRANGE key 0 limit-1 WITHSCORES
            data = r.zrevrange(key, 0, limit - 1, withscores=True)
            
            results = []
            for rank, (user_id_bytes, score) in enumerate(data, start=1):
                results.append({
                    "user_id": user_id_bytes.decode('utf-8'),
                    "score": int(score),
                    "rank": rank
                })
            return results
        except Exception as e:
            logger.error("Failed to get top leaderboard users: %s", e)
            return []

    @classmethod
    def get_user_rank(cls, user_id, period="all"):
        """
        Get specific user's rank and score.
        """
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            user_id = str(user_id)
            
            # ZREVRANK returns 0-based index
            rank_idx = r.zrevrank(key, user_id)
            score = r.zscore(key, user_id)
            
            if rank_idx is not None:
                return {
                    "rank": rank_idx + 1,
                    "score": int(score) if score else 0
                }
            return None
        except Exception as e:
            logger.error("Failed to get user rank: %s", e)
            return None

    @classmethod
    def reset_leaderboard(cls, period="weekly"):
        """
        Clear a specific leaderboard (e.g., for weekly reset).
        """
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            r.delete(key)
            logger.info(f"Leaderboard '{period}' reset successfully")
        except Exception as e:
            logger.error("Failed to reset leaderboard '%s': %s", period, e)

    @classmethod
    def get_users_around_me(cls, user_id, limit=5, period="all"):
        """
        Get users around a specific user (for showing 'rank nearby' feature).
        Returns users with rank below and above the given user.
        """
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            user_id = str(user_id)
            
            # Get user's rank (0-based)
            user_rank = r.zrevrank(key, user_id)
            if user_rank is None:
                return []
            
            # Calculate range
            start = max(0, user_rank - limit)
            end = user_rank + limit
            
            # Get users in range
            data = r.zrevrange(key, start, end, withscores=True)
            
            results = []
            for rank, (uid_bytes, score) in enumerate(data, start=start + 1):
                results.append({
                    "user_id": uid_bytes.decode('utf-8'),
                    "score": int(score),
                    "rank": rank
                })
            return results
        except Exception as e:
            logger.error("Failed to get users around user: %s", e)
            return []

    @classmethod
    def get_total_participants(cls, period="all"):
        """Get total number of users in the leaderboard."""
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            return r.zcard(key)
        except Exception as e:
            logger.error("Failed to get total participants: %s", e)
            return 0
