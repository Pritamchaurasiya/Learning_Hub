
from django.db.models import Avg, Count
from django.utils import timezone
from datetime import timedelta
from apps.users.models import User
from apps.courses.models import Course
# from apps.gamification.models import UserXP

class RetentionService:
    """
    Predictive Analytics Engine for Student Retention.
    Calculates 'Dropout Risk' based on behavioral signals.
    """

    @staticmethod
    def calculate_risk_score(student: User) -> dict:
        """
        Analyzes a student's activity and returns a Risk Score (0-100).
        Higher is worse.
        """
        score = 0
        reasons = []

        # 1. Last Login (Recency)
        # Assuming User model has last_login or we track it
        if student.last_login:
            days_inactive = (timezone.now() - student.last_login).days
            if days_inactive > 14:
                score += 40
                reasons.append(f"Inactive for {days_inactive} days")
            elif days_inactive > 7:
                score += 20
                reasons.append(f"Inactive for {days_inactive} days")
        else:
            score += 50
            reasons.append("Never logged in")

        # 2. Gamification / XP (Engagement)
        try:
            user_xp = UserXP.objects.get(user=student)
            if user_xp.monthly_xp < 50: # Low activity threshold
                score += 20
                reasons.append("Low Monthly XP")
        except UserXP.DoesNotExist:
            score += 10 # Neutral if no XP record found yet

        # 3. Discussion Participation (Social)
        # Lazy import to avoid circular dependency
        from apps.discussions.models import DiscussionThread, DiscussionReply
        
        thread_count = DiscussionThread.objects.filter(author=student).count()
        reply_count = DiscussionReply.objects.filter(author=student).count()
        
        if thread_count + reply_count == 0:
            score += 10
            reasons.append("Zero Social Participation")

        # Cap score at 100
        score = min(score, 100)

        # Risk Level Classification
        if score >= 70:
            risk_level = "CRITICAL"
        elif score >= 40:
            risk_level = "HIGH"
        elif score >= 20:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "student_id": student.id,
            "student_name": student.display_name,
            "risk_score": score,
            "risk_level": risk_level,
            "reasons": reasons
        }

    @staticmethod
    def get_at_risk_students(course_id: int) -> list:
        """
        Returns a list of students in a course who are At Risk.
        """
        from apps.courses.models import Enrollment
        
        enrollments = Enrollment.objects.filter(course_id=course_id, active=True)
        results = []
        
        for enrollment in enrollments:
            risk_data = RetentionService.calculate_risk_score(enrollment.user)
            if risk_data['risk_score'] >= 40: # Filter for Medium/High
                results.append(risk_data)
                
        # Sort by highest risk first
        results.sort(key=lambda x: x['risk_score'], reverse=True)
        return results
