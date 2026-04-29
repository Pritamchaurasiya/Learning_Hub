from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from apps.users.models import User
from apps.courses.models import Enrollment

class PredictiveService:
    """
    AI-powered predictive analytics for student retention.
    """
    
    @staticmethod
    def get_at_risk_students(days_inactive=7):
        """
        Identify students likely to churn.
        Criteria:
        - Enrolled in at least one course.
        - Inactive for > 7 days.
        - Course completion < 100%.
        """
        cutoff = timezone.now() - timedelta(days=days_inactive)
        
        # 1. Base Query: Inactive Users
        at_risk_users = User.objects.filter(
            last_login_at__lt=cutoff,
            is_active=True,
            role=User.Role.STUDENT
        ).distinct()
        
        results = []
        for user in at_risk_users:
            # 2. Check Enrollments context
            active_enrollments = Enrollment.objects.filter(user=user, is_completed=False)
            
            if active_enrollments.exists():
                # Risk Score Calculation (Simple Heuristic for now)
                # Max Risk = 100. (+10 per day over 7)
                days_offline = (timezone.now() - (user.last_login_at or timezone.now())).days
                risk_score = min(100, 50 + (days_offline - 7) * 5)
                
                results.append({
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'last_login': user.last_login_at,
                    'days_inactive': days_offline,
                    'risk_score': risk_score,
                    'enrolled_courses': active_enrollments.count()
                })
                
        # Sort by risk score descending
        return sorted(results, key=lambda x: x['risk_score'], reverse=True)

    @staticmethod
    def get_retention_stats():
        """
        Global retention metrics.
        """
        total_students = User.objects.filter(role=User.Role.STUDENT).count()
        if total_students == 0:
            return {"retention_rate": 100, "at_risk_count": 0}
            
        at_risk = len(PredictiveService.get_at_risk_students())
        retention_rate = ((total_students - at_risk) / total_students) * 100
        
        return {
            "total_students": total_students,
            "at_risk_count": at_risk,
            "retention_rate": round(retention_rate, 2)
        }
