from django.urls import path
from .views import (
    EbookListView,
    EbookDetailView,
    EbookChapterDetailView,
    EbookProgressView,
    EbookHighlightView,
    EbookBookmarkView,
    EbookChapterFlashcardsView,
)

urlpatterns = [
    path("", EbookListView.as_view(), name="ebook-list"),
    path("<str:slug_or_id>/", EbookDetailView.as_view(), name="ebook-detail"),
    path("<str:slug_or_id>/chapters/<int:order>/", EbookChapterDetailView.as_view(), name="chapter-detail"),
    path("<str:ebook_id>/progress/", EbookProgressView.as_view(), name="ebook-progress"),
    path("<str:ebook_id>/highlights/", EbookHighlightView.as_view(), name="ebook-highlights"),
    path("<str:ebook_id>/highlights/<str:highlight_id>/", EbookHighlightView.as_view(), name="ebook-highlight-delete"),
    path("<str:ebook_id>/bookmarks/", EbookBookmarkView.as_view(), name="ebook-bookmarks"),
    path("<str:ebook_id>/bookmarks/<str:bookmark_id>/", EbookBookmarkView.as_view(), name="ebook-bookmark-delete"),
    path("chapters/<str:chapter_id>/flashcards/", EbookChapterFlashcardsView.as_view(), name="chapter-flashcards"),
]
