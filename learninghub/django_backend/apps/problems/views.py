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
        if search:
            queryset = queryset.filter(title__icontains=search) | queryset.filter(description__icontains=search)

        serializer = ProblemListSerializer(queryset, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class ProblemDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        problem = Problem.objects.prefetch_related('test_cases').filter(Q(pk=pk) | Q(slug=pk)).first()
        if not problem:
            return error_response('Problem not found', status_code=status.HTTP_404_NOT_FOUND)

        serializer = ProblemDetailSerializer(problem)
        return success_response(data=serializer.data)

class RunCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk=None):
        code = request.data.get('code', '')
        language = request.data.get('language', 'python')
        custom_input = request.data.get('input', '')

        if not code.strip():
            return error_response('Code cannot be empty', status_code=status.HTTP_400_BAD_REQUEST)

        result = CodeSandboxService.execute_code(code, language, custom_input)
        return success_response(data=result, message='Code executed')

class SubmitProblemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        problem = Problem.objects.prefetch_related('test_cases').filter(Q(pk=pk) | Q(slug=pk)).first()
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

        # Award XP for first accepted submission
        if final_status == 'Accepted':
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
        problem = Problem.objects.filter(Q(pk=pk) | Q(slug=pk)).first()
        problem_id = problem.id if problem else pk
        submissions = ProblemSubmission.objects.filter(problem_id=problem_id, user=request.user)
        serializer = ProblemSubmissionSerializer(submissions, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})
