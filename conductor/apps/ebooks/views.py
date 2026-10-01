from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from apps.core.responses import success_response, error_response
from .serializers import (
    EbookListSerializer,
    EbookDetailSerializer,
    EbookChapterDetailSerializer,
    EbookHighlightSerializer,
    EbookBookmarkSerializer,
    EbookProgressSerializer,
    EbookFlashcardSerializer,
)
from .selectors import (
    list_published_ebooks,
    get_ebook_by_id_or_slug,
    get_chapter_by_order,
    list_user_highlights,
    list_user_bookmarks,
    get_user_reading_progress,
    list_chapter_flashcards,
)
from .services import EbookService


class EbookListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        category = request.query_params.get("category")
        search = request.query_params.get("search") or request.query_params.get("q")
        ebooks = list_published_ebooks(category=category, search=search)
        serializer = EbookListSerializer(ebooks, many=True)
        return success_response(data=serializer.data, meta={"count": len(serializer.data)})


class EbookDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug_or_id):
        ebook = get_ebook_by_id_or_slug(slug_or_id)
        if not ebook:
            return error_response("Ebook not found", status_code=status.HTTP_404_NOT_FOUND)
        serializer = EbookDetailSerializer(ebook, context={"request": request})
        return success_response(data=serializer.data)


class EbookChapterDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug_or_id, order):
        chapter = get_chapter_by_order(slug_or_id, int(order))
        if not chapter:
            return error_response("Chapter not found", status_code=status.HTTP_404_NOT_FOUND)
        serializer = EbookChapterDetailSerializer(chapter)
        return success_response(data=serializer.data)


class EbookProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, ebook_id):
        progress = get_user_reading_progress(request.user, ebook_id)
        if not progress:
            return success_response(data={"progress_percentage": 0.0, "is_completed": False})
        return success_response(data=EbookProgressSerializer(progress).data)

    def post(self, request, ebook_id):
        ebook = get_ebook_by_id_or_slug(ebook_id)
        if not ebook:
            return error_response("Ebook not found", status_code=status.HTTP_404_NOT_FOUND)

        chapter_order = request.data.get("chapter_order", 1)
        chapter = get_chapter_by_order(ebook.id, int(chapter_order))
        if not chapter:
            chapter = ebook.chapters.first()

        progress_pct = float(request.data.get("progress_percentage", 0.0))
        time_spent = int(request.data.get("time_spent_seconds", 0))

        progress = EbookService.save_reading_progress(
            user=request.user,
            ebook=ebook,
            chapter=chapter,
            progress_percentage=progress_pct,
            time_spent_seconds=time_spent,
        )
        return success_response(
            data=EbookProgressSerializer(progress).data,
            message="Reading progress updated successfully",
        )


class EbookHighlightView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, ebook_id):
        highlights = list_user_highlights(request.user, ebook_id)
        serializer = EbookHighlightSerializer(highlights, many=True)
        return success_response(data=serializer.data)

    def post(self, request, ebook_id):
        ebook = get_ebook_by_id_or_slug(ebook_id)
        if not ebook:
            return error_response("Ebook not found", status_code=status.HTTP_404_NOT_FOUND)

        chapter_id = request.data.get("chapter") or request.data.get("chapter_id")
        chapter = ebook.chapters.filter(id=chapter_id).first() if chapter_id else ebook.chapters.first()
        if not chapter:
            return error_response("Invalid chapter specified", status_code=status.HTTP_400_BAD_REQUEST)

        text = request.data.get("text", "")
        color = request.data.get("color", "#ffeb3b")
        note = request.data.get("note", "")

        highlight = EbookService.create_highlight(
            user=request.user,
            ebook=ebook,
            chapter=chapter,
            text=text,
            color=color,
            note=note,
        )
        return success_response(
            data=EbookHighlightSerializer(highlight).data,
            message="Highlight created successfully",
            status_code=status.HTTP_201_CREATED,
        )

    def delete(self, request, ebook_id, highlight_id=None):
        hl_id = highlight_id or request.query_params.get("id") or request.data.get("id")
        if not hl_id:
            return error_response("Highlight ID required", status_code=status.HTTP_400_BAD_REQUEST)

        success = EbookService.delete_highlight(request.user, hl_id)
        if not success:
            return error_response("Highlight not found or access denied", status_code=status.HTTP_404_NOT_FOUND)
        return success_response(message="Highlight deleted successfully")


class EbookBookmarkView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, ebook_id):
        bookmarks = list_user_bookmarks(request.user, ebook_id)
        return success_response(data=EbookBookmarkSerializer(bookmarks, many=True).data)

    def post(self, request, ebook_id):
        ebook = get_ebook_by_id_or_slug(ebook_id)
        if not ebook:
            return error_response("Ebook not found", status_code=status.HTTP_404_NOT_FOUND)

        chapter_id = request.data.get("chapter") or request.data.get("chapter_id")
        chapter = ebook.chapters.filter(id=chapter_id).first() if chapter_id else ebook.chapters.first()
        if not chapter:
            return error_response("Chapter not found", status_code=status.HTTP_400_BAD_REQUEST)

        position = int(request.data.get("position", 0))
        title = request.data.get("title", "")

        bookmark = EbookService.create_bookmark(
            user=request.user,
            ebook=ebook,
            chapter=chapter,
            position=position,
            title=title,
        )
        return success_response(
            data=EbookBookmarkSerializer(bookmark).data,
            message="Bookmark saved successfully",
            status_code=status.HTTP_201_CREATED,
        )

    def delete(self, request, ebook_id, bookmark_id=None):
        bm_id = bookmark_id or request.query_params.get("id") or request.data.get("id")
        if not bm_id:
            return error_response("Bookmark ID required", status_code=status.HTTP_400_BAD_REQUEST)

        success = EbookService.delete_bookmark(request.user, bm_id)
        if not success:
            return error_response("Bookmark not found", status_code=status.HTTP_404_NOT_FOUND)
        return success_response(message="Bookmark removed successfully")


class EbookChapterFlashcardsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, chapter_id):
        flashcards = list_chapter_flashcards(chapter_id)
        return success_response(data=EbookFlashcardSerializer(flashcards, many=True).data)
