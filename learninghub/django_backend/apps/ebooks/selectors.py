from typing import Optional, List
from django.db.models import QuerySet, Q
from django.core.cache import cache
from .models import (
    Ebook,
    EbookChapter,
    EbookHighlight,
    EbookBookmark,
    EbookReadingProgress,
    EbookFlashcard,
)


def list_published_ebooks(category: Optional[str] = None, search: Optional[str] = None) -> QuerySet[Ebook]:
    """Retrieve all published ebooks with optional category and search filters."""
    qs = Ebook.objects.filter(is_published=True)
    if category and category.lower() != "all":
        qs = qs.filter(category__iexact=category)
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search) | Q(author__icontains=search))
    return qs.prefetch_related("chapters")


def get_ebook_by_id_or_slug(identifier: str) -> Optional[Ebook]:
    """Retrieve a single ebook by its ID or unique slug."""
    return (
        Ebook.objects.filter(Q(id=identifier) | Q(slug=identifier), is_published=True)
        .prefetch_related("chapters")
        .first()
    )


def get_chapter_by_order(ebook_id_or_slug: str, order: int) -> Optional[EbookChapter]:
    """Retrieve a specific chapter by its numerical order."""
    return EbookChapter.objects.filter(
        Q(ebook__id=ebook_id_or_slug) | Q(ebook__slug=ebook_id_or_slug),
        order=order,
        ebook__is_published=True,
    ).first()


def list_user_highlights(user, ebook_id: str) -> QuerySet[EbookHighlight]:
    """List all highlights for an authenticated user on a specific ebook."""
    return EbookHighlight.objects.filter(user=user, ebook__id=ebook_id).select_related("chapter")


def list_user_bookmarks(user, ebook_id: str) -> QuerySet[EbookBookmark]:
    """List all bookmarks for an authenticated user on a specific ebook."""
    return EbookBookmark.objects.filter(user=user, ebook__id=ebook_id).select_related("chapter")


def get_user_reading_progress(user, ebook_id: str) -> Optional[EbookReadingProgress]:
    """Get the current reading progress record for a user."""
    return EbookReadingProgress.objects.filter(user=user, ebook__id=ebook_id).select_related("current_chapter").first()


def list_chapter_flashcards(chapter_id: str) -> QuerySet[EbookFlashcard]:
    """List flashcards created for a chapter."""
    return EbookFlashcard.objects.filter(chapter__id=chapter_id)
