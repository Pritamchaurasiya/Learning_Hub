"""
Test engine Celery tasks.
Handles timeout checking, analytics updates, and cleanup.
"""
import logging
from celery import shared_task
from django.utils import timezone
from django.db.models import Q

from .models import TestAttempt

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def check_expired_attempts(self):
    """
    Find and auto-submit attempts that have exceeded their time limit.
    Runs every minute via Celery Beat.
    """
    in_progress = TestAttempt.objects.filter(status='in_progress').select_related('test')
    expired_count = 0

    for attempt in in_progress:
        elapsed = (timezone.now() - attempt.started_at).total_seconds()
        time_limit = attempt.test.time_limit_minutes * 60

        if elapsed >= time_limit:
            try:
                from .services import TestSessionManager
                TestSessionManager.submit_attempt(attempt.id)
                attempt.status = 'expired'
                attempt.save(update_fields=['status'])
                expired_count += 1
            except Exception as e:
                logger.error(f"Failed to auto-submit attempt {attempt.id}: {e}")

    logger.info(f"Checked {in_progress.count()} in-progress attempts, expired {expired_count}")
    return {'checked': in_progress.count(), 'expired': expired_count}


@shared_task(bind=True, max_retries=3)
def update_analytics_after_attempt(self, attempt_id):
    """
    Update user analytics after a test attempt is submitted.
    Updates topic performance, exam performance, and gamification.
    """
    try:
        attempt = TestAttempt.objects.select_related('test', 'user').get(id=attempt_id)

        # Update topic performance for each question answered
        answers = attempt.answers.select_related('question', 'question__topic').filter(
            answered_at__isnull=False
        )

        for answer in answers:
            topic = answer.question.topic
            # This will be implemented when analytics_v2 app is created
            # For now, update question usage stats
            answer.question.usage_count += 1
            if answer.is_correct:
                answer.question.correct_count += 1
            elif answer.is_correct is False:
                answer.question.incorrect_count += 1
            answer.question.save(update_fields=['usage_count', 'correct_count', 'incorrect_count'])

        logger.info(f"Analytics updated for attempt {attempt_id}")
        return {'status': 'success', 'attempt_id': attempt_id}

    except TestAttempt.DoesNotExist:
        logger.error(f"Attempt {attempt_id} not found for analytics update")
        return {'status': 'error', 'message': 'Attempt not found'}
    except Exception as e:
        logger.error(f"Analytics update failed for attempt {attempt_id}: {e}")
        raise self.retry(exc=e, countdown=60)


@shared_task
def cleanup_abandoned_attempts():
    """
    Mark attempts as abandoned if they've been inactive for too long.
    Runs every hour via Celery Beat.
    """
    cutoff = timezone.now() - timezone.timedelta(hours=24)
    abandoned = TestAttempt.objects.filter(
        status='in_progress',
        last_activity_at__lt=cutoff,
    )

    count = abandoned.update(status='abandoned')
    logger.info(f"Marked {count} attempts as abandoned")
    return {'abandoned': count}


@shared_task
def recalculate_question_stats():
    """
    Recalculate question statistics (accuracy rate, avg time).
    Runs daily via Celery Beat.
    Uses bulk aggregation instead of N+1 queries.
    """
    from django.db.models import Avg, Count
    from .models import Question, AttemptAnswer

    # Single aggregation query instead of N+1
    stats = AttemptAnswer.objects.filter(
        answered_at__isnull=False,
    ).values('question_id').annotate(
        avg_time=Avg('time_spent_seconds'),
        total_answers=Count('id'),
    )

    updated = 0
    for stat in stats:
        Question.objects.filter(id=stat['question_id']).update(
            avg_time_seconds=stat['avg_time'] or 0
        )
        updated += 1

    logger.info(f"Recalculated stats for {updated} questions")
    return {'updated': updated}
