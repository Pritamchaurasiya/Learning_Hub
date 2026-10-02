"""Ebook library administration with lightweight inlines and N+1 query elimination."""
from django.contrib import admin
from .models import (
    Ebook,
    EbookBookmark,
    EbookChapter,
    EbookFlashcard,
    EbookHighlight,
    EbookReadingProgress,
)


class EbookChapterInline(admin.TabularInline):
    model = EbookChapter
    extra = 0
    fields = ("order", "title", "estimated_read_time_mins")
    show_change_link = True
    ordering = ("order",)


class EbookFlashcardInline(admin.TabularInline):
    model = EbookFlashcard
    extra = 0
    fields = ("front", "back", "explanation")


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
    search_fields = ("title", "summary")
    list_select_related = ("ebook",)
    autocomplete_fields = ["ebook"]
    inlines = [EbookFlashcardInline]
    ordering = ("ebook", "order")


@admin.register(EbookHighlight)
class EbookHighlightAdmin(admin.ModelAdmin):
    list_display = ("user", "ebook", "chapter", "color", "created_at")
    list_filter = ("color", "created_at")
    search_fields = ("text", "note", "user__email", "ebook__title")
    list_select_related = ("user", "ebook", "chapter")
    autocomplete_fields = ["user", "ebook", "chapter"]


@admin.register(EbookBookmark)
class EbookBookmarkAdmin(admin.ModelAdmin):
    list_display = ("user", "ebook", "chapter", "position", "title")
    list_filter = ("ebook",)
    search_fields = ("title", "user__email", "ebook__title")
    list_select_related = ("user", "ebook", "chapter")
    autocomplete_fields = ["user", "ebook", "chapter"]


@admin.register(EbookReadingProgress)
class EbookReadingProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "ebook", "current_chapter", "progress_percentage", "is_completed", "last_read_at")
    list_filter = ("is_completed",)
    search_fields = ("user__email", "ebook__title")
    list_select_related = ("user", "ebook", "current_chapter")
    autocomplete_fields = ["user", "ebook", "current_chapter"]


@admin.register(EbookFlashcard)
class EbookFlashcardAdmin(admin.ModelAdmin):
    list_display = ("front", "ebook", "chapter")
    search_fields = ("front", "back", "ebook__title")
    list_select_related = ("ebook", "chapter")
    autocomplete_fields = ["ebook", "chapter"]
