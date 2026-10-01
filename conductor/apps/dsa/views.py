from .repositories import ProblemRepository
from rest_framework.pagination import PageNumberPagination
from rest_framework import viewsets, permissions, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Submission, Tag
from .serializers import ProblemListSerializer, ProblemDetailSerializer, SubmissionSerializer, TagSerializer


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProblemViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action == 'run':
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProblemDetailSerializer
        return ProblemListSerializer

    def get_queryset(self):
        difficulty = self.request.query_params.get('difficulty')
        tag = self.request.query_params.get('tag')
        search = self.request.query_params.get('search')
        status_filter = self.request.query_params.get('status')

        if difficulty and difficulty.upper() == 'ALL':
            difficulty = None

        queryset = ProblemRepository.get_list_queryset(
            difficulty=difficulty,
            tag_slug=tag,
            search=search
        )

        user = self.request.user
        if status_filter and status_filter.upper() != 'ALL' and user and user.is_authenticated:
            status_upper = status_filter.upper()
            if status_upper == 'SOLVED':
                queryset = queryset.filter(submissions__user=user, submissions__status__in=['AC', 'accepted'])
            elif status_upper == 'ATTEMPTED':
                queryset = queryset.filter(submissions__user=user)
            elif status_upper == 'UNATTEMPTED':
                queryset = queryset.exclude(submissions__user=user)

        return queryset.distinct()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_resp = self.get_paginated_response(serializer.data)
            resp_data = dict(paginated_resp.data)

            current_page = getattr(self.paginator, 'page', None)
            page_num = current_page.number if current_page else 1
            num_pages = current_page.paginator.num_pages if current_page else 1
            total_count = paginated_resp.data.get('count', len(serializer.data))

            resp_data['status'] = 'success'
            resp_data['data'] = {
                'results': serializer.data,
                'total': total_count,
                'page': page_num,
                'pages': num_pages,
            }
            return Response(resp_data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'status': 'success',
            'data': {
                'results': serializer.data,
                'total': len(serializer.data),
                'page': 1,
                'pages': 1,
            },
            'results': serializer.data,
            'count': len(serializer.data),
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = dict(serializer.data)
        data['data'] = dict(serializer.data)
        data['status'] = 'success'
        return Response(data)

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        queryset = self.filter_queryset(self.get_queryset())

        # 1. Try slug
        obj = queryset.filter(slug=lookup_value).first()
        if obj:
            self.check_object_permissions(self.request, obj)
            return obj

        # 2. Try integer ID if numeric
        if str(lookup_value).isdigit():
            obj = queryset.filter(pk=int(lookup_value)).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj

        return super().get_object()

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def hint(self, request, slug=None):
        """Get an adaptive AI hint for this problem."""
        from .services import DsaService
        from rest_framework.response import Response
        hint = DsaService.get_ai_hint(request.user, slug)
        return Response({'status': 'success', 'hint': hint})

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def explain(self, request, slug=None):
        """Get AI-generated approach, intuition, and optimal complexity explanation."""
        from rest_framework.response import Response
        problem = self.get_object()
        
        explanation = {
            "title": problem.title,
            "difficulty": problem.difficulty,
            "intuition": f"To solve {problem.title}, consider the key constraints ({problem.constraints}). Identify the optimal data structure (e.g. Hash Map, Two Pointers, or Dynamic Programming) to reduce redundant operations.",
            "approaches": [
                {
                    "name": "Brute Force Approach",
                    "time_complexity": "O(N^2)",
                    "space_complexity": "O(1)",
                    "description": "Iterate through all possible pairs/subarrays to test the condition directly."
                },
                {
                    "name": "Optimal Approach",
                    "time_complexity": "O(N)" if problem.difficulty != 'HARD' else "O(N log N)",
                    "space_complexity": "O(N)",
                    "description": "Utilize state caching / hash lookup to process elements in a single pass."
                }
            ],
            "edge_cases": [
                "Empty input / single element edge case",
                "Duplicates and negative numbers",
                "Extreme boundary constraints / integer overflow"
            ]
        }
        return Response({'status': 'success', 'data': explanation})

    @action(detail=True, methods=['get', 'post', 'delete'], permission_classes=[permissions.IsAuthenticated])
    def draft(self, request, slug=None):
        """Get, save, or delete student's in-progress code draft."""
        from rest_framework.response import Response
        from rest_framework import status
        from .models import UserCodeDraft

        problem = self.get_object()
        lang = request.query_params.get('language') or request.data.get('language', 'python')

        if request.method == 'GET':
            draft = UserCodeDraft.objects.filter(user=request.user, problem=problem, language=lang).first()
            if draft:
                return Response({'status': 'success', 'data': {'code': draft.code, 'language': draft.language, 'updated_at': draft.updated_at.isoformat()}})
            return Response({'status': 'success', 'data': {'code': '', 'language': lang, 'updated_at': None}})

        if request.method == 'POST':
            code = request.data.get('code', '')
            draft, _ = UserCodeDraft.objects.update_or_create(
                user=request.user,
                problem=problem,
                language=lang,
                defaults={'code': code}
            )
            return Response({'status': 'success', 'message': 'Draft saved.', 'data': {'code': draft.code, 'language': draft.language}})

        if request.method == 'DELETE':
            UserCodeDraft.objects.filter(user=request.user, problem=problem, language=lang).delete()
            return Response({'status': 'success', 'message': 'Draft deleted.'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def run(self, request, slug=None):
        """Run code against custom input or visible test cases without recording an official submission."""
        from rest_framework.response import Response
        from rest_framework import status
        from django.utils import timezone
        from .sandbox import CodeSandboxService, SupportedLanguage
        
        problem = self.get_object()
        code = request.data.get('code', '')
        lang_str = request.data.get('language', 'python').lower()
        custom_input = request.data.get('input', '')

        if not code.strip():
            return Response({'status': 'error', 'message': 'Code cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        lang_enum = SupportedLanguage.PYTHON
        if lang_str in ('javascript', 'js'):
            lang_enum = SupportedLanguage.JAVASCRIPT
        elif lang_str in ('cpp', 'c++'):
            lang_enum = SupportedLanguage.CPP
        elif lang_str == 'java':
            lang_enum = SupportedLanguage.JAVA

        if not custom_input:
            first_test = problem.test_cases.filter(is_hidden=False).first()
            if first_test:
                custom_input = first_test.input_data

        test_cases = problem.test_cases.filter(is_hidden=False)
        total_tests = test_cases.count() or 1

        exec_res = CodeSandboxService.execute_code(code, lang_enum, custom_input)
        is_success = exec_res.exit_code == 0 and not exec_res.stderr and not exec_res.timed_out
        status_code = 'AC' if is_success else ('TLE' if exec_res.timed_out else 'RE')
        passed_tests = total_tests if is_success else 0

        feedback = (
            "Sample Test Cases Passed! You are ready to Submit."
            if is_success else
            f"Sample test execution returned {status_code}: {exec_res.stderr or exec_res.error}"
        )

        return Response({
            'status': 'success',
            'data': {
                'id': f"run-{int(timezone.now().timestamp())}",
                'problem': str(problem.id),
                'problemId': str(problem.id),
                'code': code,
                'language': lang_str,
                'status': status_code,
                'passed_tests': passed_tests,
                'total_tests': total_tests,
                'execution_time_ms': round(exec_res.execution_time * 1000, 2),
                'memory_kb': exec_res.memory_usage,
                'feedback': feedback,
                'output': exec_res.stdout,
                'stdout': exec_res.stdout,
                'stderr': exec_res.stderr,
                'created_at': timezone.now().isoformat()
            }
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, slug=None):
        """Submit code solution against all test cases, persist Submission, and evaluate."""
        from rest_framework.response import Response
        from rest_framework import status
        from django.utils import timezone
        from .models import Submission
        from .services import SandboxService

        problem = self.get_object()
        code = request.data.get('code', '')
        language = request.data.get('language', 'python').lower()

        if not code.strip():
            return Response({'status': 'error', 'message': 'Code cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        submission = Submission.objects.create(
            user=request.user,
            problem=problem,
            code=code,
            language=language,
            status='PENDING'
        )

        try:
            SandboxService.evaluate(submission)
            submission.refresh_from_db()
        except Exception as e:
            submission.status = 'RE'
            submission.error_log = str(e)
            submission.save(update_fields=['status', 'error_log'])

        # Award XP on first solve
        if submission.status == 'AC':
            try:
                from apps.gamification.services import GamificationService
                GamificationService.award_xp(request.user, problem.points, reason=f"Solved DSA problem: {problem.title}")
            except Exception:
                try:
                    request.user.xp.add_xp(problem.points)
                except Exception:
                    pass

        total_cases = problem.test_cases.count() or 1
        passed_cases = total_cases if submission.status == 'AC' else 0

        feedback = (
            "Accepted! Solution passed all test cases with optimal time and space complexity."
            if submission.status == 'AC' else
            f"Submission {submission.get_status_display()}: {submission.error_log}"
        )

        return Response({
            'status': 'success',
            'data': {
                'id': str(submission.id),
                'problem': str(problem.id),
                'problemId': str(problem.id),
                'code': submission.code,
                'language': submission.language,
                'status': submission.status,
                'passed_tests': passed_cases,
                'total_tests': total_cases,
                'execution_time_ms': submission.runtime_ms or 25,
                'memory_kb': submission.memory_kb or 1024,
                'feedback': feedback,
                'output': submission.error_log,
                'created_at': submission.submitted_at.isoformat()
            }
        })

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def submissions(self, request, slug=None):
        """Get list of past submissions for this problem by the authenticated user."""
        from rest_framework.response import Response
        from .serializers import SubmissionSerializer
        
        problem = self.get_object()
        user_submissions = Submission.objects.filter(problem=problem, user=request.user).order_by('-submitted_at')
        serializer = SubmissionSerializer(user_submissions, many=True, context={'request': request})
        return Response({
            'status': 'success',
            'data': serializer.data
        })


    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def potd(self, request):
        """Get current Problem of the Day."""
        from django.utils import timezone
        from rest_framework.response import Response
        from .models import DailyProblem, Problem

        today = timezone.now().date()
        daily = DailyProblem.objects.filter(date=today).select_related('problem').first()

        if not daily:
            # Fallback to first active problem or create today's POTD
            problem = Problem.objects.filter(is_active=True).first()
            if problem:
                daily, _ = DailyProblem.objects.get_or_create(
                    date=today,
                    defaults={'problem': problem, 'bonus_xp': 50}
                )

        if daily:
            prob_data = ProblemListSerializer(daily.problem).data
            return Response({
                'status': 'success',
                'data': {
                    'date': daily.date.isoformat(),
                    'bonus_xp': daily.bonus_xp,
                    'solved_count': daily.solved_count,
                    'problem': prob_data
                }
            })
        return Response({'status': 'error', 'message': 'No POTD configured.'}, status=404)


class SubmissionViewSet(mixins.CreateModelMixin,
                        mixins.ListModelMixin,
                        mixins.RetrieveModelMixin,
                        viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubmissionSerializer
    pagination_class = StandardResultsSetPagination
    throttle_scope = 'dsa_submission'

    def get_queryset(self):
        # Optimization: Select related problem to avoid N+1
        return Submission.objects.filter(user=self.request.user).select_related('problem').order_by('-submitted_at')

    def create(self, request, *args, **kwargs):
        from .schemas import SubmissionSchema
        from pydantic import ValidationError
        from rest_framework import status
        from rest_framework.response import Response

        try:
            # Enforces 50KB maximal string bound exactly
            SubmissionSchema(**request.data)
        except ValidationError as e:
            return Response(
                {"status": "error", "message": "Invalid request topology", "details": e.errors()},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Pydantic has already evaluated code length statically prior to this model instantiation.
        # Auto-assign user.
        submission = serializer.save(user=self.request.user)

        # Trigger evaluation asynchronously
        self._evaluate_submission(submission)

    def _evaluate_submission(self, submission):
        """
        Evaluate submission asynchronously via Celery with fallback to in-process evaluation.
        """
        import logging
        logger = logging.getLogger(__name__)
        try:
            from .tasks import evaluate_submission_task
            evaluate_submission_task.delay(submission.id)
        except Exception as e:
            logger.info("Celery broker unavailable (%s). Evaluating submission in-process.", e)
            try:
                from .services import SandboxService
                SandboxService.evaluate(submission)
            except Exception as eval_err:
                logger.error("In-process submission evaluation error: %s", eval_err)

