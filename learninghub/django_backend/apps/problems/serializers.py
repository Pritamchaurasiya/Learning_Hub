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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['tags'] = [{'id': f'tag-{instance.category.lower()}', 'name': instance.category, 'slug': instance.category.lower()}] if instance.category else []
        data['topic'] = instance.category
        data['points'] = 10 if instance.difficulty == 'Easy' else (20 if instance.difficulty == 'Medium' else 35)
        return data

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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        status_map = {
            'Accepted': 'AC',
            'Wrong Answer': 'WA',
            'Time Limit Exceeded': 'TLE',
            'Runtime Error': 'RE',
            'Compilation Error': 'CE',
        }
        short_status = status_map.get(instance.status, instance.status)
        data['status'] = instance.status
        data['short_status'] = short_status
        data['full_status'] = instance.status
        data['execution_time_ms'] = instance.runtime_ms
        data['memory_kb'] = int((instance.memory_mb or 14.0) * 1024)
        data['passed_tests'] = instance.passed_testcases
        data['total_tests'] = instance.total_testcases
        data['feedback'] = (
            f"All {instance.passed_testcases}/{instance.total_testcases} Test Cases Passed in {instance.runtime_ms}ms!"
            if instance.status == 'Accepted'
            else f"Evaluation: {instance.status} ({instance.passed_testcases}/{instance.total_testcases} passed)"
        )
        return data
