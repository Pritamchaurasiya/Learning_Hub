from rest_framework import serializers
from .models import Problem, TestCase, ProblemSubmission

class TestCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCase
        fields = ['id', 'input_data', 'expected_output', 'is_hidden', 'order']

class ProblemListSerializer(serializers.ModelSerializer):
    user_status = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = [
            'id', 'title', 'slug', 'difficulty', 'category',
            'acceptance_rate', 'submissions_count', 'user_status'
        ]

    def get_user_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 'UNATTEMPTED'
        solved_ids = self.context.get('solved_problem_ids')
        attempted_ids = self.context.get('attempted_problem_ids')
        if solved_ids is not None:
            if obj.id in solved_ids:
                return 'SOLVED'
            elif attempted_ids is not None and obj.id in attempted_ids:
                return 'ATTEMPTED'
            return 'UNATTEMPTED'
        subs = ProblemSubmission.objects.filter(user=request.user, problem=obj)
        if subs.filter(status='Accepted').exists():
            return 'SOLVED'
        elif subs.exists():
            return 'ATTEMPTED'
        return 'UNATTEMPTED'

class ProblemDetailSerializer(serializers.ModelSerializer):
    test_cases = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = [
            'id', 'title', 'slug', 'description', 'difficulty', 'category',
            'acceptance_rate', 'submissions_count', 'hints', 'starter_code',
            'time_limit_sec', 'memory_limit_mb', 'test_cases'
        ]

    def get_test_cases(self, obj):
        # Expose only non-hidden test cases to frontend workspace
        visible_cases = obj.test_cases.filter(is_hidden=False)
        return TestCaseSerializer(visible_cases, many=True).data

class ProblemSubmissionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    problem_title = serializers.CharField(source='problem.title', read_only=True)

    class Meta:
        model = ProblemSubmission
        fields = [
            'id', 'user_name', 'problem_title', 'language', 'code',
            'status', 'runtime_ms', 'memory_mb', 'passed_testcases',
            'total_testcases', 'stdout', 'stderr', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'runtime_ms', 'memory_mb', 'passed_testcases', 'total_testcases', 'stdout', 'stderr', 'created_at']
