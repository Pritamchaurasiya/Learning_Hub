from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated

"""
Quiz API views for Learning Hub.
"""

import uuid
from django.db import models
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from apps.courses.models import Enrollment

from .models import Quiz, Question, Option, QuizAttempt, QuizAnswer
from .serializers import (
    QuizListSerializer,
    QuizDetailSerializer,
    QuizAttemptSerializer,
    QuizAttemptDetailSerializer,
    StartQuizAttemptSerializer,
    SubmitAnswerSerializer,
    SubmitQuizSerializer,
    QuizResultSerializer,
)


@extend_schema_view(
    list=extend_schema(description="List all published quizzes"),
    retrieve=extend_schema(description="Get quiz details"),
)
@extend_schema(tags=["Quizzes"])
class QuizViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Quiz endpoints for learners.

    GET /api/v1/quizzes/ - List quizzes
    GET /api/v1/quizzes/{id}/ - Quiz detail
    """

    queryset = Quiz.objects.filter(is_published=True).select_related("course")
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return QuizDetailSerializer
        return QuizListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by course if provided
        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        return queryset

    @extend_schema(
        description="Get quizzes for a specific course",
        responses={200: QuizListSerializer(many=True)},
    )
    @action(detail=False, methods=["get"])
    def by_course(self, request):
        """Get quizzes for a specific course."""
        course_id = request.query_params.get("course_id")
        if not course_id:
            return Response(
                {"status": "error", "message": "course_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate UUID format
        try:
            uuid.UUID(course_id)
        except ValueError:
            return Response(
                {"status": "error", "message": "Invalid course_id format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.db.models import Count, Sum

        quizzes = (
            Quiz.objects.filter(course_id=course_id, is_published=True)
            .select_related("course")
            .annotate(
                question_count=Count("questions"),
                total_marks_sum=Sum("questions__marks"),
            )
        )

        serializer = QuizListSerializer(quizzes, many=True)
        return Response({"status": "success", "data": serializer.data})


@extend_schema_view(
    list=extend_schema(description="List user quiz attempts"),
    retrieve=extend_schema(description="Get attempt details"),
)
@extend_schema(tags=["Quiz Attempts"])
class QuizAttemptViewSet(viewsets.ModelViewSet):
    """
    Quiz attempt endpoints.

    GET /api/v1/quiz-attempts/ - List attempts
    POST /api/v1/quiz-attempts/start/ - Start new attempt
    POST /api/v1/quiz-attempts/{id}/submit/ - Submit answers
    GET /api/v1/quiz-attempts/{id}/result/ - Get results
    """

    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return (
            QuizAttempt.objects.filter(user=self.request.user)
            .select_related("quiz", "quiz__course")
            .prefetch_related("answers")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return QuizAttemptDetailSerializer
        return QuizAttemptSerializer

    @extend_schema(
        description="Start a new quiz attempt",
        request=StartQuizAttemptSerializer,
        responses={201: QuizAttemptSerializer},
    )
    @action(detail=False, methods=["post"])
    def start(self, request):
        """Start a new quiz attempt."""
        serializer = StartQuizAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quiz_id = serializer.validated_data["quiz_id"]

        try:
            quiz = Quiz.objects.get(id=quiz_id, is_published=True)
        except Quiz.DoesNotExist:
            return Response(
                {"status": "error", "message": "Quiz not found or not published"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if user is enrolled in the course
        if not Enrollment.objects.filter(
            user=request.user, course=quiz.course
        ).exists():
            return Response(
                {
                    "status": "error",
                    "message": "You must be enrolled in this course to take the quiz",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check max attempts
        attempt_count = QuizAttempt.objects.filter(
            user=request.user, quiz=quiz, status__in=["completed", "abandoned"]
        ).count()

        if attempt_count >= quiz.max_attempts:
            return Response(
                {
                    "status": "error",
                    "message": f"Maximum attempts ({quiz.max_attempts}) reached for this quiz",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if there's an in-progress attempt
        existing_attempt = QuizAttempt.objects.filter(
            user=request.user, quiz=quiz, status="in_progress"
        ).first()

        if existing_attempt:
            # Resume existing attempt
            return Response(
                {
                    "status": "success",
                    "message": "Resuming existing attempt",
                    "data": QuizAttemptSerializer(existing_attempt).data,
                }
            )

        # Create new attempt
        attempt = QuizAttempt.objects.create(
            user=request.user,
            quiz=quiz,
            attempt_number=attempt_count + 1,
            max_score=quiz.total_marks,
        )

        return Response(
            {
                "status": "success",
                "message": "Quiz attempt started",
                "data": QuizAttemptSerializer(attempt).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        description="Submit an answer for a question",
        request=SubmitAnswerSerializer,
        responses={200: QuizAttemptSerializer},
    )
    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        """Submit an answer for a specific question."""
        attempt = self.get_object()

        if attempt.status != "in_progress":
            return Response(
                {"status": "error", "message": "Quiz attempt is not in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SubmitAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question_id = serializer.validated_data["question_id"]
        option_id = serializer.validated_data.get("option_id")
        text_answer = serializer.validated_data.get("text_answer", "")

        try:
            question = Question.objects.get(id=question_id, quiz=attempt.quiz)
        except Question.DoesNotExist:
            return Response(
                {"status": "error", "message": "Question not found in this quiz"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if already answered
        existing_answer = QuizAnswer.objects.filter(
            attempt=attempt, question=question
        ).first()

        is_correct = False
        marks_obtained = 0

        if question.question_type == "mcq":
            if option_id:
                try:
                    selected_option = Option.objects.get(
                        id=option_id, question=question
                    )
                    is_correct = selected_option.is_correct
                    marks_obtained = question.marks if is_correct else 0
                except Option.DoesNotExist:
                    return Response(
                        {"status": "error", "message": "Invalid option selected"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        elif question.question_type == "true_false":
            # For true/false, compare text_answer with correct answer
            correct_option = question.options.filter(is_correct=True).first()
            if correct_option:
                is_correct = text_answer.lower() == correct_option.text.lower()
                marks_obtained = question.marks if is_correct else 0

        if existing_answer:
            # Update existing answer
            existing_answer.selected_option_id = option_id
            existing_answer.text_answer = text_answer
            existing_answer.is_correct = is_correct
            existing_answer.marks_obtained = marks_obtained
            existing_answer.save()
        else:
            # Create new answer
            QuizAnswer.objects.create(
                attempt=attempt,
                question=question,
                selected_option_id=option_id,
                text_answer=text_answer,
                is_correct=is_correct,
                marks_obtained=marks_obtained,
            )

        return Response(
            {
                "status": "success",
                "message": "Answer submitted",
                "data": QuizAttemptSerializer(attempt).data,
            }
        )

    @extend_schema(
        description="Submit the complete quiz",
        request=SubmitQuizSerializer,
        responses={200: QuizAttemptDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit the complete quiz attempt."""
        attempt = self.get_object()

        if attempt.status != "in_progress":
            return Response(
                {"status": "error", "message": "Quiz attempt is not in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate time taken
        time_taken = int((timezone.now() - attempt.started_at).total_seconds())

        # Calculate total score using aggregation to avoid N+1
        from django.db.models import Sum

        total_marks = attempt.quiz.total_marks
        result = attempt.answers.aggregate(total=Sum("marks_obtained"))
        obtained_marks = result["total"] or 0

        percentage = (obtained_marks / total_marks * 100) if total_marks > 0 else 0

        # Update attempt
        attempt.status = "completed"
        attempt.completed_at = timezone.now()
        attempt.time_taken_seconds = time_taken
        attempt.score = obtained_marks
        attempt.max_score = total_marks
        attempt.percentage_score = round(percentage, 2)
        attempt.save()

        return Response(
            {
                "status": "success",
                "message": "Quiz submitted successfully",
                "data": QuizAttemptDetailSerializer(attempt).data,
            }
        )

    @extend_schema(
        description="Get quiz results", responses={200: QuizResultSerializer}
    )
    @action(detail=True, methods=["get"])
    def result(self, request, pk=None):
        """Get quiz results."""
        attempt = self.get_object()

        if attempt.status != "completed":
            return Response(
                {"status": "error", "message": "Quiz not completed yet"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate statistics using aggregation to avoid N+1
        from django.db.models import Count, Q

        total_questions = attempt.quiz.total_questions
        answer_stats = attempt.answers.aggregate(
            correct_count=Count("id", filter=Q(is_correct=True)),
            total_count=Count("id"),
        )
        correct_answers = answer_stats["correct_count"] or 0
        # Calculate incorrect based on answered questions, not total questions
        answered_count = answer_stats["total_count"] or 0
        incorrect_answers = answered_count - correct_answers

        result_data = {
            "attempt_id": attempt.id,
            "quiz_title": attempt.quiz.title,
            "score": attempt.score,
            "max_score": attempt.max_score,
            "percentage_score": attempt.percentage_score,
            "is_passed": attempt.is_passed,
            "time_taken_seconds": attempt.time_taken_seconds,
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "incorrect_answers": incorrect_answers,
        }

        return Response(
            {
                "status": "success",
                "message": "Quiz results retrieved",
                "data": result_data,
            }
        )


@extend_schema(tags=["Quiz Results"])
class QuizResultViewSet(viewsets.ViewSet):
    """
    Quiz results endpoints.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(description="Get user quiz statistics", responses={200: dict})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get user's quiz statistics."""
        attempts = QuizAttempt.objects.filter(user=request.user, status="completed")

        total_attempts = attempts.count()
        passed_quizzes = attempts.filter(
            percentage_score__gte=models.F("quiz__passing_score")
        ).count()
        avg_score = attempts.aggregate(avg=models.Avg("percentage_score"))["avg"] or 0

        return Response(
            {
                "status": "success",
                "data": {
                    "total_attempts": total_attempts,
                    "passed_quizzes": passed_quizzes,
                    "average_score": round(avg_score, 2),
                    "pass_rate": (
                        round((passed_quizzes / total_attempts * 100), 2)
                        if total_attempts > 0
                        else 0
                    ),
                },
            }
        )
