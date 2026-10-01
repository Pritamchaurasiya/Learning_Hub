from django.db import transaction
from django.core.exceptions import ValidationError
from .models import (
    Ebook,
    EbookChapter,
    EbookHighlight,
    EbookBookmark,
    EbookReadingProgress,
)
from .validators import validate_hex_color, validate_highlight_text, validate_progress_percentage


class EbookService:
    @staticmethod
    @transaction.atomic
    def save_reading_progress(
        user,
        ebook: Ebook,
        chapter: EbookChapter,
        progress_percentage: float,
        time_spent_seconds: int = 0,
    ) -> EbookReadingProgress:
        """Upsert user's reading progress and award XP upon completion."""
        validate_progress_percentage(progress_percentage)
        is_completed = progress_percentage >= 100.0

        progress, created = EbookReadingProgress.objects.select_for_update().get_or_create(
            user=user,
            ebook=ebook,
            defaults={
                "current_chapter": chapter,
                "progress_percentage": progress_percentage,
                "time_spent_seconds": time_spent_seconds,
                "is_completed": is_completed,
            },
        )

        if not created:
            progress.current_chapter = chapter
            progress.progress_percentage = max(progress.progress_percentage, progress_percentage)
            progress.time_spent_seconds += time_spent_seconds
            if is_completed and not progress.is_completed:
                progress.is_completed = True
                # Trigger gamification completion event
                try:
                    from apps.gamification.services import GamificationService
                    GamificationService.award_xp(user, 75, reason=f"Completed Ebook: {ebook.title}")
                except Exception:
                    pass
            progress.save()

        return progress

    @staticmethod
    @transaction.atomic
    def create_highlight(
        user,
        ebook: Ebook,
        chapter: EbookChapter,
        text: str,
        color: str = "#ffeb3b",
        note: str = "",
    ) -> EbookHighlight:
        """Save a student's text highlight."""
        validate_highlight_text(text)
        validate_hex_color(color)

        return EbookHighlight.objects.create(
            user=user,
            ebook=ebook,
            chapter=chapter,
            text=text.strip(),
            color=color,
            note=note.strip(),
        )

    @staticmethod
    def delete_highlight(user, highlight_id: str) -> bool:
        """Delete a highlight ensuring ownership."""
        deleted_count, _ = EbookHighlight.objects.filter(id=highlight_id, user=user).delete()
        return deleted_count > 0

    @staticmethod
    @transaction.atomic
    def create_bookmark(
        user,
        ebook: Ebook,
        chapter: EbookChapter,
        position: int = 0,
        title: str = "",
    ) -> EbookBookmark:
        """Save a student's bookmark."""
        bookmark, _ = EbookBookmark.objects.update_or_create(
            user=user,
            ebook=ebook,
            chapter=chapter,
            position=position,
            defaults={"title": title.strip() or f"Chapter {chapter.order} Bookmark"},
        )
        return bookmark

    @staticmethod
    def delete_bookmark(user, bookmark_id: str) -> bool:
        """Delete a bookmark ensuring ownership."""
        deleted_count, _ = EbookBookmark.objects.filter(id=bookmark_id, user=user).delete()
        return deleted_count > 0
