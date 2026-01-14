"""
Course serializers for Learning Hub API.
"""

from rest_framework import serializers

from apps.users.serializers import UserListSerializer

from .models import Category, Course, Enrollment, Review


from drf_spectacular.utils import extend_schema_field


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for course categories."""

    subcategories = serializers.SerializerMethodField()
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "parent",
            "subcategories",
            "course_count",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_subcategories(self, obj):
        """Get nested subcategories."""
        if hasattr(obj, "active_subcategories"):
            subs = obj.active_subcategories
        else:
            subs = obj.subcategories.filter(is_active=True)
        return CategorySerializer(subs, many=True).data

    @extend_schema_field(serializers.IntegerField())
    def get_course_count(self, obj):
        """Get count of published courses."""
        if hasattr(obj, "published_course_count"):
            return obj.published_course_count
        return obj.courses.filter(is_published=True).count()


class CourseListSerializer(serializers.ModelSerializer):
    """Serializer for course listings (minimal data)."""

    instructor = UserListSerializer(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "slug",
            "short_description",
            "thumbnail",
            "instructor",
            "category_name",
            "price",
            "is_free",
            "difficulty",
            "duration_hours",
            "lessons_count",
            "enrollment_count",
            "avg_rating",
            "review_count",
            "is_featured",
        ]


class CourseDetailSerializer(serializers.ModelSerializer):
    """Serializer for course detail view."""

    instructor = UserListSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "short_description",
            "thumbnail",
            "preview_video",
            "instructor",
            "category",
            "price",
            "is_free",
            "difficulty",
            "duration_hours",
            "lessons_count",
            "enrollment_count",
            "avg_rating",
            "review_count",
            "requirements",
            "learning_objectives",
            "is_published",
            "is_featured",
            "is_enrolled",
            "user_progress",
            "created_at",
            "published_at",
        ]

    @extend_schema_field(serializers.BooleanField())
    def get_is_enrolled(self, obj):
        """Check if current user is enrolled."""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Enrollment.objects.filter(user=request.user, course=obj).exists()
        return False

    @extend_schema_field(serializers.FloatField(allow_null=True))
    def get_user_progress(self, obj):
        """Get current user's progress."""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            try:
                enrollment = Enrollment.objects.get(user=request.user, course=obj)
                return enrollment.progress_percentage
            except Enrollment.DoesNotExist:
                pass
        return None


class EnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for enrollment."""

    course = CourseListSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "course",
            "progress_percentage",
            "completed_at",
            "last_accessed_at",
            "created_at",
        ]


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for course reviews."""

    user = UserListSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "rating", "title", "content", "created_at"]
        read_only_fields = ["id", "user", "created_at"]

    def validate_rating(self, value):
        """Validate rating is between 1 and 5."""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class CreateReviewSerializer(serializers.ModelSerializer):
    """Serializer for creating a review."""

    class Meta:
        model = Review
        fields = ["rating", "title", "content"]

    def validate_rating(self, value):
        """Validate rating is between 1 and 5."""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
