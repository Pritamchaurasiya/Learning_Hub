from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from apps.core.responses import success_response, error_response
from .models import Problem, TestCase, ProblemSubmission
from .serializers import ProblemListSerializer, ProblemDetailSerializer, ProblemSubmissionSerializer
from .sandbox import CodeSandboxService

class ProblemListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Problem.objects.all()
        difficulty = request.query_params.get('difficulty')
        category = request.query_params.get('category')
        search = request.query_params.get('search') or request.query_params.get('q')

        if difficulty and difficulty != 'All':
            queryset = queryset.filter(difficulty__iexact=difficulty)
        if category and category != 'All':
            queryset = queryset.filter(category__iexact=category)
        context = {'request': request}
        if request.user and request.user.is_authenticated:
            user_subs = ProblemSubmission.objects.filter(user=request.user)
            context['solved_problem_ids'] = set(user_subs.filter(status='Accepted').values_list('problem_id', flat=True))
            context['attempted_problem_ids'] = set(user_subs.values_list('problem_id', flat=True))

        if search:
            from apps.core.search import TokenizedSearchEngine
            problems = TokenizedSearchEngine.search_and_rank(
                queryset=queryset,
                query=search,
                title_field='title',
                desc_field='description',
                limit=100
            )
            serializer = ProblemListSerializer(problems, many=True, context=context)
            return success_response(data=serializer.data, meta={'count': len(serializer.data), 'query': search})

        serializer = ProblemListSerializer(queryset, many=True, context=context)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class ProblemDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        problem = Problem.objects.prefetch_related('test_cases').filter(Q(pk=pk) | Q(slug=pk) | Q(slug=f'{pk}-problem') | Q(slug__iexact=pk) | Q(slug__istartswith=pk)).first()
        if not problem:
            return error_response('Problem not found', status_code=status.HTTP_404_NOT_FOUND)

        serializer = ProblemDetailSerializer(problem)
        return success_response(data=serializer.data)

class RunCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        code = request.data.get('code', '')
        language = request.data.get('language', 'python')
        custom_input = request.data.get('input', '')

        if not code.strip():
            return error_response('Code cannot be empty', status_code=status.HTTP_400_BAD_REQUEST)

        result = CodeSandboxService.execute_code(code, language, custom_input)
        status_map = {
            'Accepted': 'AC',
            'Wrong Answer': 'WA',
            'Time Limit Exceeded': 'TLE',
            'Runtime Error': 'RE',
            'Compilation Error': 'CE',
        }
        res_status = result.get('status', 'Accepted')
        short_status = status_map.get(res_status, 'AC' if result.get('success') else 'RE')

        from django.utils import timezone
        run_data = {
            **result,
            'id': f"run-{int(timezone.now().timestamp() * 1000)}",
            'problem': pk or 'code-run',
            'code': code,
            'language': language,
            'status': short_status,
            'full_status': res_status,
            'passed_tests': 1 if result.get('success') else 0,
            'total_tests': 1,
            'execution_time_ms': result.get('runtime_ms', 35),
            'memory_kb': int(result.get('memory_mb', 14.0) * 1024),
            'feedback': 'Sample Test Passed' if result.get('success') else (result.get('stderr') or 'Execution failed'),
            'created_at': timezone.now().isoformat(),
        }
        return success_response(data=run_data, message='Code executed')

class SubmitProblemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        problem = Problem.objects.prefetch_related('test_cases').filter(Q(pk=pk) | Q(slug=pk) | Q(slug=f'{pk}-problem') | Q(slug__iexact=pk) | Q(slug__istartswith=pk)).first()
        if not problem:
            return error_response('Problem not found', status_code=status.HTTP_404_NOT_FOUND)

        code = request.data.get('code', '')
        language = request.data.get('language', 'python')

        if not code.strip():
            return error_response('Code cannot be empty', status_code=status.HTTP_400_BAD_REQUEST)

        test_cases = list(problem.test_cases.all())
        total_cases = len(test_cases)
        passed_cases = 0
        final_status = 'Accepted'
        last_stdout = ''
        last_stderr = ''
        total_runtime = 0
        peak_memory = 0.0

        if total_cases == 0:
            exec_res = CodeSandboxService.execute_code(code, language)
            final_status = exec_res['status']
            last_stdout = exec_res['stdout']
            last_stderr = exec_res['stderr']
            total_runtime = exec_res['runtime_ms']
            peak_memory = exec_res['memory_mb']
            passed_cases = 1 if exec_res['success'] else 0
            total_cases = 1
        else:
            for tc in test_cases:
                exec_res = CodeSandboxService.execute_code(code, language, input_data=tc.input_data)
                total_runtime += exec_res['runtime_ms']
                peak_memory = max(peak_memory, exec_res['memory_mb'])

                if not exec_res['success']:
                    final_status = exec_res['status']
                    last_stderr = exec_res['stderr']
                    last_stdout = exec_res['stdout']
                    break

                actual_out = exec_res['stdout'].strip()
                expected_out = tc.expected_output.strip()

                if actual_out == expected_out or actual_out.split() == expected_out.split():
                    passed_cases += 1
                else:
                    final_status = 'Wrong Answer'
                    if tc.is_hidden:
                        last_stdout = f"Test case {tc.order} failed (hidden test case)."
                    else:
                        last_stdout = f"Output: {actual_out}\nExpected: {expected_out}"
                    break

        avg_runtime = int(total_runtime / max(1, total_cases))

        submission = ProblemSubmission.objects.create(
            user=request.user,
            problem=problem,
            language=language,
            code=code,
            status=final_status,
            runtime_ms=avg_runtime,
            memory_mb=peak_memory,
            passed_testcases=passed_cases,
            total_testcases=total_cases,
            stdout=last_stdout,
            stderr=last_stderr
        )

        problem.submissions_count += 1
        problem.save(update_fields=['submissions_count'])

        # Award XP only for first accepted submission of this problem
        if final_status == 'Accepted':
            already_solved = ProblemSubmission.objects.filter(
                user=request.user,
                problem=problem,
                status='Accepted'
            ).exclude(pk=submission.pk).exists()
            if not already_solved:
                request.user.xp += 25
                request.user.save(update_fields=['xp'])

        return success_response(
            data=ProblemSubmissionSerializer(submission).data,
            message='Submission evaluated successfully',
            status_code=status.HTTP_201_CREATED
        )

class ProblemSubmissionsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        problem = Problem.objects.filter(Q(pk=pk) | Q(slug=pk) | Q(slug=f'{pk}-problem') | Q(slug__iexact=pk) | Q(slug__istartswith=pk)).first()
        problem_id = problem.id if problem else pk
        submissions = ProblemSubmission.objects.filter(problem_id=problem_id, user=request.user)
        serializer = ProblemSubmissionSerializer(submissions, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})


class ProblemRecommendationsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .recommendations import DSARecommendationEngine
        try:
            limit = int(request.query_params.get('limit', 6))
        except (ValueError, TypeError):
            limit = 6
        try:
            category_cap = int(request.query_params.get('category_cap', 2))
        except (ValueError, TypeError):
            category_cap = 2

        user = request.user if (request.user and request.user.is_authenticated) else None
        recs = DSARecommendationEngine.get_recommendations(
            user=user,
            limit=limit,
            category_cap=category_cap
        )
        return success_response(
            data=recs,
            meta={'count': len(recs), 'engine': 'DSA-Next-Best-Action-v1'}
        )


class DSAStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if (request.user and request.user.is_authenticated) else None
        total_problems = Problem.objects.count()
        total_easy = Problem.objects.filter(difficulty__iexact='Easy').count()
        total_medium = Problem.objects.filter(difficulty__iexact='Medium').count()
        total_hard = Problem.objects.filter(difficulty__iexact='Hard').count()

        if user:
            solved_pids = set(ProblemSubmission.objects.filter(user=user, status='Accepted').values_list('problem_id', flat=True))
            attempted_pids = set(ProblemSubmission.objects.filter(user=user).values_list('problem_id', flat=True))
            submissions_count = ProblemSubmission.objects.filter(user=user).count()

            solved_problems = len(solved_pids)
            attempted_problems = len(attempted_pids)
            acceptance_rate = round((solved_problems / max(1, attempted_problems)) * 100, 1)

            easy_solved = Problem.objects.filter(id__in=solved_pids, difficulty__iexact='Easy').count()
            medium_solved = Problem.objects.filter(id__in=solved_pids, difficulty__iexact='Medium').count()
            hard_solved = Problem.objects.filter(id__in=solved_pids, difficulty__iexact='Hard').count()

            current_streak = getattr(user, 'streak', 0) or 0
            longest_streak = getattr(user, 'longest_streak', current_streak) or current_streak
            rank = getattr(user, 'level', 1) * 10
        else:
            solved_problems = 0
            attempted_problems = 0
            submissions_count = 0
            acceptance_rate = 0.0
            easy_solved = 0
            medium_solved = 0
            hard_solved = 0
            current_streak = 0
            longest_streak = 0
            rank = 1

        stats_data = {
            'total_problems': total_problems,
            'solved_problems': solved_problems,
            'attempted_problems': attempted_problems,
            'submissions_count': submissions_count,
            'acceptance_rate': acceptance_rate,
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'rank': rank,
            'easy_solved': easy_solved,
            'medium_solved': medium_solved,
            'hard_solved': hard_solved,
            'total_easy': total_easy,
            'total_medium': total_medium,
            'total_hard': total_hard,
            # Dual camelCase support
            'totalProblems': total_problems,
            'solvedProblems': solved_problems,
            'attemptedProblems': attempted_problems,
            'submissionsCount': submissions_count,
            'acceptanceRate': acceptance_rate,
            'currentStreak': current_streak,
            'longestStreak': longest_streak,
            'easySolved': easy_solved,
            'mediumSolved': medium_solved,
            'hardSolved': hard_solved,
            'totalEasy': total_easy,
            'totalMedium': total_medium,
            'totalHard': total_hard,
        }
        return success_response(data=stats_data)
