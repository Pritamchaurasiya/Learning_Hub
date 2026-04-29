from django.db.models import Count, Avg, Sum, F
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
from apps.users.models import User
from apps.courses.models import Course, Enrollment

class AnalyticsService:
    """ Service to aggregate system-wide analytics. """

    @staticmethod
    def get_system_overview():
        """ Get high-level system stats. Cached for 1 hour. """
        cache_key = "analytics:system_overview"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        total_users = User.objects.count()
        total_courses = Course.objects.count()
        total_enrollments = Enrollment.objects.count()
        
        # Active users in last 24h
        start_date = timezone.now() - timedelta(days=1)
        active_users = User.objects.filter(last_login__gte=start_date).count()

        # New users this week
        week_ago = timezone.now() - timedelta(days=7)
        new_users_week = User.objects.filter(date_joined__gte=week_ago).count()

        data = {
            "total_users": total_users,
            "total_courses": total_courses,
            "total_enrollments": total_enrollments,
            "active_users_24h": active_users,
            "new_users_week": new_users_week,
            "growth_rate": round((new_users_week / max(total_users, 1)) * 100, 2)
        }
        
        cache.set(cache_key, data, timeout=3600)
        return data

    @staticmethod
    def get_top_courses(limit=5):
        """ Get top performing courses. """
        return list(Course.objects.filter(is_published=True)
            .order_by('-enrollment_count')
            .values('id', 'title', 'slug', 'enrollment_count', 'avg_rating')[:limit])

    @staticmethod
    def get_revenue_stats():
        """ Get estimated revenue from enrollments. """
        # Sum of enrolled courses * their price
        revenue_data = Enrollment.objects.select_related('course').aggregate(
            total_revenue=Sum(F('course__price')),
            total_paid_enrollments=Count('id')
        )
        
        return {
            "total_revenue": float(revenue_data['total_revenue'] or 0),
            "total_paid_enrollments": revenue_data['total_paid_enrollments'],
            "currency": "USD",
            "avg_order_value": round(
                float(revenue_data['total_revenue'] or 0) / max(revenue_data['total_paid_enrollments'], 1), 2
            )
        }

    @staticmethod
    def get_engagement_metrics():
        """ Get user engagement metrics. """
        from apps.gamification.models import UserXP
        
        total_xp = UserXP.objects.aggregate(total=Sum('total_xp'))['total'] or 0
        avg_level = UserXP.objects.aggregate(avg=Avg('level'))['avg'] or 1
        
        # Top learners
        top_learners = list(UserXP.objects.select_related('user')
            .order_by('-total_xp')
            .values('user__username', 'total_xp', 'level')[:5])
        
        return {
            "total_xp_awarded": total_xp,
            "avg_user_level": round(avg_level, 1),
            "top_learners": top_learners
        }
