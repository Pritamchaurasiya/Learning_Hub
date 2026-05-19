"""Serializers for test engine API."""
from rest_framework import serializers
from .models import Question, Option, Test, TestQuestion, TestAttempt, AttemptAnswer


class OptionSerializer(serializers.ModelSerializer):
    """Option without correct answer (for test takers)."""
    class Meta:
        model = Option
        fields = ['id', 'text', 'order']


class OptionWithCorrectSerializer(serializers.ModelSerializer):
    """Option with correct answer (for review/admin)."""
    class Meta:
        model = Option
        fields = ['id', 'text', 'is_correct', 'explanation', 'order']


class QuestionSerializer(serializers.ModelSerializer):
    """Question for test taking (no correct answer exposed)."""
    options = OptionSerializer(many=True, read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    subject_name = serializers.CharField(source='topic.subject.name', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'text', 'question_type', 'difficulty', 'bloom_level',
            'topic_name', 'subject_name', 'options',
        ]


class QuestionReviewSerializer(serializers.ModelSerializer):
    """Question with correct answer (for review after submission)."""
    options = OptionWithCorrectSerializer(many=True, read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'text', 'question_type', 'difficulty', 'bloom_level',
            'topic_name', 'options', 'explanation', 'solution_steps',
        ]


class QuestionDetailSerializer(serializers.ModelSerializer):
    """Full question detail (for admin/instructor)."""
    options = OptionWithCorrectSerializer(many=True, read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    subject_name = serializers.CharField(source='topic.subject.name', read_only=True)
    exam_name = serializers.CharField(source='topic.subject.exam.name', read_only=True)
    accuracy_rate = serializers.ReadOnlyField()

    class Meta:
        model = Question
        fields = [
            'id', 'text', 'question_type', 'difficulty', 'discrimination',
            'guess_factor', 'bloom_level', 'explanation', 'solution_steps',
            'tags', 'is_ai_generated', 'ai_model', 'is_verified',
            'usage_count', 'correct_count', 'incorrect_count', 'accuracy_rate',
            'avg_time_seconds', 'reported_count',
            'topic_name', 'subject_name', 'exam_name', 'options',
            'created_at', 'updated_at',
        ]


class TestListSerializer(serializers.ModelSerializer):
    """Test listing."""
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    exam_code = serializers.CharField(source='exam.code', read_only=True)
    country_name = serializers.CharField(source='exam.country.name', read_only=True)
    question_count = serializers.ReadOnlyField()
    avg_difficulty = serializers.ReadOnlyField()

    class Meta:
        model = Test
        fields = [
            'id', 'title', 'description', 'mode', 'difficulty',
            'time_limit_minutes', 'passing_score', 'total_marks',
            'negative_marks_per_question', 'question_count', 'avg_difficulty',
            'exam_name', 'exam_code', 'country_name',
            'is_ai_generated', 'is_featured', 'attempt_count',
            'created_at',
        ]


class TestDetailSerializer(serializers.ModelSerializer):
    """Test detail with questions."""
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    exam_code = serializers.CharField(source='exam.code', read_only=True)
    country_name = serializers.CharField(source='exam.country.name', read_only=True)
    question_count = serializers.ReadOnlyField()
    questions = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            'id', 'title', 'description', 'mode', 'difficulty',
            'time_limit_minutes', 'passing_score', 'total_marks',
            'negative_marks_per_question', 'marks_per_correct',
            'exam_name', 'exam_code', 'country_name',
            'question_count', 'questions',
            'is_ai_generated', 'is_featured',
            'created_at',
        ]

    def get_questions(self, obj):
        tq_list = obj.test_questions.select_related('question').prefetch_related(
            'question__options'
        ).order_by('order')

        questions = []
        for tq in tq_list:
            q = tq.question
            questions.append({
                'id': str(q.id),
                'order': tq.order,
                'marks': tq.marks,
                'text': q.text,
                'question_type': q.question_type,
                'difficulty': q.difficulty,
                'bloom_level': q.bloom_level,
                'options': [
                    {'id': str(o.id), 'text': o.text, 'order': o.order}
                    for o in q.options.all()
                ],
            })
        return questions


class TestGenerationRequestSerializer(serializers.Serializer):
    """Request to AI-generate a new test."""
    exam_id = serializers.UUIDField()
    subject_id = serializers.UUIDField(required=False)
    topic_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )
    mode = serializers.ChoiceField(choices=Test.MODES, default='mock')
    difficulty = serializers.ChoiceField(choices=Test.DIFFICULTIES, default='mixed')
    question_count = serializers.IntegerField(min_value=5, max_value=200, default=30)
    time_limit_minutes = serializers.IntegerField(min_value=5, max_value=480, required=False)


class StartAttemptSerializer(serializers.Serializer):
    """Request to start a test attempt."""
    mode = serializers.ChoiceField(choices=Test.MODES, default='mock')


class AutosaveAnswerSerializer(serializers.Serializer):
    """Request to autosave an answer."""
    question_id = serializers.UUIDField()
    selected_options = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )
    text_answer = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    time_spent = serializers.IntegerField(min_value=0, required=False)


class AttemptListSerializer(serializers.ModelSerializer):
    """Test attempt listing."""
    test_title = serializers.CharField(source='test.title', read_only=True)
    exam_name = serializers.CharField(source='test.exam.name', read_only=True)
    time_taken_formatted = serializers.SerializerMethodField()

    class Meta:
        model = TestAttempt
        fields = [
            'id', 'test', 'test_title', 'exam_name', 'mode', 'status',
            'score', 'total_marks', 'percentage', 'passed',
            'time_taken_seconds', 'time_taken_formatted',
            'attempt_number', 'started_at', 'submitted_at',
        ]

    def get_time_taken_formatted(self, obj):
        mins = obj.time_taken_seconds // 60
        secs = obj.time_taken_seconds % 60
        return f"{mins}:{secs:02d}"


class AttemptDetailSerializer(serializers.ModelSerializer):
    """Detailed attempt with answers."""
    test_title = serializers.CharField(source='test.title', read_only=True)
    exam_name = serializers.CharField(source='test.exam.name', read_only=True)
    answers = serializers.SerializerMethodField()

    class Meta:
        model = TestAttempt
        fields = [
            'id', 'test', 'test_title', 'exam_name', 'mode', 'status',
            'score', 'total_marks', 'percentage', 'passed',
            'time_taken_seconds', 'attempt_number',
            'started_at', 'submitted_at', 'last_activity_at',
            'answers',
        ]

    def get_answers(self, obj):
        answers = obj.answers.select_related('question').prefetch_related(
            'question__options', 'selected_options'
        ).order_by('question__id')

        return [
            {
                'id': str(a.id),
                'question_id': str(a.question.id),
                'question_text': a.question.text[:200],
                'question_type': a.question.question_type,
                'selected_options': [
                    {'id': str(o.id), 'text': o.text}
                    for o in a.selected_options.all()
                ],
                'text_answer': a.text_answer,
                'is_correct': a.is_correct,
                'marks_obtained': a.marks_obtained,
                'time_spent': a.time_spent_seconds,
                'is_flagged': a.is_flagged,
                'is_bookmarked': a.is_bookmarked,
                'answered_at': a.answered_at,
            }
            for a in answers
        ]


class AttemptResultSerializer(serializers.Serializer):
    """Test attempt result."""
    attempt_id = serializers.UUIDField()
    test_id = serializers.UUIDField()
    test_title = serializers.CharField()
    mode = serializers.CharField()
    score = serializers.FloatField()
    total_marks = serializers.FloatField()
    percentage = serializers.FloatField()
    passed = serializers.BooleanField()
    time_taken = serializers.IntegerField()
    time_limit = serializers.IntegerField()
    correct_count = serializers.IntegerField()
    incorrect_count = serializers.IntegerField()
    unanswered_count = serializers.IntegerField()
    question_results = serializers.ListField()
