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
    Batch process to avoid long-running tasks.
    """
    now = timezone.now()
    # Process in batches of 100 to avoid memory spikes
    batch_size = 100
    expired_total = 0
    qs = TestAttempt.objects.filter(status='in_progress').select_related('test').order_by('started_at')
    offset = 0

    while True:
        batch = list(qs[offset:offset + batch_size])
        if not batch:
            break
        for attempt in batch:
            try:
                elapsed = (now - attempt.started_at).total_seconds()
                time_limit = (attempt.test.time_limit_minutes or 0) * 60
                if time_limit <= 0:
                    continue

                if elapsed >= time_limit:
                    from .services import TestSessionManager
                    try:
                        TestSessionManager.submit_attempt(attempt.id)
                        attempt.refresh_from_db()
                        # If the submission happened at/after timeout, mark expired
                        if attempt.submitted_at:
                            submitted_elapsed = (attempt.submitted_at - attempt.started_at).total_seconds()
                            if submitted_elapsed >= time_limit:
                                attempt.status = 'expired'
                                attempt.save(update_fields=['status'])
                                expired_total += 1
                    except Exception as e:
                        logger.exception(f"Auto-submit failed for attempt {attempt.id}: {e}")
                        # Mark expired to prevent further activity
                        try:
                            TestAttempt.objects.filter(pk=attempt.pk).update(status='expired')
                        except Exception:
                            attempt.status = 'expired'
                            attempt.save(update_fields=['status'])
                        expired_total += 1
            except Exception as e:
                logger.exception(f"Failed to auto-submit attempt {attempt.id}: {e}")
        offset += batch_size

    total_in_progress = qs.count()
    logger.info(f"Checked {total_in_progress} in-progress attempts, expired {expired_total}")
    return {'checked': total_in_progress, 'expired': expired_total}


@shared_task(bind=True, max_retries=3)
def update_analytics_after_attempt(self, attempt_id):
    """
    Update user analytics after a test attempt is submitted.
    Updates topic performance, exam performance, and gamification.
    """
    try:
        attempt = TestAttempt.objects.select_related('test', 'test__exam', 'user').get(id=attempt_id)

        # Update topic performance for each question answered
        answers = attempt.answers.select_related('question', 'question__topic').filter(
            answered_at__isnull=False
        )

        for answer in answers:
            topic = getattr(answer.question, 'topic', None)
            if topic:
                try:
                    from apps.analytics_v2.models import TopicPerformance
                    topic_perf, _ = TopicPerformance.objects.get_or_create(
                        user=attempt.user,
                        topic=topic,
                    )
                    topic_perf.update_from_attempt(
                        is_correct=answer.is_correct,
                        time_spent=answer.time_spent_seconds or 0,
                    )
                except Exception as ex:
                    logger.warning(f"Failed to update TopicPerformance for topic {topic.id}: {ex}")

            # Update question usage stats
            answer.question.usage_count += 1
            if answer.is_correct:
                answer.question.correct_count += 1
            elif answer.is_correct is False:
                answer.question.incorrect_count += 1
            answer.question.save(update_fields=['usage_count', 'correct_count', 'incorrect_count'])

        # Update exam performance summary
        if attempt.test and attempt.test.exam:
            try:
                from apps.analytics_v2.models import ExamPerformance
                exam = attempt.test.exam
                exam_perf, _ = ExamPerformance.objects.get_or_create(
                    user=attempt.user,
                    exam=exam,
                )
                exam_perf.total_tests_taken = (exam_perf.total_tests_taken or 0) + 1
                exam_perf.save()
            except Exception as ex:
                logger.warning(f"Failed to update ExamPerformance for exam: {ex}")

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
    Recalculate question statistics (accuracy rate, avg time, IRT difficulty parameter calibration).
    Runs daily via Celery Beat.
    Uses bulk aggregation and chunked bulk update instead of N+1 individual queries.
    """
    import math
    from django.db.models import Avg, Count, Q
    from .models import Question, AttemptAnswer

    # Single aggregation query with conditional counts
    stats = AttemptAnswer.objects.filter(
        answered_at__isnull=False,
    ).values('question_id').annotate(
        avg_time=Avg('time_spent_seconds'),
        correct_total=Count('id', filter=Q(is_correct=True)),
        incorrect_total=Count('id', filter=Q(is_correct=False)),
    )

    questions_to_update = []
    for stat in stats:
        q_id = stat['question_id']
        avg_time = stat['avg_time'] or 0
        correct_cnt = stat['correct_total'] or 0
        incorrect_cnt = stat['incorrect_total'] or 0
        total_answers = correct_cnt + incorrect_cnt
        
        # 1-PL / 3-PL IRT difficulty calibration based on empirical response logs
        if total_answers >= 5:
            p_val = max(0.02, min(0.98, correct_cnt / total_answers))
            # Logit transformation to standard scale theta in [-3.0, +3.0]
            irt_diff = -math.log(p_val / (1.0 - p_val)) / 1.7
            calibrated_diff = max(-3.0, min(3.0, round(irt_diff, 3)))
        else:
            calibrated_diff = None

        q_kwargs = {
            'id': q_id,
            'avg_time_seconds': avg_time,
            'correct_count': correct_cnt,
            'incorrect_count': incorrect_cnt,
            'usage_count': total_answers,
        }
        if calibrated_diff is not None:
            q_kwargs['difficulty'] = calibrated_diff

        questions_to_update.append(Question(**q_kwargs))

    # Chunked bulk update in batches of 500
    batch_size = 500
    fields_to_update = ['avg_time_seconds', 'correct_count', 'incorrect_count', 'usage_count']
    if any(hasattr(q, 'difficulty') for q in questions_to_update):
        fields_to_update.append('difficulty')

    for i in range(0, len(questions_to_update), batch_size):
        chunk = questions_to_update[i:i + batch_size]
        Question.objects.bulk_update(
            chunk,
            fields_to_update
        )

    logger.info(f"Recalculated stats and IRT calibration for {len(questions_to_update)} questions in bulk")
    return {'updated': len(questions_to_update)}


@shared_task(bind=True, queue='ai_queue', max_retries=2)
def generate_test_async_task(self, user_id, exam_id, subject_id, topic_ids, config):
    """
    Asynchronously generate an AI test in the background.
    """
    from django.contrib.auth import get_user_model
    from apps.ai_engine.test_generation import AITestGenerationService
    from .serializers import TestDetailSerializer
    
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        service = AITestGenerationService()
        test = service.generate_test(
            user=user,
            exam_id=exam_id,
            subject_id=subject_id,
            topic_ids=topic_ids or [],
            config=config,
        )
        return {
            'status': 'success',
            'test_id': str(test.id),
            'test': TestDetailSerializer(test).data,
        }
    except Exception as e:
        logger.error(f"Async test generation failed for user {user_id}: {e}")
        raise self.retry(exc=e, countdown=10)
