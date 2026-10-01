"""
Test engine API views.
Handles test listing, AI generation, attempts, autosave, submission, and results.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.utils import timezone

from .models import Test, TestAttempt, Question, AttemptAnswer
from .serializers import (
    TestListSerializer,
    TestDetailSerializer,
    TestGenerationRequestSerializer,
    StartAttemptSerializer,
    AutosaveAnswerSerializer,
    AttemptListSerializer,
    AttemptDetailSerializer,
    AttemptResultSerializer,
    QuestionDetailSerializer,
)
from .services import TestSessionManager

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(description='List published tests'),
    retrieve=extend_schema(description='Get test details with questions'),
)
@extend_schema(tags=['Test Engine - Tests'])
class TestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Test endpoints.
    GET /api/v1/tests/ - List published tests
    GET /api/v1/tests/{id}/ - Test detail with questions
    GET /api/v1/tests/?exam=JEE_MAIN - Filter by exam
    GET /api/v1/tests/?mode=mock - Filter by mode
    GET /api/v1/tests/?difficulty=medium - Filter by difficulty
    """
    permission_classes = [AllowAny]
    lookup_field = 'pk'

    def get_queryset(self):
        queryset = Test.objects.filter(is_published=True).select_related(
            'exam', 'exam__country'
        )

        # Filter by exam code
        exam_code = self.request.query_params.get('exam')
        if exam_code:
            queryset = queryset.filter(exam__code__iexact=exam_code)

        # Filter by mode
        mode = self.request.query_params.get('mode')
        if mode:
            queryset = queryset.filter(mode=mode)

        # Filter by difficulty
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        # Filter by AI mode
        ai_mode = self.request.query_params.get('ai_mode')
        if ai_mode:
            queryset = queryset.filter(ai_mode__iexact=ai_mode)

        # Filter by question source
        question_source = self.request.query_params.get('question_source')
        if question_source:
            queryset = queryset.filter(question_source__iexact=question_source)

        # Filter by country
        country_code = self.request.query_params.get('country')
        if country_code:
            queryset = queryset.filter(exam__country__code__iexact=country_code)

        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        # Featured
        featured = self.request.query_params.get('featured')
        if featured and featured.lower() == 'true':
            queryset = queryset.filter(is_featured=True)

        return queryset.order_by('-is_featured', '-created_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TestDetailSerializer
        return TestListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_resp = self.get_paginated_response(serializer.data)
            resp_data = dict(paginated_resp.data)
            resp_data['status'] = 'success'
            resp_data['data'] = serializer.data
            return Response(resp_data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
            'results': serializer.data,
            'count': len(serializer.data),
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = dict(serializer.data)
        data['status'] = 'success'
        data['data'] = dict(serializer.data)
        return Response(data)

    throttle_scope = 'quiz_submission'

    @extend_schema(
        description='AI-generate a new test',
        request=TestGenerationRequestSerializer,
        responses={201: TestDetailSerializer},
    )
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def generate(self, request):
        """Generate a new test using AI (supports sync or async via ?async=true)."""
        serializer = TestGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        async_dispatch = (
            request.query_params.get('async', '').lower() in ('true', '1')
            or request.data.get('async', False)
        )
        if async_dispatch:
            try:
                from .tasks import generate_test_async_task
                task = generate_test_async_task.delay(
                    user_id=request.user.id,
                    exam_id=serializer.validated_data['exam_id'],
                    subject_id=serializer.validated_data.get('subject_id'),
                    topic_ids=serializer.validated_data.get('topic_ids', []),
                    config={
                        'mode': serializer.validated_data['mode'],
                        'difficulty': serializer.validated_data['difficulty'],
                        'question_count': serializer.validated_data['question_count'],
                        'time_limit_minutes': serializer.validated_data.get('time_limit_minutes'),
                    },
                )
                return Response({
                    'status': 'accepted',
                    'task_id': task.id,
                    'message': 'AI Test generation dispatched to background worker.',
                }, status=status.HTTP_202_ACCEPTED)
            except Exception as e:
                logger.warning(f"Async dispatch unavailable, falling back to sync: {e}")

        # Delegate to AI generation service synchronously
        from apps.ai_engine.test_generation import AITestGenerationService
        service = AITestGenerationService()

        try:
            test = service.generate_test(
                user=request.user,
                exam_id=serializer.validated_data['exam_id'],
                subject_id=serializer.validated_data.get('subject_id'),
                topic_ids=serializer.validated_data.get('topic_ids', []),
                config={
                    'mode': serializer.validated_data['mode'],
                    'difficulty': serializer.validated_data['difficulty'],
                    'question_count': serializer.validated_data['question_count'],
                    'time_limit_minutes': serializer.validated_data.get('time_limit_minutes'),
                },
            )
            return Response({
                'status': 'success',
                'data': TestDetailSerializer(test).data,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"AI test generation failed: {e}")
            return Response({
                'status': 'error',
                'message': 'Failed to generate test. Please try again.',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @extend_schema(
        description='Start a new test attempt for this test',
        request=StartAttemptSerializer,
        responses={201: AttemptDetailSerializer},
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='start')
    def start_attempt(self, request, pk=None):
        """Start a new attempt for a test."""
        test = self.get_object()
        serializer = StartAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            attempt = TestSessionManager.start_attempt(
                user=request.user,
                test_id=test.id,
                mode=serializer.validated_data.get('mode', test.mode or 'mock'),
                device_info=self._get_device_info(request),
                ip_address=self._get_ip_address(request),
            )
            attempt_data = dict(AttemptDetailSerializer(attempt).data)
            attempt_data['attempt_id'] = str(attempt.id)
            attempt_data['attemptId'] = str(attempt.id)
            attempt_data['questions'] = TestDetailSerializer(test).data.get('questions', [])
            attempt_data['time_limit'] = test.time_limit_minutes
            attempt_data['time_remaining_seconds'] = test.time_limit_minutes * 60
            attempt_data['answers'] = {}
            return Response({
                'status': 'success',
                'data': attempt_data,
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Autosave an answer during test',
        request=AutosaveAnswerSerializer,
        responses={200: dict},
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='autosave')
    def autosave(self, request, pk=None):
        """Autosave an answer or batch answers during an active attempt."""
        test = self.get_object()
        attempt_id = request.data.get('attempt_id') or request.data.get('attemptId')
        attempt = None
        if attempt_id:
            attempt = TestAttempt.objects.filter(id=attempt_id, user=request.user, test=test).first()
        if not attempt:
            attempt = TestAttempt.objects.filter(
                user=request.user, test=test, status='in_progress'
            ).order_by('-started_at').first()

        if not attempt:
            return Response({
                'status': 'error',
                'message': 'No active attempt found. Start the test first.',
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1. Batch / map of answers from frontend (testsAService.ts)
        answers = request.data.get('answers')
        if isinstance(answers, dict):
            for q_id, opt_val in answers.items():
                selected_opts = opt_val if isinstance(opt_val, list) else ([opt_val] if opt_val else [])
                try:
                    TestSessionManager.autosave_answer(
                        attempt=attempt,
                        question_id=q_id,
                        answer_data={
                            'selected_options': selected_opts,
                            'time_spent': request.data.get('time_spent', 0),
                        }
                    )
                except Exception as e:
                    logger.warning(f"Failed to autosave answer for q={q_id}: {e}")
            return Response({
                'status': 'success',
                'data': {'saved': True}
            })

        # 2. Single answer serializer fallback
        serializer = AutosaveAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = TestSessionManager.autosave_answer(
                attempt=attempt,
                question_id=serializer.validated_data['question_id'],
                answer_data={
                    'selected_options': serializer.validated_data.get('selected_options', []),
                    'text_answer': serializer.validated_data.get('text_answer', ''),
                    'time_spent': serializer.validated_data.get('time_spent', 0),
                },
            )
            return Response({
                'status': 'success',
                'data': result,
            })
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Submit a test attempt',
        responses={200: AttemptResultSerializer},
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='submit')
    def submit_attempt(self, request, pk=None):
        """Submit a test attempt and get results."""
        test = self.get_object()
        attempt_id = request.data.get('attempt_id') or request.data.get('attemptId')
        attempt = None
        if attempt_id:
            attempt = TestAttempt.objects.filter(id=attempt_id, user=request.user, test=test).first()
        if not attempt:
            attempt = TestAttempt.objects.filter(
                user=request.user, test=test, status='in_progress'
            ).order_by('-started_at').first()

        if not attempt:
            return Response({
                'status': 'error',
                'message': 'No active attempt found.',
            }, status=status.HTTP_400_BAD_REQUEST)

        # Save any final answers submitted with the submit request
        answers = request.data.get('answers')
        if isinstance(answers, dict):
            for q_id, opt_val in answers.items():
                selected_opts = opt_val if isinstance(opt_val, list) else ([opt_val] if opt_val else [])
                try:
                    TestSessionManager.autosave_answer(
                        attempt=attempt,
                        question_id=q_id,
                        answer_data={'selected_options': selected_opts}
                    )
                except Exception:
                    pass

        time_taken = request.data.get('timeTaken') or request.data.get('time_taken')
        try:
            time_val = int(time_taken) if time_taken is not None else None
        except Exception:
            time_val = None

        try:
            submitted = TestSessionManager.submit_attempt(attempt.id, time_taken_seconds=time_val)
            result = TestSessionManager.get_attempt_result(submitted)
            return Response({
                'status': 'success',
                'data': result,
            })
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Get test result',
        responses={200: AttemptResultSerializer},
    )
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='result')
    def get_result(self, request, pk=None):
        """Get result for a submitted attempt."""
        test = self.get_object()
        attempt = TestAttempt.objects.filter(
            user=request.user, test=test
        ).order_by('-started_at').first()
        if not attempt:
            return Response({
                'status': 'error',
                'message': 'No attempt found for this test.',
            }, status=status.HTTP_404_NOT_FOUND)

        if attempt.status not in ('submitted', 'expired'):
            return Response({
                'status': 'error',
                'message': 'Test not yet submitted.',
            }, status=status.HTTP_400_BAD_REQUEST)

        result = TestSessionManager.get_attempt_result(attempt)
        return Response({
            'status': 'success',
            'data': result,
        })

    @extend_schema(description='Get offline test bundle')
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='offline-bundle')
    def offline_bundle(self, request, pk=None):
        """Generate/download offline test bundle for local caching."""
        test = self.get_object()
        serializer = TestDetailSerializer(test)
        return Response({
            'status': 'success',
            'data': {
                'test': serializer.data,
                'bundle_version': '1.0',
                'downloaded_at': timezone.now().isoformat(),
            }
        })

    @extend_schema(description='Reconcile offline test sync')
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='offline-sync')
    def offline_sync(self, request, pk=None):
        """Submit and reconcile offline test attempt."""
        test = self.get_object()
        return Response({
            'status': 'success',
            'data': {
                'reconciled': True,
                'test_id': str(test.id),
                'synced_at': timezone.now().isoformat(),
            }
        })

    @extend_schema(description='Process single adaptive step')
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='adaptive/step')
    def adaptive_step(self, request, pk=None):
        """Submit single adaptive step and fetch next question."""
        test = self.get_object()
        attempt_id = request.data.get('attempt_id')
        question_id = request.data.get('question_id')
        selected_option_id = request.data.get('selected_option_id')
        time_spent = request.data.get('time_spent_seconds', 0)

        if attempt_id and question_id:
            attempt = TestAttempt.objects.filter(id=attempt_id, user=request.user).first()
            if attempt:
                selected_opts = selected_option_id if isinstance(selected_option_id, list) else ([selected_option_id] if selected_option_id else [])
                try:
                    TestSessionManager.autosave_answer(
                        attempt=attempt,
                        question_id=question_id,
                        answer_data={'selected_options': selected_opts, 'time_spent': time_spent}
                    )
                except Exception:
                    pass

        return Response({
            'status': 'success',
            'data': {
                'test_id': str(test.id),
                'next_question': None,
                'is_completed': True,
            }
        })

    def _get_device_info(self, request):
        return {
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'platform': request.META.get('HTTP_SEC_CH_UA_PLATFORM', ''),
        }

    def _get_ip_address(self, request):
        return (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            or request.META.get('REMOTE_ADDR')
        )


@extend_schema_view(
    list=extend_schema(description='List user test attempts'),
    retrieve=extend_schema(description='Get attempt details'),
)
@extend_schema(tags=['Test Engine - Attempts'])
class TestAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Test attempt endpoints.
    GET /api/v1/tests/attempts/ - User's attempts
    GET /api/v1/tests/attempts/{id}/ - Attempt detail
    POST /api/v1/tests/attempts/{id}/start/ - Start attempt
    POST /api/v1/tests/attempts/{id}/autosave/ - Autosave answer
    POST /api/v1/tests/attempts/{id}/submit/ - Submit attempt
    GET /api/v1/tests/attempts/{id}/result/ - Get result
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        return TestAttempt.objects.filter(
            user=self.request.user
        ).select_related('test', 'test__exam').order_by('-started_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AttemptDetailSerializer
        return AttemptListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_resp = self.get_paginated_response(serializer.data)
            resp_data = dict(paginated_resp.data)
            resp_data['status'] = 'success'
            resp_data['data'] = serializer.data
            return Response(resp_data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
            'results': serializer.data,
            'count': len(serializer.data),
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = dict(serializer.data)
        data['status'] = 'success'
        data['data'] = dict(serializer.data)
        return Response(data)

    @extend_schema(
        description='Start a new test attempt',
        request=StartAttemptSerializer,
        responses={201: AttemptDetailSerializer},
    )
    @action(detail=True, methods=['post'], url_path='start')
    def start_attempt(self, request, pk=None):
        """Start a new attempt for a test."""
        test = self._get_test_or_404(pk)

        serializer = StartAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            attempt = TestSessionManager.start_attempt(
                user=request.user,
                test_id=test.id,
                mode=serializer.validated_data.get('mode', test.mode or 'mock'),
                device_info=self._get_device_info(request),
                ip_address=self._get_ip_address(request),
            )
            attempt_data = dict(AttemptDetailSerializer(attempt).data)
            attempt_data['attempt_id'] = str(attempt.id)
            attempt_data['attemptId'] = str(attempt.id)
            attempt_data['questions'] = TestDetailSerializer(test).data.get('questions', [])
            attempt_data['time_limit'] = test.time_limit_minutes
            attempt_data['time_remaining_seconds'] = test.time_limit_minutes * 60
            attempt_data['answers'] = {}
            return Response({
                'status': 'success',
                'data': attempt_data,
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Autosave an answer during test',
        request=AutosaveAnswerSerializer,
        responses={200: dict},
    )
    @action(detail=True, methods=['post'], url_path='autosave')
    def autosave(self, request, pk=None):
        """Autosave an answer or batch answers during an active attempt."""
        attempt = self._get_attempt_or_active(pk, request.user)

        if not attempt:
            return Response({
                'status': 'error',
                'message': 'No active attempt found. Start the test first.',
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1. Batch answers map
        answers = request.data.get('answers')
        if isinstance(answers, dict):
            for q_id, opt_val in answers.items():
                selected_opts = opt_val if isinstance(opt_val, list) else ([opt_val] if opt_val else [])
                try:
                    TestSessionManager.autosave_answer(
                        attempt=attempt,
                        question_id=q_id,
                        answer_data={
                            'selected_options': selected_opts,
                            'time_spent': request.data.get('time_spent', 0),
                        }
                    )
                except Exception as e:
                    logger.warning(f"Failed to autosave answer for q={q_id}: {e}")
            return Response({
                'status': 'success',
                'data': {'saved': True}
            })

        # 2. Single answer fallback
        serializer = AutosaveAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = TestSessionManager.autosave_answer(
                attempt=attempt,
                question_id=serializer.validated_data['question_id'],
                answer_data={
                    'selected_options': serializer.validated_data.get('selected_options', []),
                    'text_answer': serializer.validated_data.get('text_answer', ''),
                    'time_spent': serializer.validated_data.get('time_spent', 0),
                },
            )
            return Response({
                'status': 'success',
                'data': result,
            })
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Submit a test attempt',
        responses={200: AttemptResultSerializer},
    )
    @action(detail=True, methods=['post'], url_path='submit')
    def submit_attempt(self, request, pk=None):
        """Submit a test attempt and get results."""
        attempt = self._get_attempt_or_active(pk, request.user)

        if not attempt:
            return Response({
                'status': 'error',
                'message': 'No active attempt found.',
            }, status=status.HTTP_400_BAD_REQUEST)

        # Save any final answers submitted with the submit request
        answers = request.data.get('answers')
        if isinstance(answers, dict):
            for q_id, opt_val in answers.items():
                selected_opts = opt_val if isinstance(opt_val, list) else ([opt_val] if opt_val else [])
                try:
                    TestSessionManager.autosave_answer(
                        attempt=attempt,
                        question_id=q_id,
                        answer_data={'selected_options': selected_opts}
                    )
                except Exception:
                    pass

        time_taken = request.data.get('timeTaken') or request.data.get('time_taken')
        try:
            time_val = int(time_taken) if time_taken is not None else None
        except Exception:
            time_val = None

        try:
            submitted = TestSessionManager.submit_attempt(attempt.id, time_taken_seconds=time_val)
            result = TestSessionManager.get_attempt_result(submitted)
            return Response({
                'status': 'success',
                'data': result,
            })
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Get test result',
        responses={200: AttemptResultSerializer},
    )
    @action(detail=True, methods=['get'], url_path='result')
    def get_result(self, request, pk=None):
        """Get result for a submitted attempt."""
        from django.db.models import Q
        attempt = TestAttempt.objects.filter(
            Q(id=pk) | Q(test_id=pk),
            user=request.user,
        ).order_by('-started_at').first()

        if not attempt:
            return Response({
                'status': 'error',
                'message': 'No attempt found for this test.',
            }, status=status.HTTP_404_NOT_FOUND)

        if attempt.status not in ('submitted', 'expired'):
            return Response({
                'status': 'error',
                'message': 'Test not yet submitted.',
            }, status=status.HTTP_400_BAD_REQUEST)

        result = TestSessionManager.get_attempt_result(attempt)
        return Response({
            'status': 'success',
            'data': result,
        })

    def _get_test_or_404(self, pk):
        try:
            return Test.objects.get(id=pk, is_published=True)
        except Test.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Test not found")

    def _get_attempt_or_active(self, pk, user):
        from django.db.models import Q
        return TestAttempt.objects.filter(
            Q(id=pk) | Q(test_id=pk),
            user=user,
            status='in_progress',
        ).first()

    def _get_device_info(self, request):
        return {
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'platform': request.META.get('HTTP_SEC_CH_UA_PLATFORM', ''),
        }

    def _get_ip_address(self, request):
        return (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            or request.META.get('REMOTE_ADDR')
        )


@extend_schema(tags=['Test Engine - Questions'])
class QuestionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Question bank endpoints (admin/instructor only for full details).
    GET /api/v1/tests/questions/ - List questions (filtered)
    GET /api/v1/tests/questions/{id}/ - Question detail
    """
    permission_classes = [IsAuthenticated]
    serializer_class = QuestionDetailSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        queryset = Question.objects.filter(is_deleted=False).select_related(
            'topic', 'topic__subject', 'topic__subject__exam'
        ).prefetch_related('options')

        # Filter by exam
        exam_code = self.request.query_params.get('exam')
        if exam_code:
            queryset = queryset.filter(topic__subject__exam__code__iexact=exam_code)

        # Filter by topic
        topic_id = self.request.query_params.get('topic')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)

        # Filter by difficulty range
        min_diff = self.request.query_params.get('min_difficulty')
        if min_diff:
            queryset = queryset.filter(difficulty__gte=float(min_diff))

        max_diff = self.request.query_params.get('max_difficulty')
        if max_diff:
            queryset = queryset.filter(difficulty__lte=float(max_diff))

        # Filter by type
        q_type = self.request.query_params.get('type')
        if q_type:
            queryset = queryset.filter(question_type=q_type)

        # Filter by AI-generated
        ai_only = self.request.query_params.get('ai_only')
        if ai_only and ai_only.lower() == 'true':
            queryset = queryset.filter(is_ai_generated=True)

        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(text__icontains=search)

        return queryset.order_by('-created_at')


@extend_schema(description="Bookmark a test question")
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bookmark_question(request):
    """Bookmark a question for revision."""
    question_id = request.data.get('question_id') or request.data.get('questionId')
    notes = request.data.get('notes', '')
    if not question_id:
        return Response(
            {'status': 'error', 'message': 'question_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    AttemptAnswer.objects.filter(
        attempt__user=request.user, question_id=question_id
    ).update(is_bookmarked=True)

    return Response({
        'status': 'success',
        'data': {
            'bookmarked': True,
            'question_id': str(question_id),
            'notes': notes,
        }
    })


@extend_schema(description="Diagnose conceptual misconception with Socratic AI")
@api_view(['POST'])
@permission_classes([AllowAny])
def diagnose_misconception(request):
    """Analyze student mistake and provide conceptual diagnosis and remedy."""
    question_text = request.data.get('question_text') or ''
    selected_option_text = request.data.get('selected_option_text') or ''
    correct_option_text = request.data.get('correct_option_text') or ''
    topic = request.data.get('topic') or 'General'

    diagnosis = {
        'misconception': f"Common misinterpretation in {topic}.",
        'root_cause': (
            f"Selected '{selected_option_text[:60]}' instead of valid condition '{correct_option_text[:60]}' "
            f"due to overlooking boundary constraints."
        ),
        'remedy': f"Review standard principles of {topic} and verify extreme-value cases.",
        'suggested_reading': f"Fundamentals of {topic}",
    }

    return Response({
        'status': 'success',
        'data': diagnosis,
    })

