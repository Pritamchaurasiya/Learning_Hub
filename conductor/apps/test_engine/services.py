"""
Test engine services: session management, scoring, autosave, timeout handling.
"""
import uuid
import logging
import json
from datetime import timedelta
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.db.models import Sum, Count, Q, Avg, F
from django.core.cache import cache

from .models import Test, TestQuestion, TestAttempt, AttemptAnswer, Question, Option

logger = logging.getLogger(__name__)
MAX_AUTOSAVE_BYTES = 32 * 1024  # 32KB guard for autosave_data JSON


class TestSessionManager:
    """
    Manages test lifecycle: start, autosave, submit, timeout, resume.
    Thread-safe and transaction-aware.
    """

    @classmethod
    @transaction.atomic
    def start_attempt(cls, user, test_id, mode='mock', device_info=None, ip_address=None):
        """
        Start a new test attempt or resume an existing in-progress one.

        Returns:
            TestAttempt object with shuffled questions
        """
        try:
            test = Test.objects.select_related('exam').get(id=test_id, is_published=True)
        except Test.DoesNotExist:
            raise ValueError("Test not found or not published")

        # Check for existing in-progress attempt
        existing = TestAttempt.objects.select_related('test').filter(
            user=user, test=test, status='in_progress'
        ).first()

        if existing:
            logger.info(f"Resuming existing attempt {existing.id} for user {user.id}")
            return existing

        # Get next attempt number
        last_attempt = TestAttempt.objects.filter(
            user=user, test=test
        ).order_by('-attempt_number').first()
        attempt_number = (last_attempt.attempt_number + 1) if last_attempt else 1

        # Create new attempt
        # Ensure total_marks is derived from test questions if not set
        total_marks = test.total_marks or TestQuestion.objects.filter(test=test).aggregate(total=Sum('marks'))['total'] or 0

        try:
            # Use savepoint (nested atomic) so IntegrityError from concurrent create can be handled
            with transaction.atomic():
                attempt = TestAttempt.objects.create(
                    user=user,
                    test=test,
                    session_token=uuid.uuid4().hex + uuid.uuid4().hex[:32],
                    status='in_progress',
                    mode=mode,
                    total_marks=total_marks,
                    attempt_number=attempt_number,
                    device_info=device_info or {},
                    ip_address=ip_address,
                )
        except IntegrityError:
            # Another worker likely created an in-progress attempt concurrently.
            # Fetch the existing in-progress attempt and return it.
            existing = TestAttempt.objects.select_related('test').filter(
                user=user, test=test, status='in_progress'
            ).first()
            if existing:
                logger.info(f"Concurrent create detected. Returning existing attempt {existing.id} for user {user.id}")
                return existing
            # If not found, re-raise
            raise

        # Update test attempt count atomically
        Test.objects.filter(id=test_id).update(attempt_count=F('attempt_count') + 1)

        logger.info(f"Started new attempt %s for user %s", attempt.id, user.id)
        return attempt

    @classmethod
    @transaction.atomic
    def autosave_answer(cls, attempt, question_id, answer_data):
        """
        Autosave an individual answer during test.
        Does NOT grade the answer (for mock mode).
        For practice mode, provides instant feedback.

        Args:
            attempt: TestAttempt object
            question_id: UUID of the question
            answer_data: {
                'selected_options': [option_uuid, ...],
                'text_answer': '...',
                'time_spent': seconds,
            }
        """
        if attempt.status != 'in_progress':
            raise ValueError("Attempt is not in progress")

        # Verify question belongs to this test
        try:
            test_question = TestQuestion.objects.select_related('question').get(
                test=attempt.test, question_id=question_id
            )
        except TestQuestion.DoesNotExist:
            raise ValueError("Question not found in this test")

        question = test_question.question

        # Get or create answer record
        answer, created = AttemptAnswer.objects.get_or_create(
            attempt=attempt,
            question=question,
        )

        # Update answer data
        if not created:
            answer.answer_changes += 1

        # Handle option selection
        selected_option_ids = answer_data.get('selected_options', [])
        if selected_option_ids:
            # Ensure options belong to this question to prevent tampering
            allowed_option_ids = list(Option.objects.filter(id__in=selected_option_ids, question=question).values_list('id', flat=True))
            if len(allowed_option_ids) != len(selected_option_ids):
                logger.warning(f"Autosave: Some selected option ids are invalid for question {question.id} in attempt {attempt.id}")
            answer.selected_options.set(allowed_option_ids)

        # Handle text answer
        if 'text_answer' in answer_data:
            answer.text_answer = answer_data['text_answer']

        # Update timing
        if 'time_spent' in answer_data:
            answer.time_spent_seconds = answer_data['time_spent']

        # Mark as answered
        if selected_option_ids or answer.text_answer:
            if not answer.first_answered_at:
                answer.first_answered_at = timezone.now()
            answer.answered_at = timezone.now()

        answer.save()

        # Update autosave data on attempt
        key = str(question_id)
        existing = attempt.autosave_data or {}
        existing[key] = {
            'selected_options': selected_option_ids,
            'text_answer': answer.text_answer,
            'timestamp': timezone.now().isoformat(),
        }

        # Guard autosave JSON size to avoid huge payloads
        try:
            data_bytes = json.dumps(existing).encode('utf-8')
            if len(data_bytes) > MAX_AUTOSAVE_BYTES:
                # Simple eviction: remove oldest entries until size within limit
                # existing is a dict keyed by question_id with timestamp — evict by oldest timestamp
                items = list(existing.items())
                # sort by timestamp
                items.sort(key=lambda kv: kv[1].get('timestamp', ''))
                while len(json.dumps(dict(items)).encode('utf-8')) > MAX_AUTOSAVE_BYTES and items:
                    items.pop(0)
                existing = dict(items)
        except Exception:
            # If any serialization error, fallback to keeping only current answer
            existing = {key: existing[key]}

        # Atomically update autosave_data and increment version to avoid race conditions
        TestAttempt.objects.filter(pk=attempt.pk).update(
            autosave_data=existing,
            autosave_version=F('autosave_version') + 1,
            last_activity_at=timezone.now(),
        )
        # Refresh attempt instance to read numeric autosave_version back
        attempt.refresh_from_db()

        # For practice mode, provide instant feedback
        feedback = None
        if attempt.mode == 'practice':
            feedback = cls._grade_answer(answer, question)

        return {
            'answer_id': answer.id,
            'created': created,
            'feedback': feedback,
        }

    @classmethod
    def _grade_answer(cls, answer, question):
        """Grade a single answer and return feedback."""
        if question.question_type == 'mcq':
            selected_set = set(answer.selected_options.values_list('id', flat=True))
            correct_set = set(question.options.filter(is_correct=True).values_list('id', flat=True))

            is_correct = selected_set == correct_set and len(selected_set) > 0
            answer.is_correct = is_correct
            answer.marks_obtained = 1 if is_correct else 0

            # Get explanation and first correct option id
            correct_option = question.options.filter(is_correct=True).first()
            explanation = correct_option.explanation if correct_option else question.explanation
            correct_option_id = str(correct_option.id) if correct_option else None

            answer.save()

            return {
                'is_correct': is_correct,
                'explanation': explanation,
                'correct_option_id': correct_option_id,
            }

        return None

    @classmethod
    @transaction.atomic
    def submit_attempt(cls, attempt_id):
        """
        Submit a test attempt and calculate final score.
        Handles negative marking, partial credit, and analytics update.
        """
        try:
            attempt = TestAttempt.objects.select_related('test').get(id=attempt_id)
        except TestAttempt.DoesNotExist:
            raise ValueError("Attempt not found")

        if attempt.status != 'in_progress':
            raise ValueError(f"Attempt is not in progress (status: {attempt.status})")

        test = attempt.test

        # Grade all answers
        total_obtained = 0
        total_negative = 0
        correct_count = 0
        incorrect_count = 0
        unanswered_count = 0

        answers = attempt.answers.select_related('question').prefetch_related(
            'question__options', 'selected_options'
        )

        for answer in answers:
            if not answer.answered_at:
                unanswered_count += 1
                continue

            grading = cls._grade_answer_for_submission(answer, test)
            if grading.get('is_correct'):
                total_obtained += grading.get('marks', 0)
                correct_count += 1
            elif grading.get('is_wrong'):
                # Negative marks may be per-question or custom per-test; fallback to test setting
                neg = getattr(test, 'negative_marks_per_question', 0)
                total_negative += neg
                incorrect_count += 1
            else:
                unanswered_count += 1

        # Defensive: if total_marks is zero, derive from test questions
        if not attempt.total_marks or attempt.total_marks == 0:
            derived = TestQuestion.objects.filter(test=test).aggregate(total=Sum('marks'))['total'] or 0
            attempt.total_marks = derived
            attempt.save(update_fields=['total_marks'])

        # Calculate final score
        score = max(0, total_obtained - total_negative)
        percentage = (score / attempt.total_marks * 100) if attempt.total_marks > 0 else 0

        # Update attempt
        attempt.score = round(score, 2)
        attempt.percentage = round(percentage, 2)
        attempt.passed = percentage >= test.passing_score
        attempt.status = 'submitted'
        attempt.submitted_at = timezone.now()
        attempt.time_taken_seconds = int(
            (attempt.submitted_at - attempt.started_at).total_seconds()
        )
        attempt.save()

        # Update analytics asynchronously (best-effort)
        try:
            cls._queue_analytics_update(attempt)
        except Exception as e:
            logger.error(f"Failed to queue analytics update for attempt {attempt.id}: {e}")

        logger.info(
            f"Submitted attempt {attempt.id}: score={score}, "
            f"percentage={percentage}%, passed={attempt.passed}"
        )

        return attempt

    @classmethod
    def _grade_answer_for_submission(cls, answer, test):
        """Grade an answer during submission."""
        question = answer.question

        if question.question_type == 'mcq':
            selected = set(answer.selected_options.values_list('id', flat=True))
            correct = set(question.options.filter(is_correct=True).values_list('id', flat=True))

            is_correct = selected == correct and len(selected) > 0
            is_wrong = len(selected) > 0 and not is_correct

            answer.is_correct = is_correct
            answer.marks_obtained = test.marks_per_correct if is_correct else 0
            answer.save()

            return {
                'is_correct': is_correct,
                'is_wrong': is_wrong,
                'marks': test.marks_per_correct if is_correct else 0,
            }

        elif question.question_type == 'true_false':
            selected = list(answer.selected_options.values_list('text', flat=True))
            if not selected:
                return {'is_correct': False, 'is_wrong': False, 'marks': 0}

            correct_option = question.options.filter(is_correct=True).first()
            is_correct = correct_option and selected[0].lower() == correct_option.text.lower()

            answer.is_correct = is_correct
            answer.marks_obtained = test.marks_per_correct if is_correct else 0
            answer.save()

            return {
                'is_correct': is_correct,
                'is_wrong': not is_correct,
                'marks': test.marks_per_correct if is_correct else 0,
            }

        elif question.question_type == 'numerical':
            if not answer.text_answer:
                return {'is_correct': False, 'is_wrong': False, 'marks': 0}

            # Allow small tolerance for numerical answers
            try:
                user_val = float(answer.text_answer.strip())
                # The correct answer is stored in the first correct option's text
                correct_option = question.options.filter(is_correct=True).first()
                if correct_option:
                    correct_val = float(correct_option.text.strip())
                    tolerance = abs(correct_val) * 0.01  # 1% tolerance
                    is_correct = abs(user_val - correct_val) <= tolerance
                else:
                    is_correct = False
            except (ValueError, TypeError):
                is_correct = False

            answer.is_correct = is_correct
            answer.marks_obtained = test.marks_per_correct if is_correct else 0
            answer.save()

            return {
                'is_correct': is_correct,
                'is_wrong': not is_correct,
                'marks': test.marks_per_correct if is_correct else 0,
            }

        return {'is_correct': False, 'is_wrong': False, 'marks': 0}

    @classmethod
    def check_timeout(cls, attempt):
        """
        Check if a test attempt has timed out.
        If so, auto-submit with current answers.
        """
        if attempt.status != 'in_progress':
            return False

        elapsed = (timezone.now() - attempt.started_at).total_seconds()
        time_limit = attempt.test.time_limit_minutes * 60

        if elapsed >= time_limit:
            logger.info(f"Attempt {attempt.id} timed out after {elapsed}s")
            try:
                submitted_attempt = cls.submit_attempt(attempt.id)
                # Refresh to get definitive state
                attempt.refresh_from_db()
                # If the submission occurred at or after timeout, mark expired to indicate timeout-driven submission
                if attempt.submitted_at:
                    submitted_elapsed = (attempt.submitted_at - attempt.started_at).total_seconds()
                    if submitted_elapsed >= time_limit:
                        attempt.status = 'expired'
                        attempt.save(update_fields=['status'])
                return True
            except Exception as e:
                logger.exception(f"Failed to auto-submit timed-out attempt {attempt.id}: {e}")
                # Mark expired to prevent further activity
                try:
                    TestAttempt.objects.filter(pk=attempt.pk).update(status='expired')
                except Exception:
                    attempt.status = 'expired'
                    attempt.save(update_fields=['status'])
                return True

        return False

    @classmethod
    def _queue_analytics_update(cls, attempt):
        """Queue analytics update via Celery (or run synchronously if Celery unavailable)."""
        try:
            from .tasks import update_analytics_after_attempt
            # Ensure Celery app is configured and healthy via settings flag
            update_analytics_after_attempt.delay(str(attempt.id))
        except Exception as e:
            logger.warning(f"Celery unavailable or failed to enqueue analytics task: {e}. Running sync fallback.")
            # Fallback: run synchronously but protect main thread by offloading to a short-lived thread
            try:
                import threading
                t = threading.Thread(target=cls._update_analytics_sync, args=(attempt,))
                t.daemon = True
                t.start()
            except Exception:
                # Last resort: run directly
                cls._update_analytics_sync(attempt)

    @classmethod
    def _update_analytics_sync(cls, attempt):
        """Synchronous analytics update fallback."""
        from apps.analytics_v2.models import TopicPerformance
        # This will be implemented when analytics app is created
        pass

    @classmethod
    def get_attempt_result(cls, attempt):
        """Get detailed result for a submitted attempt."""
        if attempt.status not in ('submitted', 'expired'):
            raise ValueError("Attempt not yet submitted")

        answers = attempt.answers.select_related('question').prefetch_related(
            'question__options', 'selected_options'
        )

        question_results = []
        for answer in answers:
            correct_options = list(answer.question.options.filter(is_correct=True).values('id', 'text'))
            selected_options = list(answer.selected_options.values('id', 'text'))

            question_results.append({
                'question_id': str(answer.question.id),
                'question_text': answer.question.text[:200],
                'question_type': answer.question.question_type,
                'selected_options': selected_options,
                'correct_options': correct_options,
                'is_correct': answer.is_correct,
                'marks_obtained': answer.marks_obtained,
                'explanation': answer.question.explanation,
                'time_spent': answer.time_spent_seconds,
                'is_flagged': answer.is_flagged,
            })

        return {
            'attempt_id': str(attempt.id),
            'test_id': str(attempt.test.id),
            'test_title': attempt.test.title,
            'mode': attempt.mode,
            'score': attempt.score,
            'total_marks': attempt.total_marks,
            'percentage': attempt.percentage,
            'passed': attempt.passed,
            'time_taken': attempt.time_taken_seconds,
            'time_limit': attempt.test.time_limit_minutes * 60,
            'correct_count': attempt.correct_count,
            'incorrect_count': attempt.incorrect_count,
            'unanswered_count': attempt.test.question_count - attempt.correct_count - attempt.incorrect_count,
            'question_results': question_results,
        }
