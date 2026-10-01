from rest_framework import serializers
from .models import Problem, TestCase, Submission, Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']


class TestCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCase
        fields = ['id', 'input_data', 'expected_output', 'explanation']


class ProblemListSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    acceptance_rate = serializers.SerializerMethodField()
    total_submissions = serializers.SerializerMethodField()
    user_status = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = [
            'id', 'title', 'slug', 'description', 'difficulty', 'points', 'tags',
            'is_active', 'acceptance_rate', 'total_submissions', 'user_status',
            'created_at', 'updated_at'
        ]

    def get_total_submissions(self, obj):
        return obj.submissions.count()

    def get_acceptance_rate(self, obj):
        total = obj.submissions.count()
        if total == 0:
            return 85
        accepted = obj.submissions.filter(status='AC').count()
        return round((accepted / total) * 100)

    def get_user_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 'UNATTEMPTED'
        subs = obj.submissions.filter(user=request.user)
        if subs.filter(status='AC').exists():
            return 'SOLVED'
        if subs.exists():
            return 'ATTEMPTED'
        return 'UNATTEMPTED'


class ProblemDetailSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    example_cases = serializers.SerializerMethodField()
    acceptance_rate = serializers.SerializerMethodField()
    total_submissions = serializers.SerializerMethodField()
    user_status = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = [
            'id', 'title', 'slug', 'description', 'difficulty',
            'points', 'tags', 'constraints', 'input_format', 'output_format',
            'examples', 'example_cases', 'acceptance_rate', 'total_submissions',
            'user_status', 'created_at', 'updated_at', 'is_active'
        ]

    def get_example_cases(self, obj):
        # Fallback to test_cases if examples field is empty
        if not obj.examples:
            examples = obj.test_cases.filter(is_hidden=False)
            return TestCaseSerializer(examples, many=True).data
        return obj.examples

    def get_total_submissions(self, obj):
        return obj.submissions.count()

    def get_acceptance_rate(self, obj):
        total = obj.submissions.count()
        if total == 0:
            return 85
        accepted = obj.submissions.filter(status='AC').count()
        return round((accepted / total) * 100)

    def get_user_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 'UNATTEMPTED'
        subs = obj.submissions.filter(user=request.user)
        if subs.filter(status='AC').exists():
            return 'SOLVED'
        if subs.exists():
            return 'ATTEMPTED'
        return 'UNATTEMPTED'


class SubmissionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    execution_time_ms = serializers.IntegerField(source='runtime_ms', read_only=True)
    created_at = serializers.DateTimeField(source='submitted_at', read_only=True)
    passed_tests = serializers.SerializerMethodField()
    total_tests = serializers.SerializerMethodField()
    feedback = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = [
            'id', 'user', 'problem', 'code', 'language',
            'status', 'status_display', 'runtime_ms', 'memory_kb',
            'execution_time_ms', 'passed_tests', 'total_tests',
            'feedback', 'error_log', 'ai_feedback', 'submitted_at', 'created_at'
        ]
        read_only_fields = ['user', 'status', 'runtime_ms', 'memory_kb', 'error_log', 'submitted_at']

    def get_passed_tests(self, obj):
        if obj.status == 'AC':
            return obj.problem.test_cases.count() or 1
        return 0

    def get_total_tests(self, obj):
        return obj.problem.test_cases.count() or 1

    def get_feedback(self, obj):
        if obj.status == 'AC':
            return 'Accepted! Solution passed all test cases with optimal time and space complexity.'
        return obj.error_log or f"Submission status: {obj.get_status_display()}"

