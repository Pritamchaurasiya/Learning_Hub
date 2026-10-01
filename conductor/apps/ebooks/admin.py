from django.contrib import admin
from .models import (
    Ebook,
    EbookChapter,
    EbookHighlight,
    EbookBookmark,
    EbookReadingProgress,
    EbookFlashcard,
)


class EbookChapterInline(admin.StackedInline):
    model = EbookChapter
    extra = 1
    fields = ("order", "title", "estimated_read_time_mins", "summary", "content_markdown")


class EbookFlashcardInline(admin.TabularInline):
    model = EbookFlashcard
    extra = 1


@admin.register(Ebook)
class EbookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "category", "difficulty", "total_chapters", "rating", "is_published")
    list_filter = ("category", "difficulty", "is_published")
    search_fields = ("title", "author", "description", "tags")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [EbookChapterInline]


@admin.register(EbookChapter)
class EbookChapterAdmin(admin.ModelAdmin):
    list_display = ("title", "ebook", "order", "estimated_read_time_mins")
    list_filter = ("ebook",)
    search_fields = ("title", "summary", "content_markdown")
    inlines = [EbookFlashcardInline]


@admin.register(EbookHighlight)
class EbookHighlightAdmin(admin.ModelAdmin):
    list_display = ("user", "ebook", "chapter", "color", "created_at")
    list_filter = ("ebook", "color")
    search_fields = ("text", "note")


@admin.register(EbookBookmark)
class EbookBookmarkAdmin(admin.ModelAdmin):
    list_display = ("user", "ebook", "chapter", "position", "title")
    list_filter = ("ebook",)


@admin.register(EbookReadingProgress)
class EbookReadingProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "ebook", "current_chapter", "progress_percentage", "is_completed", "last_read_at")
    list_filter = ("is_completed", "ebook")


@admin.register(EbookFlashcard)
class EbookFlashcardAdmin(admin.ModelAdmin):
    list_display = ("front", "ebook", "chapter")
    search_fields = ("front", "back", "explanation")
