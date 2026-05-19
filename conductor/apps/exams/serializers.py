"""Serializers for exam taxonomy API."""
from rest_framework import serializers
from .models import Country, Exam, Subject, Topic


class CountrySerializer(serializers.ModelSerializer):
    active_exam_count = serializers.ReadOnlyField()

    class Meta:
        model = Country
        fields = ['id', 'code', 'name', 'timezone', 'currency', 'language', 'is_active', 'active_exam_count']


class ExamListSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source='country.name', read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True)
    subject_count = serializers.ReadOnlyField()
    total_questions = serializers.ReadOnlyField()
    duration_minutes = serializers.ReadOnlyField()
    has_negative_marking = serializers.ReadOnlyField()

    class Meta:
        model = Exam
        fields = [
            'id', 'code', 'name', 'full_name', 'description',
            'country_name', 'country_code', 'subject_count',
            'total_questions', 'total_marks', 'duration_minutes',
            'has_negative_marking', 'is_active', 'is_featured',
            'popularity_score', 'frequency', 'next_exam_date',
        ]


class ExamDetailSerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)
    subjects = serializers.SerializerMethodField()
    total_questions = serializers.ReadOnlyField()
    duration_minutes = serializers.ReadOnlyField()
    has_negative_marking = serializers.ReadOnlyField()

    class Meta:
        model = Exam
        fields = [
            'id', 'code', 'name', 'full_name', 'description',
            'country', 'pattern', 'difficulty_distribution',
            'official_website', 'conducting_body', 'frequency',
            'next_exam_date', 'total_questions', 'total_marks',
            'duration_minutes', 'has_negative_marking',
            'subjects', 'is_active', 'is_featured',
        ]

    def get_subjects(self, obj):
        subjects = obj.subjects.filter(is_active=True).prefetch_related('topics')
        return SubjectBriefSerializer(subjects, many=True).data


class SubjectBriefSerializer(serializers.ModelSerializer):
    topic_count = serializers.ReadOnlyField()

    class Meta:
        model = Subject
        fields = ['id', 'code', 'name', 'description', 'weightage', 'expected_questions', 'topic_count']


class SubjectDetailSerializer(serializers.ModelSerializer):
    topics = serializers.SerializerMethodField()
    topic_count = serializers.ReadOnlyField()

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'name', 'description', 'weightage',
            'expected_questions', 'topic_count', 'topics',
        ]

    def get_topics(self, obj):
        topics = obj.topics.filter(is_active=True, parent__isnull=True).select_related('subject')
        return TopicTreeSerializer(topics, many=True).data


class TopicSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    full_path = serializers.ReadOnlyField()

    class Meta:
        model = Topic
        fields = [
            'id', 'name', 'description', 'subject_name',
            'full_path', 'question_count', 'avg_difficulty',
            'difficulty_trend', 'is_active',
        ]


class TopicTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    full_path = serializers.ReadOnlyField()

    class Meta:
        model = Topic
        fields = [
            'id', 'name', 'description', 'full_path',
            'question_count', 'avg_difficulty', 'children',
        ]

    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return TopicTreeSerializer(children, many=True).data


class TopicListSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_code = serializers.CharField(source='subject.exam.code', read_only=True)
    exam_name = serializers.CharField(source='subject.exam.name', read_only=True)
    full_path = serializers.ReadOnlyField()

    class Meta:
        model = Topic
        fields = [
            'id', 'name', 'full_path', 'subject_name',
            'exam_code', 'exam_name', 'question_count',
            'avg_difficulty', 'is_active',
        ]
