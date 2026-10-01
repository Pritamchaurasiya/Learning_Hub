from rest_framework import serializers
from .models import Course, Chapter, Lesson, Enrollment, LessonProgress, CourseReview, CourseBookmark

class LessonSerializer(serializers.ModelSerializer):
    duration = serializers.SerializerMethodField()
    video_url = serializers.CharField(source='video_url', allow_null=True)
    is_free = serializers.BooleanField(source='is_free_preview')
    completed = serializers.SerializerMethodField()
    
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'content', 'video_url', 'duration', 'is_free', 'order', 'completed']

    def get_duration(self, obj):
        return f"{obj.duration_minutes} min"

    def get_completed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return LessonProgress.objects.filter(user=request.user, lesson=obj, completed=True).exists()
        return False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        is_authorized = False
        if request and request.user.is_authenticated:
            if getattr(request.user, 'role', '') in ('ADMIN', 'INSTRUCTOR') or request.user.is_staff:
                is_authorized = True
            elif hasattr(instance, 'chapter') and instance.chapter and hasattr(instance.chapter, 'course'):
                is_authorized = Enrollment.objects.filter(user=request.user, course=instance.chapter.course).exists()

        if not instance.is_free_preview and not is_authorized:
            data['video_url'] = None
            data['content'] = 'Enroll in this course to access the full lesson content and video materials.'

        return data

class ChapterSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    completed_lessons_count = serializers.SerializerMethodField()
    total_lessons_count = serializers.SerializerMethodField()

    class Meta:
        model = Chapter
        fields = ['id', 'title', 'order', 'lessons', 'completed_lessons_count', 'total_lessons_count']

    def get_completed_lessons_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return LessonProgress.objects.filter(
                user=request.user, 
                lesson__chapter=obj, 
                completed=True
            ).count()
        return 0

    def get_total_lessons_count(self, obj):
        return obj.lessons.count()

class CourseReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_avatar = serializers.CharField(source='user.avatar', read_only=True)

    class Meta:
        model = CourseReview
        fields = ['id', 'user_name', 'user_avatar', 'rating', 'review_text', 'created_at']

class CourseListSerializer(serializers.ModelSerializer):
    instructor = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'short_description', 'thumbnail_url',
            'trailer_video', 'instructor', 'category', 'level', 'price', 'original_price',
            'rating', 'review_count', 'student_count', 'duration_hours', 'duration',
            'level', 'language', 'certificate', 'is_published', 'created_at', 'updated_at',
            'passing_score', 'total_marks', 'negative_marks'
        ]

    def get_instructor(self, obj):
        if obj.instructor:
            return {
                'id': obj.instructor.id,
                'display_name': obj.instructor.username,
                'avatar': obj.instructor.avatar,
                'bio': obj.instructor_bio,
                'total_students': obj.instructor_total_students,
                'total_courses': obj.instructor_total_courses,
            }
        return {
            'id': 'inst-default',
            'display_name': obj.instructor_name or 'Lead Faculty',
            'avatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            'bio': '',
            'total_students': 0,
            'total_courses': 0,
        }

    def get_duration(self, obj):
        return f"{obj.duration_hours} hours"

class CourseDetailSerializer(CourseListSerializer):
    chapters = ChapterSerializer(many=True, read_only=True)
    reviews = CourseReviewSerializer(many=True, read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    learning_outcomes = serializers.JSONField()
    prerequisites = serializers.JSONField()
    tags = serializers.JSONField()
    passing_score = serializers.IntegerField()
    total_marks = serializers.IntegerField()
    negative_marks = serializers.IntegerField()

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + [
            'chapters', 'reviews', 'is_enrolled', 'progress_percent', 
            'is_bookmarked', 'learning_outcomes', 'prerequisites', 'tags',
            'passing_score', 'total_marks', 'negative_marks'
        ]

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Enrollment.objects.filter(user=request.user, course=obj).exists()
        return False

    def get_progress_percent(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            enrollment = Enrollment.objects.filter(user=request.user, course=obj).first()
            return enrollment.progress if enrollment else 0.0
        return 0.0

    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return CourseBookmark.objects.filter(user=request.user, course=obj).exists()
        return False

class CourseReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_avatar = serializers.CharField(source='user.avatar', read_only=True)

    class Meta:
        model = CourseReview
        fields = ['id', 'user_name', 'user_avatar', 'rating', 'review_text', 'created_at']

class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = ['id', 'user', 'course', 'progress', 'enrolled_at', 'completed_at', 'status']

class CourseProgressSerializer(serializers.Serializer):
    progress_percent = serializers.FloatField()
    completed_lessons = serializers.IntegerField()
    total_lessons = serializers.IntegerField()

class CourseProgressUpdateSerializer(serializers.Serializer):
    progress = serializers.FloatField(min_value=0, max_value=100)

class EnrollmentResponseSerializer(serializers.Serializer):
    enrollment_id = serializers.CharField()
    status = serializers.ChoiceField(choices=['enrolled', 'pending', 'failed'])
    message = serializers.CharField()
    course_id = serializers.CharField()
    course_title = serializers.CharField()
    attempt_number = serializers.IntegerField(required=False)
