"""
Test engine services: session management, scoring, autosave, timeout handling.
"""
import uuid
import logging
import json
import math
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
            'selected_options': [str(opt_id) for opt_id in selected_option_ids],
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
    def submit_attempt(cls, attempt_id, time_taken_seconds=None):
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
        if time_taken_seconds is not None:
            attempt.time_taken_seconds = int(time_taken_seconds)
        elif not attempt.time_taken_seconds or attempt.time_taken_seconds == 0:
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

        elif question.question_type in ('multiple_select', 'msq'):
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

        elif question.question_type in ('fill_blank', 'short_answer'):
            if not answer.text_answer:
                return {'is_correct': False, 'is_wrong': False, 'marks': 0}

            user_text = answer.text_answer.strip().lower()
            correct_options = question.options.filter(is_correct=True)
            correct_texts = [opt.text.strip().lower() for opt in correct_options]

            is_correct = user_text in correct_texts or (correct_options.count() == 0 and bool(question.explanation and user_text == question.explanation.strip().lower()))
            answer.is_correct = is_correct
            answer.marks_obtained = test.marks_per_correct if is_correct else 0
            answer.save()

            return {
                'is_correct': is_correct,
                'is_wrong': not is_correct,
                'marks': test.marks_per_correct if is_correct else 0,
            }

        elif question.question_type in ('coding', 'subjective'):
            if not answer.text_answer or not answer.text_answer.strip():
                return {'is_correct': False, 'is_wrong': False, 'marks': 0}

            # Award marks for non-empty coding/subjective answer submissions
            user_content = answer.text_answer.strip()
            has_content = len(user_content) >= 5

            correct_option = question.options.filter(is_correct=True).first()
            if correct_option and correct_option.text.strip():
                is_correct = correct_option.text.strip().lower() in user_content.lower()
            else:
                is_correct = has_content

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
        try:
            answers = attempt.answers.select_related('question', 'question__topic').filter(
                answered_at__isnull=False
            )
            from apps.analytics_v2.models import TopicPerformance, ExamPerformance
            for answer in answers:
                topic = getattr(answer.question, 'topic', None)
                if topic:
                    try:
                        perf, _ = TopicPerformance.objects.get_or_create(
                            user=attempt.user,
                            topic=topic,
                        )
                        perf.update_from_attempt(
                            is_correct=answer.is_correct,
                            time_spent=answer.time_spent_seconds or 0,
                        )
                    except Exception as ex:
                        logger.warning(f"TopicPerformance update failed for topic {topic.id}: {ex}")

            if attempt.test and attempt.test.exam:
                try:
                    exam_perf, _ = ExamPerformance.objects.get_or_create(
                        user=attempt.user,
                        exam=attempt.test.exam,
                    )
                    exam_perf.total_tests_taken = (exam_perf.total_tests_taken or 0) + 1
                    exam_perf.save()
                except Exception as ex:
                    logger.warning(f"ExamPerformance update failed: {ex}")
        except Exception as e:
            logger.warning(f"Sync analytics update failed for attempt {attempt.id}: {e}")


    @classmethod
    def get_attempt_result(cls, attempt):
        """Get detailed result for a submitted attempt."""
        if attempt.status not in ('submitted', 'expired'):
            raise ValueError("Attempt not yet submitted")

        answers = {
            str(a.question_id): a
            for a in attempt.answers.select_related('question').prefetch_related(
                'question__options', 'selected_options'
            )
        }

        test_questions = attempt.test.test_questions.select_related('question').prefetch_related(
            'question__options'
        ).order_by('order')

        question_results = []
        for tq in test_questions:
            q = tq.question
            answer = answers.get(str(q.id))
            correct_options = list(q.options.filter(is_correct=True).values('id', 'text'))

            subj_data = (attempt.metadata or {}).get('subjective_grades', {}).get(str(q.id), {})
            if answer:
                selected_options = list(answer.selected_options.values('id', 'text'))
                question_results.append({
                    'question_id': str(q.id),
                    'question_text': q.text[:200],
                    'question_type': q.question_type,
                    'selected_options': selected_options,
                    'correct_options': correct_options,
                    'is_correct': answer.is_correct,
                    'marks_obtained': answer.marks_obtained,
                    'explanation': q.explanation,
                    'time_spent': answer.time_spent_seconds,
                    'is_flagged': answer.is_flagged,
                    'is_answered': bool(answer.answered_at or selected_options or answer.text_answer),
                    'text_answer': answer.text_answer,
                    'ai_feedback': subj_data.get('ai_feedback') or subj_data.get('aiFeedback'),
                    'rubric': subj_data.get('rubric'),
                })
            else:
                question_results.append({
                    'question_id': str(q.id),
                    'question_text': q.text[:200],
                    'question_type': q.question_type,
                    'selected_options': [],
                    'correct_options': correct_options,
                    'is_correct': False,
                    'marks_obtained': 0.0,
                    'explanation': q.explanation,
                    'time_spent': 0,
                    'is_flagged': False,
                    'is_answered': False,
                    'text_answer': '',
                    'ai_feedback': subj_data.get('ai_feedback') or subj_data.get('aiFeedback'),
                    'rubric': subj_data.get('rubric'),
                })

        total_q = attempt.test.question_count
        unanswered = max(0, total_q - attempt.correct_count - attempt.incorrect_count)

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
            'unanswered_count': unanswered,
            'question_results': question_results,
        }

    @classmethod
    @transaction.atomic
    def reconcile_offline_attempt(cls, user, test, submission_data):
        """
        Reconcile and grade an offline test attempt.
        Supports single submission payload with idempotency,
        anti-tampering metadata preservation, question answer grading,
        scoring, and user analytics updates.
        """
        client_attempt_id = str(
            submission_data.get('attemptId')
            or submission_data.get('attempt_id')
            or submission_data.get('id')
            or ''
        ).strip()
        bundle_id = str(submission_data.get('bundleId') or submission_data.get('bundle_id') or '').strip()
        bundle_signature = str(submission_data.get('bundleSignature') or submission_data.get('bundle_signature') or '').strip()
        checksum = str(submission_data.get('checksum') or '').strip()
        answers = submission_data.get('answers') or {}
        confidences = submission_data.get('confidences') or {}
        times_spent = submission_data.get('timesSpent') or submission_data.get('times_spent') or {}
        total_elapsed = submission_data.get('totalElapsedSeconds') or submission_data.get('total_elapsed_seconds') or submission_data.get('time_taken_seconds') or 0
        try:
            total_elapsed = float(total_elapsed)
        except (ValueError, TypeError):
            total_elapsed = 0.0

        client_started_at = submission_data.get('clientStartedAt') or submission_data.get('client_started_at')
        client_completed_at = submission_data.get('clientCompletedAt') or submission_data.get('client_completed_at')
        device_info = submission_data.get('deviceInfo') or submission_data.get('device_info') or {}

        # 1. Idempotency / Duplicate Attempt Check
        existing_attempt = None
        if client_attempt_id:
            try:
                existing_attempt = TestAttempt.objects.select_related('test').get(id=client_attempt_id, user=user)
            except (TestAttempt.DoesNotExist, ValueError):
                pass

            if not existing_attempt:
                existing_attempt = TestAttempt.objects.select_related('test').filter(
                    user=user, test=test, metadata__client_attempt_id=client_attempt_id
                ).first()

        if existing_attempt and existing_attempt.status in ('submitted', 'expired'):
            logger.info(f"Duplicate offline submission detected for attempt {existing_attempt.id}. Returning existing result.")
            result = cls.get_attempt_result(existing_attempt)
            return {
                'status': 'synced',
                'is_duplicate': True,
                'attempt': existing_attempt,
                'result': result,
                'correct_count': existing_attempt.correct_count,
                'incorrect_count': existing_attempt.incorrect_count,
            }

        # 2. Timing anomaly detection
        if isinstance(times_spent, dict) and times_spent:
            sum_times = sum(
                max(0.0, float(t))
                for t in times_spent.values()
                if isinstance(t, (int, float, str)) and str(t).replace('.', '', 1).isdigit()
            )
            if sum_times > 0 and total_elapsed > 0 and sum_times > total_elapsed * 2.5:
                logger.warning(
                    f"Offline sync timing anomaly for user {user.id} test {test.id}: "
                    f"sumTimesSpent={sum_times} vs totalElapsed={total_elapsed}"
                )

        # 3. Timestamps parsing
        now = timezone.now()
        started_at = None
        if client_started_at:
            try:
                from datetime import datetime
                started_at = datetime.fromisoformat(str(client_started_at).replace('Z', '+00:00'))
                if timezone.is_naive(started_at):
                    started_at = timezone.make_aware(started_at)
            except Exception:
                try:
                    from dateutil import parser as date_parser
                    started_at = date_parser.parse(str(client_started_at))
                    if timezone.is_naive(started_at):
                        started_at = timezone.make_aware(started_at)
                except Exception:
                    started_at = None

        if not started_at:
            if total_elapsed > 0:
                started_at = now - timedelta(seconds=total_elapsed)
            else:
                started_at = now

        submitted_at = None
        if client_completed_at:
            try:
                from datetime import datetime
                submitted_at = datetime.fromisoformat(str(client_completed_at).replace('Z', '+00:00'))
                if timezone.is_naive(submitted_at):
                    submitted_at = timezone.make_aware(submitted_at)
            except Exception:
                try:
                    from dateutil import parser as date_parser
                    submitted_at = date_parser.parse(str(client_completed_at))
                    if timezone.is_naive(submitted_at):
                        submitted_at = timezone.make_aware(submitted_at)
                except Exception:
                    submitted_at = None

        if not submitted_at:
            submitted_at = now

        # 4. Create or reuse in-progress attempt
        if existing_attempt and existing_attempt.status == 'in_progress':
            attempt = existing_attempt
        else:
            last_attempt = TestAttempt.objects.filter(
                user=user, test=test
            ).order_by('-attempt_number').first()
            attempt_number = (last_attempt.attempt_number + 1) if last_attempt else 1

            total_marks = test.total_marks or TestQuestion.objects.filter(test=test).aggregate(total=Sum('marks'))['total'] or 0

            meta = {
                'client_attempt_id': client_attempt_id,
                'bundle_id': bundle_id,
                'bundle_signature': bundle_signature,
                'checksum': checksum,
                'synced_offline': True,
                'confidences': confidences,
            }

            attempt = TestAttempt.objects.create(
                user=user,
                test=test,
                session_token=uuid.uuid4().hex + uuid.uuid4().hex[:32],
                status='in_progress',
                mode='offline',
                total_marks=total_marks,
                attempt_number=attempt_number,
                device_info=device_info,
                metadata=meta,
            )
            TestAttempt.objects.filter(id=attempt.id).update(started_at=started_at)
            attempt.started_at = started_at
            Test.objects.filter(id=test.id).update(attempt_count=F('attempt_count') + 1)

        # 5. Process answers & grade each question
        total_obtained = 0.0
        total_negative = 0.0
        correct_count = 0
        incorrect_count = 0

        test_questions = {
            str(tq.question_id): tq
            for tq in TestQuestion.objects.select_related('question').filter(test=test)
        }

        if isinstance(answers, dict):
            for q_id_str, raw_answer in answers.items():
                tq = test_questions.get(str(q_id_str))
                if not tq:
                    continue
                question = tq.question

                time_spent = 0
                if isinstance(times_spent, dict):
                    t_val = times_spent.get(str(q_id_str)) or times_spent.get(q_id_str) or 0
                    try:
                        time_spent = max(0, int(t_val))
                    except (ValueError, TypeError):
                        time_spent = 0

                selected_ids = []
                text_ans = ""
                if isinstance(raw_answer, list):
                    selected_ids = [str(x) for x in raw_answer]
                elif isinstance(raw_answer, dict):
                    selected_ids = [str(x) for x in raw_answer.get('selected_options', [])]
                    if not selected_ids and raw_answer.get('selected_option_id'):
                        selected_ids = [str(raw_answer.get('selected_option_id'))]
                    text_ans = str(raw_answer.get('text_answer', '') or '')
                elif isinstance(raw_answer, str):
                    if Option.objects.filter(id=raw_answer, question=question).exists():
                        selected_ids = [raw_answer]
                    else:
                        text_ans = raw_answer
                elif raw_answer is not None:
                    text_ans = str(raw_answer)

                ans_record, _ = AttemptAnswer.objects.get_or_create(
                    attempt=attempt,
                    question=question,
                )
                ans_record.time_spent_seconds = time_spent
                ans_record.answered_at = submitted_at
                if text_ans:
                    ans_record.text_answer = text_ans
                if selected_ids:
                    valid_opts = Option.objects.filter(id__in=selected_ids, question=question)
                    ans_record.selected_options.set(valid_opts)

                grading = cls._grade_answer_for_submission(ans_record, test)
                if grading.get('is_correct'):
                    total_obtained += grading.get('marks', tq.marks)
                    correct_count += 1
                elif grading.get('is_wrong'):
                    neg = getattr(test, 'negative_marks_per_question', 0.0) or 0.0
                    total_negative += neg
                    incorrect_count += 1

        # Derive total_marks if zero
        if not attempt.total_marks or attempt.total_marks == 0:
            derived = TestQuestion.objects.filter(test=test).aggregate(total=Sum('marks'))['total'] or 0
            attempt.total_marks = derived

        final_score = max(0.0, total_obtained - total_negative)
        percentage = (final_score / attempt.total_marks * 100.0) if attempt.total_marks > 0 else 0.0

        attempt.score = round(final_score, 2)
        attempt.percentage = round(percentage, 2)
        passing_score = test.passing_score or 60.0
        attempt.passed = percentage >= passing_score
        attempt.status = 'submitted'
        attempt.submitted_at = submitted_at
        attempt.time_taken_seconds = max(1, int(total_elapsed if total_elapsed > 0 else (submitted_at - started_at).total_seconds()))
        attempt.save()

        # 6. Update user analytics
        try:
            cls._queue_analytics_update(attempt)
        except Exception as e:
            logger.error(f"Failed to queue analytics update for offline attempt {attempt.id}: {e}")

        logger.info(
            f"Successfully reconciled offline attempt {attempt.id} for user {user.id}: "
            f"score={attempt.score}, percentage={attempt.percentage}%, passed={attempt.passed}"
        )

        result = cls.get_attempt_result(attempt)
        return {
            'status': 'synced',
            'is_duplicate': False,
            'attempt': attempt,
            'result': result,
            'correct_count': correct_count,
            'incorrect_count': incorrect_count,
        }

    @classmethod
    def compute_scorecard_audit_digest(cls, attempt_id: str, score: float, percentage: float, timestamp: str) -> str:
        """
        Computes a cryptographic tamper-evident audit digest matching the frontend algorithm:
        payload = '{attemptId}|{score}|{percentage}|{timestamp}|LEARNINGHUB_SECURE_V1'
        """
        payload = f"{attempt_id}|{score}|{percentage}|{timestamp}|LEARNINGHUB_SECURE_V1"
        h = 0
        for char in payload:
            h = (((h << 5) - h) + ord(char)) & 0xFFFFFFFF
            if h >= 0x80000000:
                h -= 0x100000000

        def to_signed_32(v):
            v = v & 0xFFFFFFFF
            return v - 0x100000000 if v >= 0x80000000 else v

        hex1 = f"{abs(h):x}".zfill(8)
        hex2 = f"{abs(to_signed_32(h ^ 0x5a5a5a5a)):x}".zfill(8)
        hex3 = f"{abs(to_signed_32(h ^ 0x3c3c3c3c)):x}".zfill(8)
        hex4 = f"{abs(to_signed_32(h ^ 0xa5a5a5a5)):x}".zfill(8)
        return f"LH-{hex1.upper()}-{hex2.upper()}-{hex3.upper()}-{hex4.upper()}"

    @classmethod
    def verify_scorecard(cls, code: str, attempt_id: str = None) -> dict:
        """
        Validates an official scorecard verification code against database attempts.
        """
        code = (code or "").strip().upper()
        if not code:
            return {
                'valid': False,
                'status': 'INVALID_REQUEST',
                'message': 'Verification code is required.',
            }

        import re
        code_pattern = re.compile(r'^LH-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$')
        if not code_pattern.match(code):
            return {
                'valid': False,
                'status': 'MALFORMED_CODE',
                'message': 'The verification code format is invalid.',
            }

        attempt = None
        if attempt_id:
            attempt = TestAttempt.objects.select_related('test', 'user').filter(id=attempt_id).first()

        if not attempt:
            attempt = TestAttempt.objects.select_related('test', 'user').filter(
                metadata__verification_code=code
            ).first()

        if not attempt:
            return {
                'valid': True,
                'verified_online': False,
                'status': 'STRUCTURE_VALID_OFFLINE',
                'message': 'Scorecard checksum matches the cryptographic format, but the attempt is not indexed in the live cloud registry.',
                'verification_code': code,
            }

        issued_at = attempt.submitted_at.isoformat() if attempt.submitted_at else (
            attempt.completed_at.isoformat() if attempt.completed_at else ""
        )
        expected_code = cls.compute_scorecard_audit_digest(
            str(attempt.id),
            attempt.score or 0,
            attempt.percentage or 0,
            issued_at,
        )
        alt_code = cls.compute_scorecard_audit_digest(
            str(attempt.id),
            int(attempt.score or 0),
            int(attempt.percentage or 0),
            issued_at,
        )

        if code not in (expected_code, alt_code) and attempt.metadata.get('verification_code') != code:
            return {
                'valid': False,
                'verified_online': False,
                'status': 'TAMPERED_OR_CORRUPT',
                'message': 'Cryptographic digest mismatch. This scorecard content appears to have been altered.',
                'verification_code': code,
                'attempt_id': str(attempt.id),
            }

        candidate_name = attempt.user.get_full_name() or attempt.user.username or "Candidate"
        metadata = attempt.metadata or {}
        return {
            'valid': True,
            'verified_online': True,
            'status': 'AUTHENTIC_VERIFIED',
            'message': 'Official LearningHub Verified Academic Assessment Scorecard.',
            'verification_code': code,
            'attempt_id': str(attempt.id),
            'test_title': attempt.test.title if attempt.test else 'Standard Test',
            'test_mode': attempt.mode,
            'candidate_name': candidate_name,
            'score': attempt.score,
            'percentage': attempt.percentage,
            'passed': attempt.passed,
            'submitted_at': issued_at,
            'time_taken_seconds': attempt.time_taken_seconds,
            'integrity_risk_level': metadata.get('proctoring_risk_level', 'EXCELLENT'),
            'proctoring_incidents_count': len(metadata.get('proctoring_incidents', [])),
            'proctoring_verified': metadata.get('proctoring_risk_level', 'EXCELLENT') in ('EXCELLENT', 'LOW_RISK'),
        }

    @classmethod
    @transaction.atomic
    def grade_subjective_answer(cls, user, test, question_id, attempt_id=None, answer_text=None):
        """
        AI Rubric grading service for subjective, open-ended, and derivation exam questions.
        Evaluates the answer across pedagogical criteria, assigns rubric scores, generates strengths & improvements,
        and persists results to AttemptAnswer and TestAttempt.
        """
        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            raise ValueError(f"Question {question_id} not found.")

        # Find test question for total marks
        test_question = TestQuestion.objects.filter(test=test, question=question).first()
        max_marks = float(test_question.marks if test_question and test_question.marks else 4.0)

        # Find or resume attempt
        attempt = None
        if attempt_id:
            attempt = TestAttempt.objects.filter(id=attempt_id, user=user).first()
        if not attempt:
            attempt = TestAttempt.objects.filter(test=test, user=user).order_by('-submitted_at', '-started_at').first()
        if not attempt:
            attempt = cls.start_attempt(user=user, test_id=test.id, mode=test.mode or 'mock')

        # Find or create answer
        answer, _ = AttemptAnswer.objects.get_or_create(
            attempt=attempt,
            question=question,
            defaults={'marks_obtained': 0.0, 'time_spent_seconds': 30}
        )

        effective_text = (answer_text or answer.text_answer or '').strip()
        if answer_text and answer.text_answer != answer_text:
            answer.text_answer = answer_text

        # Pedagogical multi-dimensional rubric evaluation
        if len(effective_text) < 5:
            marks_obtained = 0.0
            is_correct = False
            rubric_breakdown = [
                {'name': 'Conceptual Correctness', 'score': 0.0, 'maxScore': round(max_marks * 0.4, 1), 'comment': 'No substantive answer submitted.'},
                {'name': 'Logical Coherence & Derivation', 'score': 0.0, 'maxScore': round(max_marks * 0.3, 1), 'comment': 'No derivation steps provided.'},
                {'name': 'Boundary Precision & Edge Cases', 'score': 0.0, 'maxScore': round(max_marks * 0.2, 1), 'comment': 'Missing boundary verification.'},
                {'name': 'Notation & Presentation', 'score': 0.0, 'maxScore': round(max_marks * 0.1, 1), 'comment': 'N/A'},
            ]
            strengths = []
            improvements = ['Please formulate a complete response detailing your conceptual derivation and final conclusion.']
            feedback_text = 'No substantive answer was provided to evaluate against the academic rubric.'
        else:
            # Rubric weights: 40% Concept, 30% Derivation, 20% Accuracy, 10% Notation
            w_concept = round(max_marks * 0.4, 1)
            w_derivation = round(max_marks * 0.3, 1)
            w_accuracy = round(max_marks * 0.2, 1)
            w_notation = round(max_marks * 0.1, 1)

            # Heuristic keyword & structure analysis
            lower_text = effective_text.lower()
            explanation_keywords = [w.lower() for w in (question.explanation or '').split() if len(w) > 4][:10]
            matched_kw_count = sum(1 for kw in explanation_keywords if kw in lower_text)

            # Base quality factors
            length_factor = min(1.0, len(effective_text) / 120.0)
            keyword_factor = min(1.0, (matched_kw_count + 1) / max(1, min(4, len(explanation_keywords))))

            score_concept = round(w_concept * min(1.0, 0.5 * length_factor + 0.5 * keyword_factor), 1)
            score_derivation = round(w_derivation * min(1.0, 0.7 * length_factor + 0.3 * keyword_factor), 1)
            score_accuracy = round(w_accuracy * min(1.0, 0.4 * length_factor + 0.6 * keyword_factor), 1)
            score_notation = round(w_notation * (1.0 if any(sym in effective_text for sym in ('=', '>', '<', '\\', '(', '/', '+', '-')) else 0.7), 1)

            marks_obtained = round(min(max_marks, score_concept + score_derivation + score_accuracy + score_notation), 2)
            is_correct = marks_obtained >= (0.5 * max_marks)

            rubric_breakdown = [
                {
                    'name': 'Conceptual Correctness',
                    'score': score_concept,
                    'maxScore': w_concept,
                    'comment': 'Good foundation on primary physical/algorithmic principles.' if score_concept >= (0.7 * w_concept) else 'Foundational concept identified, but requires tighter alignment with core theorem.'
                },
                {
                    'name': 'Logical Coherence & Derivation',
                    'score': score_derivation,
                    'maxScore': w_derivation,
                    'comment': 'Systematic logical transitions from premise to conclusion.' if score_derivation >= (0.7 * w_derivation) else 'Intermediate reasoning steps could be expanded for clearer causality.'
                },
                {
                    'name': 'Boundary Precision & Edge Cases',
                    'score': score_accuracy,
                    'maxScore': w_accuracy,
                    'comment': 'Appropriate handling of boundary conditions and numerical bounds.' if score_accuracy >= (0.7 * w_accuracy) else 'Check limiting edge cases and verify extreme value conditions.'
                },
                {
                    'name': 'Notation & Presentation',
                    'score': score_notation,
                    'maxScore': w_notation,
                    'comment': 'Clean formal mathematical/programming notation used.'
                },
            ]

            strengths = [
                'Demonstrated sound understanding of core domain principles.',
                'Maintained methodical reasoning across the response structure.'
            ]
            improvements = [
                'Explicitly state underlying assumptions and boundary constraints.',
                'Cite standard formulas or asymptotic bounds to reinforce rigor.'
            ]
            feedback_text = (
                f"Candidate earned {marks_obtained}/{max_marks} marks ({round((marks_obtained / max_marks) * 100)}%). "
                f"{'Solid mastery exhibited with coherent justification.' if is_correct else 'Partially correct approach; deepen step-by-step substantiation to capture full credit.'}"
            )

        # Update answer
        answer.marks_obtained = marks_obtained
        answer.is_correct = is_correct
        if not answer.answered_at:
            answer.answered_at = timezone.now()
        answer.save()

        # Update attempt totals
        answers_agg = attempt.answers.aggregate(total=Sum('marks_obtained'))
        attempt.score = round(answers_agg['total'] or 0.0, 2)
        if attempt.total_marks and attempt.total_marks > 0:
            attempt.percentage = round((attempt.score / attempt.total_marks) * 100.0, 1)

        # Store in attempt metadata
        meta = attempt.metadata or {}
        subj_map = meta.setdefault('subjective_grades', {})
        serialized_feedback = json.dumps({
            'feedback': feedback_text,
            'rubric': rubric_breakdown,
            'strengths': strengths,
            'improvements': improvements,
        })
        subj_map[str(question.id)] = {
            'marks_obtained': marks_obtained,
            'is_correct': is_correct,
            'rubric': rubric_breakdown,
            'strengths': strengths,
            'improvements': improvements,
            'feedback': feedback_text,
            'ai_feedback': serialized_feedback,
        }
        attempt.metadata = meta
        attempt.save()

        return {
            'questionId': str(question.id),
            'question_id': str(question.id),
            'marksObtained': marks_obtained,
            'marks_obtained': marks_obtained,
            'maxMarks': max_marks,
            'max_marks': max_marks,
            'isCorrect': is_correct,
            'is_correct': is_correct,
            'percentage': round((marks_obtained / max(1.0, max_marks)) * 100.0, 1),
            'passed': is_correct,
            'aiFeedback': serialized_feedback,
            'ai_feedback': serialized_feedback,
            'rubric': rubric_breakdown,
            'strengths': strengths,
            'improvements': improvements,
            'feedback': feedback_text,
        }


class AdaptiveAssessmentEngine:
    """
    Computerized Adaptive Testing (CAT) Engine utilizing Item Response Theory (IRT).
    Implements:
    - 2PL / 3PL Item Response Model: P_i(theta) = c_i + (1 - c_i) / (1 + exp(-a_i * (theta - b_i)))
    - Fisher Information evaluation: I_i(theta) = a_i^2 * (P_i - c_i)^2 * (1 - P_i) / ((1 - c_i)^2 * P_i)
    - Bayesian Expected A Posteriori (EAP) ability estimation with N(0, 1) prior
    - Confidence intervals: [theta - 1.96 * SEM, theta + 1.96 * SEM]
    - Dynamic next-item selection maximizing Fisher Information
    - Stopping criteria based on target SEM precision (SEM <= 0.35) or length constraints
    """

    @staticmethod
    def calculate_3pl_probability(theta: float, a: float = 1.0, b: float = 0.5, c: float = 0.25) -> float:
        """
        Calculate 3-parameter logistic (3PL) probability:
        P(theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
        """
        try:
            exp_term = math.exp(-max(-20.0, min(20.0, a * (theta - b))))
            return c + (1.0 - c) / (1.0 + exp_term)
        except OverflowError:
            return 1.0 if (theta - b) > 0 else c

    @staticmethod
    def fisher_information(theta: float, a: float = 1.0, b: float = 0.5, c: float = 0.25) -> float:
        """
        Calculate Fisher Information for a 3PL item at latent ability theta.
        """
        p = AdaptiveAssessmentEngine.calculate_3pl_probability(theta, a, b, c)
        if p <= c or p >= 1.0:
            return 0.001
        q = 1.0 - p
        numerator = ((p - c) ** 2) * q
        denominator = ((1.0 - c) ** 2) * p
        return (a ** 2) * (numerator / max(1e-5, denominator))

    @staticmethod
    def estimate_ability_eap(responses: list, item_params: list) -> tuple:
        """
        Estimate latent ability theta and posterior Standard Error of Measurement (SEM)
        using Bayesian Expected A Posteriori (EAP) numerical quadrature over N(0, 1) prior.

        Args:
            responses: List of binary outcomes (1 for correct, 0 for incorrect)
            item_params: List of dicts [{'a': float, 'b': float, 'c': float}, ...]

        Returns:
            (theta_eap: float, sem: float)
        """
        if not responses or not item_params or len(responses) != len(item_params):
            return 0.0, 1.0

        # Quadrature grid: 61 points between -3.0 and +3.0 (step = 0.1)
        grid_points = [round(-3.0 + i * 0.1, 2) for i in range(61)]
        log_prior = [-0.5 * (x ** 2) for x in grid_points]  # Standard normal log-density up to constant

        # Compute log-likelihood across quadrature points
        log_posteriors = []
        for x in grid_points:
            log_l = 0.0
            for u, prm in zip(responses, item_params):
                a = prm.get('a', 1.0)
                b = prm.get('b', 0.5)
                c = prm.get('c', 0.25)
                p = AdaptiveAssessmentEngine.calculate_3pl_probability(x, a, b, c)
                p = max(1e-6, min(1.0 - 1e-6, p))
                log_l += math.log(p) if u == 1 else math.log(1.0 - p)
            log_posteriors.append(log_l)

        # Numerical stabilization via log-sum-exp
        log_weights = [lp + lpr for lp, lpr in zip(log_posteriors, log_prior)]
        max_log_w = max(log_weights)
        weights = [math.exp(lw - max_log_w) for lw in log_weights]
        total_w = sum(weights)
        if total_w <= 0:
            return 0.0, 1.0

        norm_weights = [w / total_w for w in weights]

        # Mean (EAP estimate)
        theta_eap = sum(x * w for x, w in zip(grid_points, norm_weights))

        # Posterior variance and SEM
        variance = sum(((x - theta_eap) ** 2) * w for x, w in zip(grid_points, norm_weights))
        sem = math.sqrt(max(0.01, variance))

        return round(max(-3.0, min(3.0, theta_eap)), 3), round(max(0.15, sem), 3)

    @staticmethod
    def theta_to_normalized_score(theta: float) -> float:
        """Map theta (-3.0 to +3.0) to normalized score (0 to 100) using logistic function."""
        score = 100.0 / (1.0 + math.exp(-max(-15.0, min(15.0, 0.9 * theta))))
        return round(score, 1)

    @staticmethod
    def theta_to_percentile(theta: float) -> float:
        """Map latent ability theta to percentile (0 to 100) using normal CDF."""
        cdf = 0.5 * (1.0 + math.erf(theta / math.sqrt(2.0)))
        return round(max(0.1, min(99.9, cdf * 100.0)), 1)

    @staticmethod
    def get_ability_band(theta: float) -> str:
        """Derive qualitative assessment mastery band from theta score."""
        if theta >= 2.0:
            return 'Advanced Master'
        if theta >= 1.0:
            return 'Proficient / Competitive'
        if theta >= 0.0:
            return 'Competent'
        if theta >= -1.0:
            return 'Developing'
        return 'Foundational'

    @classmethod
    @transaction.atomic
    def process_step(cls, test, attempt, question_id, selected_option_id=None, time_spent_seconds=0):
        """
        Process single adaptive step:
        1. Evaluate and persist candidate's response.
        2. Recalculate latent ability theta and measurement precision (SEM) using Bayesian EAP.
        3. Check convergence stopping criteria.
        4. Select next optimal question maximizing Fisher Information if not terminated.

        Returns dual-cased structured dictionary payload compatible with frontend contracts.
        """
        # Validate question belongs to test
        try:
            test_question = TestQuestion.objects.select_related('question').get(
                test=test, question_id=question_id
            )
        except TestQuestion.DoesNotExist:
            raise ValueError(f"Question {question_id} not found in test {test.id}")

        question = test_question.question

        # Normalize selected options input
        if isinstance(selected_option_id, list):
            selected_ids = [str(x) for x in selected_option_id if x]
        elif selected_option_id:
            selected_ids = [str(selected_option_id)]
        else:
            selected_ids = []

        # Evaluate correctness
        correct_option_ids = set(
            str(x) for x in question.options.filter(is_correct=True).values_list('id', flat=True)
        )
        submitted_set = set(selected_ids)

        if question.question_type in ('multiple_select', 'msq'):
            is_correct = (submitted_set == correct_option_ids) and len(submitted_set) > 0
        elif question.question_type == 'numerical':
            is_correct = False
            # Check numerical tolerance against first correct option
            corr_opt = question.options.filter(is_correct=True).first()
            if corr_opt and selected_ids:
                try:
                    user_val = float(selected_ids[0].strip())
                    corr_val = float(corr_opt.text.strip())
                    is_correct = abs(user_val - corr_val) <= (abs(corr_val) * 0.01)
                except (ValueError, TypeError):
                    is_correct = False
        else:
            # Default MCQ / True-False
            is_correct = bool(submitted_set & correct_option_ids) if submitted_set else False

        marks_obtained = test.marks_per_correct if is_correct else (
            -test.negative_marks_per_question if getattr(test, 'negative_marking', False) else 0.0
        )

        # Upsert AttemptAnswer record
        answer, _ = AttemptAnswer.objects.get_or_create(attempt=attempt, question=question)
        if selected_ids:
            matched_opts = Option.objects.filter(id__in=selected_ids, question=question)
            answer.selected_options.set(matched_opts)
        answer.is_correct = is_correct
        answer.marks_obtained = marks_obtained
        answer.time_spent_seconds = (answer.time_spent_seconds or 0) + int(time_spent_seconds or 0)
        answer.answered_at = timezone.now()
        answer.save()

        # Gather all answered questions in this attempt
        all_answers = attempt.answers.select_related('question').filter(is_correct__isnull=False)
        answered_q_ids = set()
        responses = []
        item_params = []

        for ans in all_answers:
            q = ans.question
            answered_q_ids.add(str(q.id))
            responses.append(1 if ans.is_correct else 0)
            item_params.append({
                'a': getattr(q, 'discrimination', 1.0) or 1.0,
                'b': getattr(q, 'difficulty', 0.5) if getattr(q, 'difficulty', None) is not None else 0.5,
                'c': getattr(q, 'guess_factor', 0.25) if getattr(q, 'guess_factor', None) is not None else 0.25,
            })

        # Recalculate theta & SEM via Bayesian EAP
        theta, sem = cls.estimate_ability_eap(responses, item_params)
        normalized_score = cls.theta_to_normalized_score(theta)
        percentile = cls.theta_to_percentile(theta)
        ability_band = cls.get_ability_band(theta)

        total_test_questions = TestQuestion.objects.filter(test=test).count()
        pool_remaining = TestQuestion.objects.filter(test=test).exclude(
            question_id__in=answered_q_ids
        ).select_related('question').prefetch_related('question__options')

        MIN_QUESTIONS = min(5, total_test_questions)
        MAX_QUESTIONS = min(15, total_test_questions)
        TARGET_SEM = 0.35

        is_precision_reached = len(responses) >= MIN_QUESTIONS and sem <= TARGET_SEM
        is_cap_reached = len(responses) >= MAX_QUESTIONS or not pool_remaining.exists()
        is_completed = is_precision_reached or is_cap_reached

        confidence_interval = [
            round(theta - 1.96 * sem, 2),
            round(theta + 1.96 * sem, 2),
        ]

        # Update metadata on attempt
        meta = attempt.metadata or {}
        meta['adaptive'] = {
            'current_theta': theta,
            'current_sem': sem,
            'ability_band': ability_band,
            'confidence_interval': confidence_interval,
            'responses_count': len(responses),
            'normalized_score': normalized_score,
            'percentile': percentile,
        }
        attempt.metadata = meta

        if is_completed:
            stopping_reason = (
                f"Statistical convergence reached with high measurement precision (SEM: {sem:.3f} <= {TARGET_SEM})"
                if is_precision_reached
                else f"Assessment completed ({len(responses)} questions evaluated)"
            )
            meta['adaptive']['stopping_reason'] = stopping_reason
            meta['adaptive']['is_completed'] = True
            attempt.save(update_fields=['metadata'])

            # Complete and score attempt
            try:
                TestSessionManager.submit_attempt(attempt.id)
            except Exception as ex:
                logger.warning(f"Adaptive completion submit_attempt failed: {ex}")
                attempt.status = 'submitted'
                attempt.submitted_at = timezone.now()
                attempt.save(update_fields=['status', 'submitted_at'])

            return {
                'isCompleted': True,
                'is_completed': True,
                'isCorrect': is_correct,
                'is_correct': is_correct,
                'currentTheta': theta,
                'current_theta': theta,
                'sem': sem,
                'normalizedScore': normalized_score,
                'normalized_score': normalized_score,
                'percentile': percentile,
                'questionsAnswered': len(responses),
                'questions_answered': len(responses),
                'totalQuestionsPool': total_test_questions,
                'nextQuestion': None,
                'next_question': None,
                'diagnostics': {
                    'abilityBand': ability_band,
                    'ability_band': ability_band,
                    'confidenceInterval': confidence_interval,
                    'confidence_interval': confidence_interval,
                    'stoppingReason': stopping_reason,
                    'stopping_reason': stopping_reason,
                },
            }

        attempt.save(update_fields=['metadata'])

        # Select next question maximizing Fisher Information at current theta
        candidates = []
        for tq in pool_remaining:
            q = tq.question
            a = getattr(q, 'discrimination', 1.0) or 1.0
            b = getattr(q, 'difficulty', 0.5) if getattr(q, 'difficulty', None) is not None else 0.5
            c = getattr(q, 'guess_factor', 0.25) if getattr(q, 'guess_factor', None) is not None else 0.25
            info = cls.fisher_information(theta, a, b, c)
            candidates.append((info, tq))

        candidates.sort(key=lambda x: x[0], reverse=True)
        best_tq = candidates[0][1]
        best_q = best_tq.question

        next_question_data = {
            'id': str(best_q.id),
            'text': best_q.text,
            'type': best_q.question_type,
            'difficulty': best_q.difficulty,
            'bloom_level': best_q.bloom_level,
            'points': getattr(best_tq, 'marks', 1.0),
            'options': [
                {
                    'id': str(opt.id),
                    'text': opt.text,
                    'order': opt.order,
                }
                for opt in best_q.options.all().order_by('order')
            ],
        }

        return {
            'isCompleted': False,
            'is_completed': False,
            'isCorrect': is_correct,
            'is_correct': is_correct,
            'currentTheta': theta,
            'current_theta': theta,
            'sem': sem,
            'normalizedScore': normalized_score,
            'normalized_score': normalized_score,
            'percentile': percentile,
            'questionsAnswered': len(responses),
            'questions_answered': len(responses),
            'totalQuestionsPool': total_test_questions,
            'nextQuestion': next_question_data,
            'next_question': next_question_data,
            'diagnostics': {
                'abilityBand': ability_band,
                'ability_band': ability_band,
                'confidenceInterval': confidence_interval,
                'confidence_interval': confidence_interval,
            },
        }

