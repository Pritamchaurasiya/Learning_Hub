"""
Analytics v2 service: Dashboard, trends, weak area identification, recommendations.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Sum, Q, F

from .models import TopicPerformance, ExamPerformance, PerformanceTrend, AIRecommendation
from apps.exams.models import Topic

logger = logging.getLogger(__name__)


class AnalyticsEngine:
    """Core analytics engine for user performance analysis."""

    @classmethod
    def get_dashboard(cls, user, exam_id=None):
        """Get comprehensive performance dashboard."""
        from apps.test_engine.models import TestAttempt

        # Base query for attempts
        attempts = TestAttempt.objects.filter(
            user=user, status__in=['submitted', 'expired']
        )

        if exam_id:
            attempts = attempts.filter(test__exam_id=exam_id)

        # Overall stats
        total_tests = attempts.count()
        total_questions = attempts.aggregate(total=Sum('answers__count'))['total'] or 0
        avg_percentage = attempts.aggregate(avg=Avg('percentage'))['avg'] or 0
        best_score = attempts.aggregate(best=Max('percentage'))['best'] or 0

        # Calculate accuracy from answers
        answers = cls._get_user_answers(user, exam_id)
        total_answered = answers.filter(answered_at__isnull=False).count()
        total_correct = answers.filter(is_correct=True).count()
        overall_accuracy = (total_correct / total_answered * 100) if total_answered > 0 else 0

        # Streak calculation
        streak_data = cls._calculate_streak(user)

        # Exams and topics
        exams_attempted = attempts.values('test__exam').distinct().count()
        mastered_topics = TopicPerformance.objects.filter(
            user=user, mastery_level__gte=80
        ).count()
        needing_work = TopicPerformance.objects.filter(
            user=user, mastery_level__lt=40, total_attempts__gte=3
        ).count()

        # Recent performance (last 7 days)
        recent_trends = cls._get_recent_trends(user, exam_id, days=7)

        # Weak and strong areas
        weak_areas = cls._get_weak_areas(user, exam_id)
        strong_areas = cls._get_strong_areas(user, exam_id)

        # Recommendations
        recommendations = cls._get_active_recommendations(user, exam_id)

        return {
            'total_tests_taken': total_tests,
            'total_questions_answered': total_answered,
            'overall_accuracy': round(overall_accuracy, 1),
            'avg_percentage': round(avg_percentage, 1),
            'best_score': round(best_score, 1),
            'current_streak': streak_data['current'],
            'longest_streak': streak_data['longest'],
            'total_study_time_minutes': cls._get_total_study_time(user, exam_id),
            'exams_attempted': exams_attempted,
            'topics_mastered': mastered_topics,
            'topics_needing_work': needing_work,
            'recent_performance': recent_trends,
            'weak_areas': weak_areas,
            'strong_areas': strong_areas,
            'recommendations': recommendations,
        }

    @classmethod
    def _get_user_answers(cls, user, exam_id=None):
        """Get all answers for a user, optionally filtered by exam."""
        from apps.test_engine.models import AttemptAnswer
        answers = AttemptAnswer.objects.filter(attempt__user=user)
        if exam_id:
            answers = answers.filter(attempt__test__exam_id=exam_id)
        return answers

    @classmethod
    def _calculate_streak(cls, user):
        """Calculate current and longest study streak."""
        from apps.test_engine.models import TestAttempt

        # Get unique dates with activity
        active_dates = TestAttempt.objects.filter(
            user=user, status__in=['submitted', 'expired']
        ).dates('started_at', 'day').order_by('-started_at')

        if not active_dates:
            return {'current': 0, 'longest': 0}

        # Current streak
        current = 0
        today = timezone.now().date()
        for i, date in enumerate(active_dates):
            expected = today - timedelta(days=i)
            if date == expected:
                current += 1
            elif date == expected - timedelta(days=1) and i == 0:
                # Activity yesterday but not today - streak still alive
                current += 1
                today = date
            else:
                break

        # Longest streak (simplified)
        longest = current
        dates_list = list(active_dates)
        for i in range(len(dates_list)):
            streak = 1
            for j in range(i + 1, len(dates_list)):
                if dates_list[j] == dates_list[j - 1] - timedelta(days=1):
                    streak += 1
                else:
                    break
            longest = max(longest, streak)

        return {'current': current, 'longest': longest}

    @classmethod
    def _get_total_study_time(cls, user, exam_id=None):
        """Get total study time in minutes."""
        from apps.test_engine.models import TestAttempt
        query = TestAttempt.objects.filter(
            user=user, status__in=['submitted', 'expired']
        )
        if exam_id:
            query = query.filter(test__exam_id=exam_id)
        total_seconds = query.aggregate(total=Sum('time_taken_seconds'))['total'] or 0
        return total_seconds // 60

    @classmethod
    def _get_recent_trends(cls, user, exam_id=None, days=7):
        """Get recent performance trends for charting."""
        from apps.test_engine.models import TestAttempt
        cutoff = timezone.now() - timedelta(days=days)

        attempts = TestAttempt.objects.filter(
            user=user,
            status__in=['submitted', 'expired'],
            started_at__gte=cutoff,
        )

        if exam_id:
            attempts = attempts.filter(test__exam_id=exam_id)

        # Group by date
        trends = []
        current = cutoff.date()
        end = timezone.now().date()

        while current <= end:
            day_attempts = attempts.filter(started_at__date=current)
            if day_attempts.exists():
                trends.append({
                    'date': current,
                    'period': 'daily',
                    'tests_taken': day_attempts.count(),
                    'avg_percentage': round(day_attempts.aggregate(avg=Avg('percentage'))['avg'] or 0, 1),
                    'total_questions': sum(a.answers.count() for a in day_attempts),
                    'total_correct': sum(a.answers.filter(is_correct=True).count() for a in day_attempts),
                    'total_time_minutes': sum(a.time_taken_seconds for a in day_attempts) // 60,
                    'streak_days': 0,
                })
            current += timedelta(days=1)

        return trends

    @classmethod
    def _get_weak_areas(cls, user, exam_id=None, limit=5):
        """Get topics with lowest accuracy."""
        performances = TopicPerformance.objects.filter(
            user=user,
            total_attempts__gte=3,
            accuracy__lt=60,
        ).select_related('topic', 'topic__subject', 'topic__subject__exam').order_by('accuracy')[:limit]

        if exam_id:
            performances = performances.filter(topic__subject__exam_id=exam_id)

        from .serializers import TopicPerformanceSerializer
        return TopicPerformanceSerializer(performances, many=True).data

    @classmethod
    def _get_strong_areas(cls, user, exam_id=None, limit=5):
        """Get topics with highest accuracy."""
        performances = TopicPerformance.objects.filter(
            user=user,
            total_attempts__gte=3,
            accuracy__gte=70,
        ).select_related('topic', 'topic__subject', 'topic__subject__exam').order_by('-accuracy')[:limit]

        if exam_id:
            performances = performances.filter(topic__subject__exam_id=exam_id)

        from .serializers import TopicPerformanceSerializer
        return TopicPerformanceSerializer(performances, many=True).data

    @classmethod
    def _get_active_recommendations(cls, user, exam_id=None, limit=5):
        """Get active (non-dismissed, non-actioned) recommendations."""
        recs = AIRecommendation.objects.filter(
            user=user,
            is_actioned=False,
            is_dismissed=False,
            expires_at__gt=timezone.now(),
        ).order_by('-priority', '-created_at')[:limit]

        if exam_id:
            recs = recs.filter(Q(exam_id=exam_id) | Q(exam__isnull=True))

        from .serializers import AIRecommendationSerializer
        return AIRecommendationSerializer(recs, many=True).data

    @classmethod
    def generate_recommendations(cls, user):
        """Generate AI-based recommendations for a user."""
        from apps.test_engine.models import TestAttempt

        # Get weak topics
        weak_performances = TopicPerformance.objects.filter(
            user=user,
            total_attempts__gte=3,
            accuracy__lt=50,
        ).select_related('topic', 'topic__subject', 'topic__subject__exam')[:3]

        recommendations = []

        for perf in weak_performances:
            recommendations.append(AIRecommendation(
                user=user,
                exam=perf.topic.subject.exam,
                recommendation_type='practice_topic',
                title=f"Practice: {perf.topic.name}",
                description=f"Your accuracy in {perf.topic.name} is {perf.accuracy}%. Focus on this topic to improve.",
                target_topic_id=perf.topic.id,
                priority='high',
                reasoning=f"Low accuracy ({perf.accuracy}%) with {perf.total_attempts} attempts",
                confidence=0.8,
                expires_at=timezone.now() + timedelta(days=7),
            ))

        # Check if user hasn't taken a test recently
        last_test = TestAttempt.objects.filter(
            user=user, status__in=['submitted', 'expired']
        ).order_by('-started_at').first()

        if last_test and (timezone.now() - last_test.started_at).days > 3:
            recommendations.append(AIRecommendation(
                user=user,
                exam=last_test.test.exam,
                recommendation_type='retake_test',
                title="Time for another practice test!",
                description="Consistent practice improves retention. Take another test to stay sharp.",
                target_test_id=last_test.test.id,
                priority='medium',
                reasoning=f"Last test was {(timezone.now() - last_test.started_at).days} days ago",
                confidence=0.7,
                expires_at=timezone.now() + timedelta(days=3),
            ))

        # Bulk create
        if recommendations:
            AIRecommendation.objects.bulk_create(recommendations)

        return recommendations


# Import Max for the dashboard
from django.db.models import Max
