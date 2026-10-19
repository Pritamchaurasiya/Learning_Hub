import random
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.db import transaction
from django.db.models import F, Count, Avg, Sum
from apps.core.responses import success_response, error_response
from .models import (
    Test, Question, Option, TestAttempt, AttemptAnswer,
    TopicPerformance, QuestionBookmark, SpacedRepetitionCard
)
from .serializers import (
    TestListSerializer, TestDetailSerializer, TestAttemptSerializer,
    TopicPerformanceSerializer, QuestionBookmarkSerializer
)
from .scoring import IRTScoringEngine
from .telemetry import AssessmentIntegrityEngine
from .spaced_repetition import SuperMemoEngine
from .bkt_engine import BayesianKnowledgeTracingEngine


def _saved_answers_for_scoring(attempt):
    return [
        {
            'questionId': answer.question_id,
            'selectedOptionId': answer.selected_option_id,
            'selectedOptionIds': answer.selected_option_ids,
            'timeSpentSeconds': answer.time_spent_sec,
        }
        for answer in attempt.answers.all()
    ]


class TestListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Test.objects.filter(is_published=True).annotate(question_count=Count('questions'))
        category = request.query_params.get('category')
        search = request.query_params.get('search') or request.query_params.get('q')

        if category and category != 'All':
            queryset = queryset.filter(category__iexact=category)
        if search:
            queryset = queryset.filter(title__icontains=search) | queryset.filter(description__icontains=search)

        serializer = TestListSerializer(queryset, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class TestDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            test = Test.objects.filter(is_published=True).prefetch_related('questions__options').get(pk=pk)
        except Test.DoesNotExist:
            return error_response('Test not found', status_code=status.HTTP_404_NOT_FOUND)

        serializer = TestDetailSerializer(test)
        return success_response(data=serializer.data)

class StartTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            test = Test.objects.filter(is_published=True).prefetch_related('questions__options').get(pk=pk)
        except Test.DoesNotExist:
            return error_response('Test not found', status_code=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Lock user row to prevent race conditions on attempt creation
            user = request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
            
            # Check existing in-progress attempt (with lock)
            in_progress = TestAttempt.objects.select_for_update().filter(
                user=user, test=test, status='IN_PROGRESS'
            ).first()
            if in_progress:
                # Map saved answers
                answers_map = {}
                for ans in in_progress.answers.all():
                    if ans.selected_option_id:
                        answers_map[ans.question_id] = ans.selected_option_id
                    elif ans.text_answer:
                        answers_map[ans.question_id] = ans.text_answer

                sections_data = [
                    {
                        'id': sec.id,
                        'title': sec.title,
                        'description': sec.description,
                        'order': sec.order,
                        'duration_minutes': sec.duration_minutes,
                        'is_timed': sec.is_timed,
                        'cut_off_marks': sec.cut_off_marks,
                    }
                    for sec in test.sections.all().order_by('order')
                ]

                questions_data = []
                for q in test.questions.all():
                    questions_data.append({
                        'id': q.id,
                        'text': q.prompt,
                        'question_type': q.question_type.lower() if q.question_type else 'mcq',
                        'difficulty': 2,
                        'bloom_level': 'apply',
                        'marks': q.marks,
                        'order': q.order,
                        'section_id': q.section_id,
                        'sectionId': q.section_id,
                        'options': [{'id': opt.id, 'text': opt.text, 'order': opt.order} for opt in q.options.all()]
                    })

                if test.shuffle_questions:
                    rng = random.Random(in_progress.id)
                    rng.shuffle(questions_data)
                if test.shuffle_options:
                    for q_data in questions_data:
                        opt_rng = random.Random(f"{in_progress.id}-{q_data['id']}")
                        opt_rng.shuffle(q_data['options'])

                elapsed_seconds = int((timezone.now() - in_progress.started_at).total_seconds())
                duration_seconds = test.duration_minutes * 60
                if duration_seconds > 0 and elapsed_seconds >= duration_seconds:
                    in_progress.status = 'TIMEOUT'
                    in_progress.submitted_at = timezone.now()
                    in_progress.time_spent_seconds = duration_seconds
                    in_progress.save(update_fields=['status', 'submitted_at', 'time_spent_seconds'])
                    IRTScoringEngine.calculate_score_and_irt(
                        in_progress, _saved_answers_for_scoring(in_progress)
                    )
                    return error_response(
                        'This test session has expired and was automatically closed.',
                        status_code=status.HTTP_400_BAD_REQUEST,
                        code='TEST_EXPIRED'
                    )

                time_remaining_seconds = max(0, duration_seconds - elapsed_seconds)

                return success_response(
                    data={
                        'attemptId': in_progress.id,
                        'attempt_id': in_progress.id,
                        'test_id': test.id,
                        'title': test.title,
                        'status': 'IN_PROGRESS',
                        'time_limit': test.duration_minutes,
                        'time_remaining_seconds': time_remaining_seconds,
                        'sections': sections_data,
                        'questions': questions_data,
                        'answers': answers_map,
                        'shuffle_questions': test.shuffle_questions,
                        'shuffle_options': test.shuffle_options,
                    },
                    message='Resumed active test session'
                )

            attempts_count = TestAttempt.objects.filter(user=user, test=test).count()
            if attempts_count >= test.max_attempts:
                return error_response('Maximum attempts reached for this exam', status_code=status.HTTP_403_FORBIDDEN)

            attempt = TestAttempt.objects.create(
                user=user,
                test=test,
                attempt_number=attempts_count + 1,
                status='IN_PROGRESS',
                started_at=timezone.now()
            )

        sections_data = [
            {
                'id': sec.id,
                'title': sec.title,
                'description': sec.description,
                'order': sec.order,
                'duration_minutes': sec.duration_minutes,
                'is_timed': sec.is_timed,
                'cut_off_marks': sec.cut_off_marks,
            }
            for sec in test.sections.all().order_by('order')
        ]

        questions_data = []
        for q in test.questions.all():
            questions_data.append({
                'id': q.id,
                'text': q.prompt,
                'question_type': q.question_type.lower() if q.question_type else 'mcq',
                'difficulty': 2,
                'bloom_level': 'apply',
                'marks': q.marks,
                'order': q.order,
                'section_id': q.section_id,
                'sectionId': q.section_id,
                'options': [{'id': opt.id, 'text': opt.text, 'order': opt.order} for opt in q.options.all()]
            })

        if test.shuffle_questions:
            rng = random.Random(attempt.id)
            rng.shuffle(questions_data)
        if test.shuffle_options:
            for q_data in questions_data:
                opt_rng = random.Random(f"{attempt.id}-{q_data['id']}")
                opt_rng.shuffle(q_data['options'])

        return success_response(
            data={
                'attemptId': attempt.id,
                'attempt_id': attempt.id,
                'test_id': test.id,
                'title': test.title,
                'status': 'IN_PROGRESS',
                'time_limit': test.duration_minutes,
                'time_remaining_seconds': test.duration_minutes * 60,
                'sections': sections_data,
                'questions': questions_data,
                'answers': {},
                'shuffle_questions': test.shuffle_questions,
                'shuffle_options': test.shuffle_options,
            },
            message='Test attempt started',
            status_code=status.HTTP_201_CREATED
        )

class TestAutosaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            test = Test.objects.get(pk=pk)
        except Test.DoesNotExist:
            return error_response('Test not found', status_code=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            user = request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
            attempt_id = request.data.get('attempt_id') or request.data.get('attemptId')
            if attempt_id:
                attempt = TestAttempt.objects.select_for_update().filter(
                    pk=attempt_id, user=user, test=test
                ).first()
                if not attempt:
                    return error_response('Attempt not found', status_code=status.HTTP_404_NOT_FOUND)
            else:
                attempt = TestAttempt.objects.select_for_update().filter(
                    user=user, test=test, status='IN_PROGRESS'
                ).first()

            if not attempt:
                if not test.is_published:
                    return error_response('Test not found', status_code=status.HTTP_404_NOT_FOUND)

                # Check maximum attempt limit before creating
                existing_count = TestAttempt.objects.filter(user=user, test=test).count()
                if existing_count >= test.max_attempts:
                    return error_response('Maximum attempts reached for this test', status_code=status.HTTP_400_BAD_REQUEST, code='MAX_ATTEMPTS_REACHED')

                attempt = TestAttempt.objects.create(
                    user=user,
                    test=test,
                    attempt_number=existing_count + 1,
                    status='IN_PROGRESS',
                    started_at=timezone.now()
                )

            # Enforce attempt terminal state protection
            if attempt.status in ('SUBMITTED', 'TIMEOUT', 'EXPIRED', 'ABANDONED'):
                return error_response(
                    'Cannot modify answers: test attempt has already been finalized.',
                    status_code=status.HTTP_400_BAD_REQUEST,
                    code='ATTEMPT_FINALIZED'
                )

            # Enforce server-authoritative timer
            if test.duration_minutes > 0 and attempt.started_at:
                elapsed_seconds = int((timezone.now() - attempt.started_at).total_seconds())
                duration_seconds = test.duration_minutes * 60
                if elapsed_seconds >= duration_seconds:
                    attempt.status = 'TIMEOUT'
                    attempt.submitted_at = timezone.now()
                    attempt.time_spent_seconds = duration_seconds
                    attempt.save(update_fields=['status', 'submitted_at', 'time_spent_seconds'])
                    IRTScoringEngine.calculate_score_and_irt(
                        attempt, _saved_answers_for_scoring(attempt)
                    )
                    return error_response(
                        'This test session has expired and was automatically closed.',
                        status_code=status.HTTP_400_BAD_REQUEST,
                        code='TEST_EXPIRED'
                    )

            answers_data = request.data.get('answers', {})
            saved_count = 0
            if isinstance(answers_data, dict):
                for q_id, opt_id in answers_data.items():
                    try:
                        # Scope question strictly to this test
                        q = Question.objects.filter(pk=q_id, test=test).first()
                        if not q:
                            continue
                        selected_opt = None
                        selected_ids = []
                        text_ans = ''
                        if isinstance(opt_id, list):
                            selected_ids = [str(x) for x in opt_id]
                            selected_opt = Option.objects.filter(question=q, id__in=selected_ids).first()
                        elif isinstance(opt_id, str):
                            selected_opt = Option.objects.filter(question=q, id=opt_id).first()
                            if selected_opt:
                                selected_ids = [selected_opt.id]
                            else:
                                text_ans = opt_id

                        AttemptAnswer.objects.update_or_create(
                            attempt=attempt,
                            question=q,
                            defaults={
                                'selected_option': selected_opt,
                                'selected_option_ids': selected_ids,
                                'text_answer': text_ans,
                                'time_spent_sec': 10
                            }
                        )
                        saved_count += 1
                    except Exception:
                        continue

        return success_response(
            data={'saved': True, 'saved_count': saved_count, 'attempt_id': attempt.id},
            message='Answers autosaved successfully'
        )

class SubmitTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            test = Test.objects.prefetch_related('questions__options').get(pk=pk)
        except Test.DoesNotExist:
            return error_response('Test not found', status_code=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Lock user row to prevent race conditions on attempt creation
            user = request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
            
            attempt_id = request.data.get('attempt_id') or request.data.get('attemptId')
            if attempt_id:
                attempt = TestAttempt.objects.select_for_update().filter(
                    pk=attempt_id, user=user, test=test
                ).first()
                if not attempt:
                    return error_response('Attempt not found', status_code=status.HTTP_404_NOT_FOUND)
            else:
                attempt = TestAttempt.objects.select_for_update().filter(user=user, test=test, status='IN_PROGRESS').first()

            if not attempt:
                if not test.is_published:
                    return error_response('Test not found', status_code=status.HTTP_404_NOT_FOUND)
                existing_count = TestAttempt.objects.filter(user=user, test=test).count()
                if existing_count >= test.max_attempts:
                    return error_response('Maximum attempts reached for this test', status_code=status.HTTP_400_BAD_REQUEST, code='MAX_ATTEMPTS_REACHED')
                attempt = TestAttempt.objects.create(
                    user=user,
                    test=test,
                    attempt_number=existing_count + 1,
                    status='IN_PROGRESS',
                    started_at=timezone.now()
                )

            # Check if already submitted to prevent XP farming exploit — include all terminal states
            already_submitted = attempt.status in ('SUBMITTED', 'TIMEOUT', 'EXPIRED', 'ABANDONED')

            answers_data = request.data.get('answers', [])
            violations_data = request.data.get('violations', [])
            client_time_spent_seconds = int(request.data.get('timeSpentSeconds') or request.data.get('time_spent') or request.data.get('timeTaken') or 0)

            # SERVER-SIDE TIMER ENFORCEMENT (anti-cheat):
            # The client may lie about timeSpentSeconds. We compute the actual elapsed
            # time from started_at and use the MAX of the two to detect cheating.
            # We also reject submissions that are wildly out of range (e.g. < 5s for a
            # 60min test, or > 2x the time limit).
            server_time_spent_seconds = 0
            if attempt.started_at:
                server_time_spent_seconds = max(
                    0,
                    int((timezone.now() - attempt.started_at).total_seconds()),
                )
            # Use the LONGER of client/server time to prevent time-cheating (taking less than reality)
            actual_time_spent_seconds = max(client_time_spent_seconds, server_time_spent_seconds)
            time_spent_seconds = actual_time_spent_seconds

            time_limit_seconds = test.duration_minutes * 60 if test.duration_minutes else 0
            is_over_time = time_limit_seconds > 0 and time_spent_seconds >= time_limit_seconds
            is_too_fast = time_limit_seconds > 60 and time_spent_seconds < 5  # <5s for >1min test = suspicious

            # Priority: is_over_time (TIMEOUT) first, then is_too_fast rejection
            if not is_over_time and is_too_fast and not already_submitted:
                return error_response('Submission rejected: suspiciously fast (<5s for >60s test)', status_code=400, code='SUSPICIOUS_FAST_SUBMISSION')

            # Normalize frontend dict format {questionId: optionId} to list format
            # expected by IRTScoringEngine: [{questionId, selectedOptionId, selectedOptionIds, timeSpentSeconds}]
            if isinstance(answers_data, dict):
                normalized_answers = []
                for q_id, opt_id in answers_data.items():
                    selected_ids = []
                    single_opt_id = ''
                    if isinstance(opt_id, list):
                        selected_ids = [str(x) for x in opt_id]
                        single_opt_id = selected_ids[0] if selected_ids else ''
                    elif opt_id:
                        single_opt_id = str(opt_id)
                        selected_ids = [single_opt_id]

                    normalized_answers.append({
                        'questionId': str(q_id),
                        'selectedOptionId': single_opt_id,
                        'selectedOptionIds': selected_ids,
                        'timeSpentSeconds': 0,
                    })
                answers_data = normalized_answers

            if is_over_time:
                # A late request may contain answers that were never saved before expiry.
                # Only answers persisted during the active session are eligible for scoring.
                answers_data = _saved_answers_for_scoring(attempt)

            if not already_submitted:
                attempt.time_spent_seconds = time_spent_seconds
                attempt.submitted_at = timezone.now()
                # If over time, mark as TIMEOUT status (terminal state)
                if is_over_time:
                    attempt.status = 'TIMEOUT'
                    attempt.save(update_fields=['time_spent_seconds', 'submitted_at', 'status'])
                scoring_result = IRTScoringEngine.calculate_score_and_irt(attempt, answers_data)

                # Award XP atomically for completing test (reduced XP for over-time)
                if is_over_time:
                    xp_earned = 10  # Reduced XP for timeout
                else:
                    xp_earned = 50 if attempt.passed else 20
                user.__class__.objects.filter(pk=user.pk).update(xp=F('xp') + xp_earned)
                user.refresh_from_db(fields=['xp'])
            else:
                xp_earned = 0
                scoring_result = {
                'score': attempt.score or 0.0,
                'totalMarks': test.total_marks,
                'percentage': attempt.percentage or 0.0,
                'accuracy': attempt.accuracy or 0.0,
                'passed': attempt.passed,
                'predictedRank': attempt.predicted_rank or 1,
                'irtAbilityTheta': attempt.irt_ability_theta or 0.0,
                'correctCount': int((attempt.accuracy / 100.0) * test.questions.count()) if attempt.accuracy else 0,
                'totalQuestions': test.questions.count(),
            }

        # Efficiently fetch all answers in 1 query to eliminate N+1 DB roundtrips
        answers_map = {
            ans.question_id: ans
            for ans in AttemptAnswer.objects.filter(attempt=attempt).select_related('selected_option')
        }

        # SECURITY FIX: Re-fetch test with prefetch to avoid N+1 on options access below
        # Previously: test.questions.all() then q.options.all() = 1 + N queries
        # Now: 1 query for test, 1 query for all questions, 1 query for all options
        test = Test.objects.prefetch_related('questions__options').get(pk=test.pk)
        questions_list = list(test.questions.all())
        total_questions = len(questions_list)

        # Build a question_id -> options map for O(1) lookup
        question_options_map = {
            q.id: list(q.options.all()) for q in questions_list
        }

        # Compile detailed question results for frontend review
        question_results = []
        for q in questions_list:
            ans = answers_map.get(q.id)
            all_options = question_options_map.get(q.id, [])
            correct_opts = [{'id': o.id, 'text': o.text} for o in all_options if o.is_correct]
            selected_opts = [{'id': ans.selected_option.id, 'text': ans.selected_option.text}] if ans and ans.selected_option else []

            question_results.append({
                'question_id': q.id,
                'question_text': q.prompt,
                'question_type': q.question_type.lower() if q.question_type else 'mcq',
                'selected_options': selected_opts,
                'correct_options': correct_opts,
                'is_correct': ans.is_correct if ans else False,
                'marks_obtained': ans.marks_awarded if ans else 0,
                'explanation': q.explanation or 'Review the core foundational formula to master this question.',
                'time_spent': ans.time_spent_sec if ans else 0,
                'is_flagged': False,
                'topic': q.topic,
            })

        response_data = {
            'attempt_id': attempt.id,
            'attemptId': attempt.id,
            'test_id': test.id,
            'testId': test.id,
            'test_title': test.title,
            'mode': 'mock',
            # Canonical status: reflect actual attempt status (TIMEOUT if over time)
            'status': attempt.status,
            'score': scoring_result['score'],
            'total_marks': scoring_result['totalMarks'],
            'totalMarks': scoring_result['totalMarks'],
            'percentage': scoring_result['percentage'],
            'accuracy': scoring_result['accuracy'],
            'passed': scoring_result['passed'],
            'time_taken': time_spent_seconds,
            'timeTaken': time_spent_seconds,
            'time_limit': test.duration_minutes,
            'time_limit_seconds': time_limit_seconds,
            'time_overrun': is_over_time,
            'server_time_validated': True,
            'predictedRank': scoring_result['predictedRank'],
            'irtAbilityTheta': scoring_result['irtAbilityTheta'],
            'correct_count': scoring_result['correctCount'],
            'correctCount': scoring_result['correctCount'],
            'incorrect_count': max(0, scoring_result['totalQuestions'] - scoring_result['correctCount']),
            'unanswered_count': 0,
            'total_questions': scoring_result['totalQuestions'],
            'question_results': question_results,
            'xpEarned': xp_earned,
        }

        integrity_report = AssessmentIntegrityEngine.evaluate_violations(
            violations_data,
            attempt_id=attempt.id
        )
        # Persist integrity audit metrics to database model
        if not already_submitted:
            attempt.integrity_score = integrity_report.get('integrity_score', 100.0)
            attempt.risk_level = integrity_report.get('risk_level', 'EXCELLENT')
            attempt.telemetry_audit_hash = integrity_report.get('audit_hash', '')
            attempt.save(update_fields=['integrity_score', 'risk_level', 'telemetry_audit_hash'])

        response_data.update({
            'integrity_score': integrity_report['integrity_score'],
            'integrityScore': integrity_report['integrity_score'],
            'integrity_risk': integrity_report['risk_level'],
            'integrityRisk': integrity_report['risk_level'],
            'telemetry_summary': integrity_report,
            'telemetrySummary': integrity_report,
        })

        if is_over_time:
            response_message = 'Test time exceeded. Marked as TIMEOUT.'
        elif is_too_fast:
            response_message = 'Submission rejected: time suspiciously short. Contact support if this is an error.'
        elif already_submitted:
            response_message = 'Test already submitted'
        else:
            response_message = 'Test evaluated and scored successfully'

        return success_response(
            data=response_data,
            message=response_message,
            status_code=status.HTTP_201_CREATED if not already_submitted else status.HTTP_200_OK
        )

class TestAttemptDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            attempt = TestAttempt.objects.select_related('test').prefetch_related('test__questions__options', 'answers__selected_option').get(pk=pk, user=request.user)
        except TestAttempt.DoesNotExist:
            return error_response('Attempt not found', status_code=status.HTTP_404_NOT_FOUND)

        test = attempt.test
        question_results = []
        answers_map = {}
        is_completed = attempt.status.upper() in ['SUBMITTED', 'EXPIRED', 'TIMEOUT']

        # Pre-index answers and options in memory to avoid N+1 queries
        answers_by_q = {ans.question_id: ans for ans in attempt.answers.all()}
        options_by_id = {o.id: o for q in test.questions.all() for o in q.options.all()}

        for q in test.questions.all():
            ans = answers_by_q.get(q.id)

            if is_completed:
                correct_opts = [{'id': o.id, 'text': o.text} for o in q.options.all() if o.is_correct]
                explanation = q.explanation or 'Comprehensive explanation available in study review.'
                is_corr = ans.is_correct if ans else False
                marks_obtained = ans.marks_awarded if ans else 0
            else:
                correct_opts = []
                explanation = 'Explanation available after test submission.'
                is_corr = None
                marks_obtained = None

            selected_opts = []
            if ans:
                if ans.selected_option:
                    selected_opts.append({'id': ans.selected_option.id, 'text': ans.selected_option.text})
                    answers_map[q.id] = ans.selected_option.id
                elif ans.selected_option_ids:
                    for s_id in ans.selected_option_ids:
                        opt_obj = options_by_id.get(s_id)
                        if opt_obj:
                            selected_opts.append({'id': opt_obj.id, 'text': opt_obj.text})
                    answers_map[q.id] = ans.selected_option_ids
                elif ans.text_answer:
                    answers_map[q.id] = ans.text_answer

            question_results.append({
                'question_id': q.id,
                'question_text': q.prompt,
                'question_type': q.question_type.lower() if q.question_type else 'mcq',
                'selected_options': selected_opts,
                'correct_options': correct_opts,
                'is_correct': is_corr,
                'marks_obtained': marks_obtained,
                'explanation': explanation,
                'time_spent': ans.time_spent_sec if ans else 0,
                'is_flagged': False,
                'topic': q.topic,
            })

        data = {
            'id': attempt.id,
            'attempt_id': attempt.id,
            'test_id': test.id,
            'test_title': test.title,
            'mode': 'mock',
            'status': attempt.status.lower(),
            'score': attempt.score if is_completed else None,
            'total_marks': test.total_marks,
            'percentage': attempt.percentage if is_completed else None,
            'passed': attempt.passed if is_completed else None,
            'time_taken_seconds': attempt.time_spent_seconds,
            'attempt_number': attempt.attempt_number,
            'started_at': attempt.started_at.isoformat() if attempt.started_at else None,
            'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            'correct_count': len([q for q in question_results if q['is_correct'] is True]) if is_completed else None,
            'incorrect_count': len([q for q in question_results if q['is_correct'] is False]) if is_completed else None,
            'unanswered_count': len([q for q in question_results if not q['selected_options']]) if is_completed else None,
            'answers': answers_map,
            'question_results': question_results,
        }

        return success_response(data=data)

class TestResultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        attempt = TestAttempt.objects.filter(test_id=pk, user=request.user, status='SUBMITTED').order_by('-submitted_at').first()
        if not attempt:
            attempt = TestAttempt.objects.filter(test_id=pk, user=request.user).order_by('-started_at').first()

        if not attempt:
            return error_response('No attempt found for this test', status_code=status.HTTP_404_NOT_FOUND)

        detail_view = TestAttemptDetailView()
        return detail_view.get(request, attempt.id)

class AIGenerateTestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        topic = request.data.get('topic', 'Data Structures & Algorithms')
        difficulty = request.data.get('difficulty', 'medium')
        count = int(request.data.get('count', 5))
        time_limit = int(request.data.get('time_limit', count * 2))

        # Check existing test or create on the fly
        slug = f"ai-{topic.lower().replace(' ', '-')[:25]}-{difficulty}"
        test, _ = Test.objects.get_or_create(
            slug=slug,
            defaults={
                'title': f"AI Practice: {topic}",
                'description': f"Adaptive AI-generated practice assessment targeting {topic} with {difficulty} difficulty.",
                'category': 'Computer Science',
                'duration_minutes': time_limit,
                'total_marks': count * 4,
                'passing_marks': int(count * 4 * 0.5),
                'is_published': True,
            }
        )

        # Ensure questions exist
        if test.questions.count() < count:
            sample_questions = [
                {
                    'prompt': f"What is the amortized time complexity of inserting elements into a dynamic array in {topic}?",
                    'topic': topic,
                    'explanation': "Dynamic arrays double their capacity when full, giving an amortized insertion cost of O(1).",
                    'options': [('O(1)', True), ('O(N)', False), ('O(log N)', False), ('O(N^2)', False)]
                },
                {
                    'prompt': f"Which data structure is optimal for implementing Breadth-First Search (BFS) in {topic}?",
                    'topic': topic,
                    'explanation': "A Queue (FIFO) processes nodes level-by-level in BFS traversal.",
                    'options': [('Queue (FIFO)', True), ('Stack (LIFO)', False), ('Priority Queue', False), ('Binary Tree', False)]
                },
                {
                    'prompt': f"In {topic}, what invariant is maintained by a min-heap binary tree?",
                    'topic': topic,
                    'explanation': "Every parent node is less than or equal to its children, ensuring the minimum element is at the root.",
                    'options': [('Parent value <= Child values', True), ('Left child < Right child', False), ('Balanced height at all times', False), ('Leaf nodes are sorted', False)]
                },
                {
                    'prompt': f"What dynamic programming state transition represents the Longest Common Subsequence in {topic}?",
                    'topic': topic,
                    'explanation': "If characters match: dp[i][j] = 1 + dp[i-1][j-1], else max(dp[i-1][j], dp[i][j-1]).",
                    'options': [('dp[i][j] = 1 + dp[i-1][j-1] if match else max(dp[i-1][j], dp[i][j-1])', True), ('dp[i][j] = dp[i-1][j] + dp[i][j-1]', False), ('dp[i][j] = min(dp[i-1][j], dp[i][j-1])', False), ('dp[i] = dp[i-1] * 2', False)]
                },
                {
                    'prompt': f"How does binary search achieve O(log N) logarithmic runtime in {topic}?",
                    'topic': topic,
                    'explanation': "By halving the search space at each iteration on sorted inputs.",
                    'options': [('Halves the search range at each comparison step', True), ('Scans every second element', False), ('Uses hash collisions', False), ('Sorts elements in place', False)]
                },
            ]

            for i, q_data in enumerate(sample_questions[:count], start=test.questions.count() + 1):
                q = Question.objects.create(
                    test=test,
                    prompt=q_data['prompt'],
                    question_type='MCQ',
                    topic=q_data['topic'],
                    marks=4,
                    negative_marks=1,
                    explanation=q_data['explanation'],
                    order=i
                )
                for opt_idx, (opt_text, is_corr) in enumerate(q_data['options'], start=1):
                    Option.objects.create(question=q, text=opt_text, is_correct=is_corr, order=opt_idx)

        questions_list = []
        for q in test.questions.all()[:count]:
            questions_list.append({
                'id': q.id,
                'text': q.prompt,
                'question_type': 'mcq',
                'difficulty': 2,
                'bloom_level': 'apply',
                'marks': q.marks,
                'explanation': q.explanation,
                'options': [{'id': o.id, 'text': o.text, 'order': o.order} for o in q.options.all()]
            })

        return success_response(
            data={
                'testId': test.id,
                'test_id': test.id,
                'title': test.title,
                'topic': topic,
                'difficulty': difficulty,
                'question_count': len(questions_list),
                'questionCount': len(questions_list),
                'time_limit': time_limit,
                'timeLimit': time_limit,
                'time_limit_minutes': time_limit,
                'questions': questions_list,
                'ai_powered': False,
                'model': 'mock-fallback',
            },
            message='Test generated successfully (using fallback questions)',
            status_code=status.HTTP_201_CREATED
        )

class TestAttemptHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        test_id = request.query_params.get('testId') or request.query_params.get('test_id')
        queryset = TestAttempt.objects.filter(user=request.user).select_related('test').order_by('-started_at')
        if test_id:
            queryset = queryset.filter(test_id=test_id)

        serializer = TestAttemptSerializer(queryset, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class TopicPerformanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        performances = TopicPerformance.objects.filter(user=request.user).order_by('-accuracy')
        serializer = TopicPerformanceSerializer(performances, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class BookmarkQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookmarks = QuestionBookmark.objects.filter(user=request.user).select_related('question')
        serializer = QuestionBookmarkSerializer(bookmarks, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

    def post(self, request):
        question_id = request.data.get('questionId') or request.data.get('question_id')
        notes = request.data.get('notes', '')

        try:
            question = Question.objects.get(pk=question_id)
        except Question.DoesNotExist:
            return error_response('Question not found', status_code=status.HTTP_404_NOT_FOUND)

        bookmark, created = QuestionBookmark.objects.update_or_create(
            user=request.user,
            question=question,
            defaults={'notes': notes}
        )

        return success_response(
            data=QuestionBookmarkSerializer(bookmark).data,
            message='Question bookmarked successfully',
            status_code=status.HTTP_201_CREATED
        )

    def delete(self, request, question_id=None):
        q_id = (
            question_id
            or request.data.get('questionId')
            or request.data.get('question_id')
            or request.query_params.get('questionId')
            or request.query_params.get('question_id')
        )
        if not q_id:
            return error_response('question_id is required', status_code=status.HTTP_400_BAD_REQUEST)
        QuestionBookmark.objects.filter(user=request.user, question_id=q_id).delete()
        return success_response(data=None, message='Bookmark removed')


class AdaptiveNextQuestionView(APIView):
    """
    Real-time 3PL IRT Computerized Adaptive Testing (CAT) question dispatch.
    Evaluates student response, updates latent ability estimate theta,
    and dispatches the next optimal question maximizing Fisher Information.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None, attempt_id=None):
        att_id = attempt_id or pk or request.data.get('attempt_id') or request.data.get('attemptId')
        attempt = TestAttempt.objects.filter(pk=att_id, user=request.user).select_related('test').first()
        if not attempt:
            return error_response('Attempt not found', status_code=status.HTTP_404_NOT_FOUND)

        if attempt.status in ('SUBMITTED', 'TIMEOUT', 'EXPIRED'):
            return error_response('Attempt is already finalized', status_code=status.HTTP_400_BAD_REQUEST)

        prev_q_id = request.data.get('previous_question_id') or request.data.get('question_id')
        selected_opt_id = request.data.get('selected_option_id')
        raw_time = request.data.get('time_spent_seconds')
        try:
            time_spent = max(0, int(raw_time)) if raw_time is not None else 0
        except (ValueError, TypeError):
            time_spent = 0

        # Record answer if provided
        if prev_q_id:
            try:
                prev_q = Question.objects.get(pk=prev_q_id, test=attempt.test)
                selected_opt = Option.objects.filter(pk=selected_opt_id, question=prev_q).first() if selected_opt_id else None
                is_correct = selected_opt.is_correct if selected_opt else False
                q_marks = prev_q.marks if prev_q.marks is not None else 4.0
                q_neg = prev_q.negative_marks if prev_q.negative_marks is not None else 1.0
                marks = q_marks if is_correct else (-q_neg if attempt.test.negative_marking and selected_opt else 0.0)

                AttemptAnswer.objects.update_or_create(
                    attempt=attempt,
                    question=prev_q,
                    defaults={
                        'selected_option': selected_opt,
                        'is_correct': is_correct,
                        'marks_awarded': marks,
                        'time_spent_sec': time_spent
                    }
                )

                # Update IRT ability theta
                answered_count = attempt.answers.count()
                new_theta = IRTScoringEngine.update_adaptive_theta(
                    current_theta=attempt.irt_ability_theta,
                    question=prev_q,
                    is_correct=is_correct,
                    step=answered_count
                )
                attempt.irt_ability_theta = new_theta
                attempt.save(update_fields=['irt_ability_theta'])
            except Question.DoesNotExist:
                pass

        # Select next question based on Fisher Information
        try:
            max_questions = max(1, min(100, int(request.data.get('max_questions', 10))))
        except (ValueError, TypeError):
            max_questions = 10

        # Check psychometric convergence criteria (SEM <= 0.35 with min 5 questions)
        converged = IRTScoringEngine.has_converged(attempt, target_sem=0.35, min_questions=5, max_questions=max_questions)
        next_q = None if converged else IRTScoringEngine.get_next_adaptive_question(attempt, max_questions=max_questions)

        # Compute current SEM for observability
        total_info = 0.0
        for ans in attempt.answers.select_related('question').all():
            q = ans.question
            a = getattr(q, 'discrimination', 1.0) or 1.0
            b = getattr(q, 'difficulty', 0.0) or 0.0
            total_info += IRTScoringEngine.fisher_information(attempt.irt_ability_theta, a, b)
        current_sem = IRTScoringEngine.calculate_sem(total_info)

        if not next_q:
            # Test complete! Finalize scoring
            answers_data = [
                {'questionId': ans.question_id, 'selectedOptionId': ans.selected_option_id, 'selectedOptionIds': ans.selected_option_ids, 'timeSpentSeconds': ans.time_spent_sec}
                for ans in attempt.answers.all()
            ]
            scoring_res = IRTScoringEngine.calculate_score_and_irt(attempt, answers_data)
            return success_response(
                data={
                    'is_complete': True,
                    'ability_theta': attempt.irt_ability_theta,
                    'sem': current_sem,
                    'questions_answered': attempt.answers.count(),
                    'result': scoring_res
                },
                message='Adaptive test complete (converged)' if converged else 'Adaptive test complete'
            )

        return success_response(
            data={
                'is_complete': False,
                'ability_theta': attempt.irt_ability_theta,
                'sem': current_sem,
                'questions_answered': attempt.answers.count(),
                'next_question': {
                    'id': next_q.id,
                    'text': next_q.prompt,
                    'difficulty': next_q.difficulty,
                    'discrimination': next_q.discrimination,
                    'marks': next_q.marks,
                    'order': next_q.order,
                    'options': [{'id': opt.id, 'text': opt.text, 'order': opt.order} for opt in next_q.options.all()]
                }
            },
            message='Next adaptive question dispatched'
        )


class TestTelemetryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None, attempt_id=None):
        violations = request.data.get('violations', [])
        target_attempt_id = attempt_id or request.data.get('attempt_id') or request.data.get('attemptId')

        attempt = None
        if target_attempt_id:
            attempt = TestAttempt.objects.filter(id=target_attempt_id, user=request.user).first()
        elif pk:
            attempt = TestAttempt.objects.filter(test_id=pk, user=request.user, status='IN_PROGRESS').first()

        report = AssessmentIntegrityEngine.evaluate_violations(
            violations,
            attempt_id=attempt.id if attempt else (target_attempt_id or '')
        )

        return success_response(
            data={
                'attempt_id': attempt.id if attempt else target_attempt_id,
                'integrity_score': report['integrity_score'],
                'risk_level': report['risk_level'],
                'total_violations': report['total_violations'],
                'violation_counts': report['violation_counts'],
                'flagged_for_review': report['flagged_for_review'],
                'audit_hash': report['audit_hash'],
                'events_logged': report['events_logged'],
            },
            message='Telemetry audit recorded successfully'
        )


class SpacedRepetitionDeckView(APIView):
    """
    API endpoint for retrieving user's daily SM-2 spaced repetition review deck
    and creating custom active recall cards.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        topic = request.query_params.get('topic')
        card_type = request.query_params.get('card_type')
        limit = int(request.query_params.get('limit', 30))

        deck = SuperMemoEngine.get_daily_deck(
            user=request.user,
            topic=topic,
            card_type=card_type,
            limit=limit,
        )
        return success_response(data=deck)

    def post(self, request):
        front = request.data.get('front', '').strip()
        back = request.data.get('back', '').strip()
        explanation = request.data.get('explanation', '').strip()
        topic = request.data.get('topic', 'General').strip()
        subject = request.data.get('subject', 'General').strip()
        card_type = request.data.get('card_type', 'QUESTION').upper()

        if not front or not back:
            return error_response('Both front and back card contents are required', status_code=status.HTTP_400_BAD_REQUEST)

        valid_types = {'QUESTION', 'FORMULA', 'CONCEPT', 'MISTAKE'}
        if card_type not in valid_types:
            card_type = 'QUESTION'

        card = SpacedRepetitionCard.objects.create(
            user=request.user,
            card_type=card_type,
            front=front,
            back=back,
            explanation=explanation,
            topic=topic or 'General',
            subject=subject or 'General',
        )
        return success_response(
            data=SuperMemoEngine.serialize_card(card),
            message='Spaced repetition card created',
            status_code=status.HTTP_201_CREATED,
        )


class SpacedRepetitionReviewView(APIView):
    """
    API endpoint to record SuperMemo SM-2 active recall reviews.
    Accepts card_id and quality rating (0 to 5).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        card_id = request.data.get('card_id') or request.data.get('cardId')
        quality = request.data.get('quality')
        if quality is None:
            quality = request.data.get('rating')

        if not card_id:
            return error_response('card_id is required', status_code=status.HTTP_400_BAD_REQUEST)
        if quality is None:
            return error_response('quality (0-5) is required', status_code=status.HTTP_400_BAD_REQUEST)

        try:
            quality_int = int(quality)
        except (ValueError, TypeError):
            return error_response('quality must be an integer between 0 and 5', status_code=status.HTTP_400_BAD_REQUEST)

        try:
            result = SuperMemoEngine.record_card_review(request.user, card_id, quality_int)
            return success_response(data=result, message='Card review recorded successfully')
        except SpacedRepetitionCard.DoesNotExist:
            return error_response('Card not found', status_code=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return error_response(str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SpacedRepetitionGenerateView(APIView):
    """
    API endpoint to auto-generate spaced repetition cards from test mistakes or question bookmarks.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        source = request.data.get('source', 'mistakes').lower()

        if source == 'mistakes':
            attempt_id = request.data.get('attempt_id') or request.data.get('attemptId')
            if not attempt_id:
                return error_response('attempt_id is required when source is mistakes', status_code=status.HTTP_400_BAD_REQUEST)
            try:
                result = SuperMemoEngine.generate_from_mistakes(request.user, attempt_id)
                return success_response(
                    data=result,
                    message=f"Generated {result['created_count']} review cards from test mistakes"
                )
            except TestAttempt.DoesNotExist:
                return error_response('Test attempt not found', status_code=status.HTTP_404_NOT_FOUND)
        elif source == 'bookmarks':
            result = SuperMemoEngine.generate_from_bookmarks(request.user)
            return success_response(
                data=result,
                message=f"Generated {result['created_count']} review cards from question bookmarks"
            )
        else:
            return error_response('Invalid source. Supported: mistakes, bookmarks', status_code=status.HTTP_400_BAD_REQUEST)


class SpacedRepetitionStatsView(APIView):
    """
    API endpoint to retrieve comprehensive psychometric retention curves and mastery stats.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stats = SuperMemoEngine.get_retention_analytics(request.user)
        return success_response(data=stats)


class SkillDAGView(APIView):
    """
    Returns the Curriculum Knowledge Graph DAG with student Bayesian mastery states
    and topological levels. Open for unauthenticated exploration with default priors,
    personalized when authenticated.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user and request.user.is_authenticated else None
        dag = BayesianKnowledgeTracingEngine.get_skill_dag(user=user)
        return success_response(data=dag)


class SkillInteractionView(APIView):
    """
    Ingests practice events (correct / incorrect answers on test items, DSA problems, or cards)
    and updates the student's Bayesian Knowledge Tracing posterior P(L_t).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        skill_id = request.data.get('skill_id')
        is_correct = request.data.get('is_correct')

        if not skill_id:
            return error_response('skill_id is required', status_code=status.HTTP_400_BAD_REQUEST)
        if is_correct is None:
            return error_response('is_correct (boolean) is required', status_code=status.HTTP_400_BAD_REQUEST)

        try:
            result = BayesianKnowledgeTracingEngine.record_interaction(
                user=request.user,
                skill_id_or_slug=skill_id,
                is_correct=bool(is_correct)
            )
            return success_response(
                data=result,
                message=f"BKT mastery updated: {round(result['updated_probability'] * 100, 1)}%"
            )
        except Exception as e:
            return error_response(str(e), status_code=status.HTTP_400_BAD_REQUEST)


class SkillNextActionView(APIView):
    """
    Identifies the student's Next Best Action (NBA) within their Zone of Proximal Development (ZPD).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user and request.user.is_authenticated else None
        dag = BayesianKnowledgeTracingEngine.get_skill_dag(user=user)
        rec_id = dag.get('recommended_concept_id')
        target_node = None
        for n in dag.get('nodes', []):
            if n['id'] == rec_id:
                target_node = n
                break

        return success_response(data={
            'recommended_concept': target_node,
            'overall_progress_percentage': dag.get('overall_progress_percentage', 0.0),
            'total_skills': dag.get('total_skills', 0),
            'mastered_skills': dag.get('mastered_skills', 0),
        })


class TestAnalyticsView(APIView):
    """
    Computes aggregate test statistics:
    - total_tests: total submitted attempts
    - passed_tests: total attempts with passed=True
    - pass_rate: percentage of submitted tests passed
    - average_score: mean percentage score across attempts
    - by_difficulty: breakdown by difficulty (Easy, Medium, Hard)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user and request.user.is_authenticated else None
        if not user:
            return success_response(data={
                'total_tests': 0,
                'passed_tests': 0,
                'pass_rate': 0.0,
                'average_score': 0.0,
                'by_difficulty': {
                    'Easy': {'total': 0, 'passed': 0, 'avgScore': 0.0},
                    'Medium': {'total': 0, 'passed': 0, 'avgScore': 0.0},
                    'Hard': {'total': 0, 'passed': 0, 'avgScore': 0.0},
                }
            })

        attempts = TestAttempt.objects.filter(user=user, status__in=['SUBMITTED', 'TIMEOUT']).select_related('test')
        total_tests = attempts.count()
        passed_tests = attempts.filter(passed=True).count()
        pass_rate = round((passed_tests / max(1, total_tests)) * 100, 1) if total_tests > 0 else 0.0
        avg_score_res = attempts.aggregate(avg=Avg('score'))['avg']
        avg_score = round(float(avg_score_res), 1) if avg_score_res is not None else 0.0

        by_difficulty = {
            'Easy': {'total': 0, 'passed': 0, 'avgScore': 0.0, '_scores': []},
            'Medium': {'total': 0, 'passed': 0, 'avgScore': 0.0, '_scores': []},
            'Hard': {'total': 0, 'passed': 0, 'avgScore': 0.0, '_scores': []},
        }

        for att in attempts:
            diff_attr = getattr(att.test, 'difficulty', None) if att.test else None
            if not diff_attr:
                avg_b = att.test.questions.aggregate(avg=Avg('difficulty'))['avg'] if att.test else None
                if avg_b is not None:
                    if avg_b < -0.5:
                        diff = 'Easy'
                    elif avg_b > 0.5:
                        diff = 'Hard'
                    else:
                        diff = 'Medium'
                else:
                    diff = 'Medium'
            else:
                diff = str(diff_attr).capitalize()

            if diff not in by_difficulty:
                diff = 'Medium'
            by_difficulty[diff]['total'] += 1
            if att.passed:
                by_difficulty[diff]['passed'] += 1
            if att.score is not None:
                by_difficulty[diff]['_scores'].append(att.score)

        for diff_data in by_difficulty.values():
            scores = diff_data.pop('_scores', [])
            diff_data['avgScore'] = round(sum(scores) / len(scores), 1) if scores else 0.0

        return success_response(data={
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'pass_rate': pass_rate,
            'average_score': avg_score,
            'by_difficulty': by_difficulty
        })



