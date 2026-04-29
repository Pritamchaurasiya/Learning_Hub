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

    class Meta:
        model = Problem
        fields = ['id', 'title', 'slug', 'difficulty', 'points', 'tags', 'is_active']


class ProblemDetailSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    example_cases = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = [
            'id', 'title', 'slug', 'description', 'difficulty',
            'points', 'tags', 'constraints', 'input_format', 'output_format',
            'examples', 'example_cases'
        ]

    def get_example_cases(self, obj):
        # Fallback to test_cases if examples field is empty
        if not obj.examples:
            examples = obj.test_cases.filter(is_hidden=False)
            return TestCaseSerializer(examples, many=True).data
        return obj.examples


class SubmissionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Submission
        fields = [
            'id', 'user', 'problem', 'code', 'language',
            'status', 'status_display', 'runtime_ms', 'memory_kb',
            'error_log', 'ai_feedback', 'submitted_at'
        ]
        read_only_fields = ['user', 'status', 'runtime_ms', 'memory_kb', 'error_log', 'submitted_at']
