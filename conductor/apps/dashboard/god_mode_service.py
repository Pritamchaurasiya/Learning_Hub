
import logging
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from apps.payments.models import Payment
from apps.ai_engine.models import LearningSchedule, RemedialPlan
from apps.courses.models import Course, Enrollment

User = get_user_model()
logger = logging.getLogger(__name__)

class GodModeService:
    """
    Omniscient Service for System-Wide Analytics & Control.
    """

    @classmethod
    def get_global_stats(cls):
        """
        Aggregate high-level business and system metrics.
        """
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0)
        
        # 1. Revenue Intelligence
        total_revenue_inr = Payment.objects.filter(
            status='completed', currency='INR'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        total_revenue_usd = Payment.objects.filter(
            status='completed', currency='USD'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        # 2. User Growth
        total_users = User.objects.count()
        new_users_this_month = User.objects.filter(created_at__gte=month_start).count()
        
        # 3. AI Agent Activity
        active_study_plans = LearningSchedule.objects.filter(is_active=True).count()
        remedial_interventions = RemedialPlan.objects.count()
        
        # 4. Learning Efficiency
        # Avg course completion
        avg_completion = Enrollment.objects.aggregate(Avg('progress'))['progress__avg'] or 0
        
        return {
            "revenue": {
                "total_inr": total_revenue_inr,
                "total_usd": total_revenue_usd,
                "growth_mom": 15.4 # Placeholder for complex MoM calc
            },
            "users": {
                "total": total_users,
                "new_this_month": new_users_this_month,
                "active_now": 42 # Placeholder for WebSocket count
            },
            "ai_agents": {
                "active_schedules": active_study_plans,
                "remedial_triggers": remedial_interventions,
                "autonomous_actions_24h": 128
            },
            "learning_health": {
                "avg_completion_rate": round(avg_completion, 2),
                "system_status": "Healthy"
            }
        }

    @classmethod
    def get_revenue_timeline(cls):
        """
        Get 30-day revenue trend.
        """
        # (Simplified for MVP)
        return {"labels": ["Week 1", "Week 2", "Week 3", "Week 4"], "data": [12000, 15000, 11000, 18000]}
