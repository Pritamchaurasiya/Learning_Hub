import logging
from datetime import timedelta
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from .models import TestAttempt
from .scoring import IRTScoringEngine

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def check_expired_attempts(self):
    """
    Periodic task to identify test attempts that have exceeded their test duration
    and mark them as EXPIRED / TIMEOUT while computing scores for saved answers.
    """
    now = timezone.now()
    processed_count = 0

    try:
        # Find active attempts
        active_attempts = TestAttempt.objects.filter(
            status='IN_PROGRESS'
        ).select_related('test')

        expired_ids = []
        for attempt in active_attempts:
            duration_minutes = attempt.test.duration_minutes or 60
            max_end_time = attempt.started_at + timedelta(minutes=duration_minutes, seconds=30)  # 30s grace period
            if now >= max_end_time:
                expired_ids.append(attempt.id)

        if not expired_ids:
            return {'status': 'success', 'expired_processed': 0}

        for attempt_id in expired_ids:
            try:
                with transaction.atomic():
                    attempt = TestAttempt.objects.select_for_update(skip_locked=True).select_related('test').get(id=attempt_id)
                    if attempt.status != 'IN_PROGRESS':
                        continue

                    # Gather already autosaved answers for this attempt
                    saved_answers = []
                    for ans in attempt.answers.all():
                        selected_opt_ids = ans.selected_option_ids or ([ans.selected_option_id] if ans.selected_option_id else [])
                        saved_answers.append({
                            'questionId': ans.question_id,
                            'selectedOptionId': ans.selected_option_id,
                            'selectedOptionIds': selected_opt_ids,
                            'timeSpentSeconds': ans.time_spent_sec,
                        })

                    # Calculate score based on answers saved up to the time limit
                    scoring_result = IRTScoringEngine.calculate_score_and_irt(attempt, saved_answers)

                    duration_seconds = (attempt.test.duration_minutes or 60) * 60
                    attempt.status = 'EXPIRED'
                    attempt.submitted_at = now
                    attempt.score = scoring_result.get('score', 0.0)
                    attempt.percentage = scoring_result.get('percentage', 0.0)
                    attempt.accuracy = scoring_result.get('accuracy', 0.0)
                    attempt.passed = scoring_result.get('passed', False)
                    attempt.time_spent_seconds = duration_seconds
                    attempt.save(update_fields=[
                        'status', 'submitted_at', 'score', 'percentage',
                        'accuracy', 'passed', 'time_spent_seconds'
                    ])
                    processed_count += 1
                    logger.info(f"Auto-expired attempt {attempt.id} for user {attempt.user_id}")
            except Exception as e:
                logger.error(f"Error processing expired attempt {attempt_id}: {e}", exc_info=True)

        return {'status': 'success', 'expired_processed': processed_count}

    except Exception as exc:
        logger.error(f"check_expired_attempts task failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def cleanup_abandoned_attempts(self):
    """
    Cleans up attempts that have been left IN_PROGRESS for more than 48 hours.
    """
    cutoff = timezone.now() - timedelta(hours=48)
    try:
        updated = TestAttempt.objects.filter(
            status='IN_PROGRESS',
            started_at__lt=cutoff
        ).update(
            status='EXPIRED',
            submitted_at=timezone.now()
        )
        logger.info(f"Cleaned up {updated} abandoned test attempts older than 48h")
        return {'status': 'success', 'cleaned_count': updated}
    except Exception as exc:
        logger.error(f"cleanup_abandoned_attempts task failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)
