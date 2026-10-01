
import logging
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

class LeaderboardService:
    """
    High-performance Leaderboard using Redis Sorted Sets with automatic DB Fallback.
    Operations are O(log N) in Redis, with seamless fallback to UserXP in Database.
    """
    
    KEY_PREFIX = "leaderboard"
    
    @classmethod
    def _get_redis_connection(cls):
        """Get raw redis connection."""
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
            r.zadd(key, {str(user_id): score})
        except Exception as e:
            logger.debug("Redis leaderboard update skipped/fallback to DB: %s", e)

    @classmethod
    def get_top_users(cls, limit=10, period="all"):
        """
        Get top N users with their scores.
        Returns list of dicts: {'user_id': str, 'score': int, 'rank': int}
        """
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            
            data = r.zrevrange(key, 0, limit - 1, withscores=True)
            if data:
                results = []
                for rank, (user_id_bytes, score) in enumerate(data, start=1):
                    results.append({
                        "user_id": user_id_bytes.decode('utf-8'),
                        "score": int(score),
                        "rank": rank
                    })
                return results
        except Exception as e:
            logger.debug("Redis unavailable for top users, using DB fallback: %s", e)

        # Database Fallback
        try:
            from apps.gamification.models import UserXP
            order_field = '-weekly_xp' if period == "weekly" else '-total_xp'
            top_records = UserXP.objects.order_by(order_field)[:limit]
            results = []
            for rank, uxp in enumerate(top_records, start=1):
                score = uxp.weekly_xp if period == "weekly" else uxp.total_xp
                results.append({
                    "user_id": str(uxp.user_id),
                    "score": int(score),
                    "rank": rank
                })
            return results
        except Exception as err:
            logger.error("DB fallback for top leaderboard users failed: %s", err)
            return []

    @classmethod
    def get_user_rank(cls, user_id, period="all"):
        """
        Get specific user's rank and score.
        """
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            uid_str = str(user_id)
            
            rank_idx = r.zrevrank(key, uid_str)
            score = r.zscore(key, uid_str)
            
            if rank_idx is not None:
                return {
                    "rank": rank_idx + 1,
                    "score": int(score) if score else 0
                }
        except Exception as e:
            logger.debug("Redis unavailable for user rank, using DB fallback: %s", e)

        # Database Fallback
        try:
            from apps.gamification.models import UserXP
            user_xp = UserXP.objects.filter(user_id=user_id).first()
            if not user_xp:
                return {"rank": 1, "score": 0}
            score = user_xp.weekly_xp if period == "weekly" else user_xp.total_xp
            filter_kw = {'weekly_xp__gt': score} if period == "weekly" else {'total_xp__gt': score}
            higher_count = UserXP.objects.filter(**filter_kw).count()
            return {
                "rank": higher_count + 1,
                "score": int(score)
            }
        except Exception as err:
            logger.error("DB fallback for user rank failed: %s", err)
            return {"rank": 1, "score": 0}

    @classmethod
    def reset_leaderboard(cls, period="weekly"):
        """
        Clear a specific leaderboard (e.g., for weekly reset).
        """
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            r.delete(key)
            logger.info("Leaderboard '%s' reset successfully in Redis", period)
        except Exception as e:
            logger.debug("Redis delete skipped for reset_leaderboard: %s", e)

    @classmethod
    def get_users_around_me(cls, user_id, limit=5, period="all"):
        """
        Get users around a specific user (for showing 'rank nearby' feature).
        Returns users with rank below and above the given user.
        """
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            uid_str = str(user_id)
            
            user_rank = r.zrevrank(key, uid_str)
            if user_rank is not None:
                start = max(0, user_rank - limit)
                end = user_rank + limit
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
            logger.debug("Redis unavailable for nearby users, using DB fallback: %s", e)

        # Database Fallback
        try:
            return cls.get_top_users(limit=limit * 2, period=period)
        except Exception as err:
            logger.error("DB fallback for users around user failed: %s", err)
            return []

    @classmethod
    def get_total_participants(cls, period="all"):
        """Get total number of users in the leaderboard."""
        try:
            r = cls._get_redis_connection()
            key = f"{cls.KEY_PREFIX}:{period}"
            return r.zcard(key)
        except Exception as e:
            logger.debug("Redis unavailable for total participants, using DB count: %s", e)

        try:
            from apps.gamification.models import UserXP
            return UserXP.objects.count()
        except Exception as err:
            logger.error("DB fallback for total participants failed: %s", err)
            return 0
