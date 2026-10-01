from rest_framework import serializers
from .models import (
    Ebook,
    EbookChapter,
    EbookHighlight,
    EbookBookmark,
    EbookReadingProgress,
    EbookFlashcard,
)


class EbookChapterListSerializer(serializers.ModelSerializer):
    class Meta:
        model = EbookChapter
        fields = [
            "id",
            "title",
            "order",
            "estimated_read_time_mins",
            "summary",
        ]


class EbookChapterDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = EbookChapter
        fields = [
            "id",
            "title",
            "order",
            "estimated_read_time_mins",
            "summary",
            "key_takeaways",
            "glossary",
            "content_markdown",
            "created_at",
        ]


class EbookListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ebook
        fields = [
            "id",
            "title",
            "slug",
            "author",
            "cover_url",
            "description",
            "category",
            "difficulty",
            "total_chapters",
            "estimated_reading_time_mins",
            "rating",
            "review_count",
            "file_size_bytes",
            "tags",
            "published_at",
        ]


class EbookDetailSerializer(serializers.ModelSerializer):
    chapters = EbookChapterListSerializer(many=True, read_only=True)
    user_progress = serializers.SerializerMethodField()

    class Meta:
        model = Ebook
        fields = [
            "id",
            "title",
            "slug",
            "author",
            "cover_url",
            "description",
            "category",
            "difficulty",
            "total_chapters",
            "estimated_reading_time_mins",
            "rating",
            "review_count",
            "file_size_bytes",
            "tags",
            "published_at",
            "chapters",
            "user_progress",
        ]

    def get_user_progress(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            prog = EbookReadingProgress.objects.filter(user=request.user, ebook=obj).first()
            if prog:
                return {
                    "progress_percentage": prog.progress_percentage,
                    "current_chapter_id": prog.current_chapter_id,
                    "is_completed": prog.is_completed,
                    "last_read_at": prog.last_read_at,
                }
        return None


class EbookHighlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = EbookHighlight
        fields = [
            "id",
            "ebook",
            "chapter",
            "text",
            "color",
            "note",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EbookBookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = EbookBookmark
        fields = [
            "id",
            "ebook",
            "chapter",
            "position",
            "title",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EbookProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = EbookReadingProgress
        fields = [
            "ebook",
            "current_chapter",
            "progress_percentage",
            "time_spent_seconds",
            "is_completed",
            "last_read_at",
        ]


class EbookFlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = EbookFlashcard
        fields = [
            "id",
            "chapter",
            "front",
            "back",
            "explanation",
        ]
