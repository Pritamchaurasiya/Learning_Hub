"""
Test engine API views.
Handles test listing, AI generation, attempts, autosave, submission, and results.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Test, TestAttempt, Question
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

    @extend_schema(
        description='AI-generate a new test',
        request=TestGenerationRequestSerializer,
        responses={201: TestDetailSerializer},
    )
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def generate(self, request):
        """Generate a new test using AI."""
        serializer = TestGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Delegate to AI generation service
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
    POST /api/v1/tests/{test_id}/start/ - Start attempt
    POST /api/v1/tests/{test_id}/autosave/ - Autosave answer
    POST /api/v1/tests/{test_id}/submit/ - Submit attempt
    GET /api/v1/tests/{test_id}/result/ - Get result
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
                mode=serializer.validated_data.get('mode', 'mock'),
                device_info=self._get_device_info(request),
                ip_address=self._get_ip_address(request),
            )
            return Response({
                'status': 'success',
                'data': AttemptDetailSerializer(attempt).data,
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
        """Autosave an answer during an active attempt."""
        test = self._get_test_or_404(pk)

        # Find in-progress attempt
        attempt = TestAttempt.objects.filter(
            user=request.user, test=test, status='in_progress'
        ).first()

        if not attempt:
            return Response({
                'status': 'error',
                'message': 'No active attempt found. Start the test first.',
            }, status=status.HTTP_400_BAD_REQUEST)

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
        test = self._get_test_or_404(pk)

        attempt = TestAttempt.objects.filter(
            user=request.user, test=test, status='in_progress'
        ).first()

        if not attempt:
            return Response({
                'status': 'error',
                'message': 'No active attempt found.',
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            submitted = TestSessionManager.submit_attempt(attempt.id)
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
        test = self._get_test_or_404(pk)

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

    def _get_test_or_404(self, pk):
        try:
            return Test.objects.get(id=pk, is_published=True)
        except Test.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Test not found")

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
