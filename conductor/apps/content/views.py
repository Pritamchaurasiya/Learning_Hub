"""Content views."""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Lesson, Quiz
from .serializers import (
    LessonSerializer,
    LessonProgressSerializer,
    LessonProgressUpdateSerializer,
    QuizSerializer,
    QuizAttemptSerializer,
    QuizSubmissionSerializer,
)


from .services import ContentService


@extend_schema_view(
    list=extend_schema(responses={200: LessonSerializer(many=True)}),
    retrieve=extend_schema(responses={200: LessonSerializer}),
    progress=extend_schema(responses={200: LessonProgressSerializer}),
    quiz=extend_schema(responses={200: QuizSerializer}),
    submit_quiz=extend_schema(responses={200: QuizAttemptSerializer}),
)
class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """Lesson endpoints."""

    queryset = Lesson.objects.filter(is_published=True)
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "progress":
            return LessonProgressUpdateSerializer
        if self.action == "quiz":
            return QuizSerializer
        if self.action == "submit_quiz":
            return QuizSubmissionSerializer
        return LessonSerializer

    @action(detail=True, methods=["post"])
    def progress(self, request, pk=None):
        """Update lesson progress."""
        lesson = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        progress = ContentService.update_lesson_progress(
            request.user, lesson, serializer.validated_data
        )

        return Response(
            {"status": "success", "data": LessonProgressSerializer(progress).data}
        )

    @action(detail=True, methods=["get"])
    def quiz(self, request, pk=None):
        """Get quiz for lesson."""
        lesson = self.get_object()
        try:
            quiz = lesson.quiz
            return Response({"status": "success", "data": QuizSerializer(quiz).data})
        except Quiz.DoesNotExist:
            return Response(
                {"status": "error", "message": "No quiz for this lesson"}, status=404
            )

    @action(detail=True, methods=["post"], url_path="quiz/submit")
    def submit_quiz(self, request, pk=None):
        """Submit quiz answers."""
        lesson = self.get_object()
        try:
            quiz = lesson.quiz
        except Quiz.DoesNotExist:
            return Response({"status": "error", "message": "No quiz"}, status=404)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        attempt = ContentService.submit_quiz(
            request.user,
            quiz,
            serializer.validated_data.get("answers", {}),
            serializer.validated_data.get("time_taken", 0),
        )

        return Response(
            {"status": "success", "data": QuizAttemptSerializer(attempt).data}
        )
