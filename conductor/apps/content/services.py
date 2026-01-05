from django.utils import timezone
from typing import Dict, Any, cast


from core.signals import lesson_completed, quiz_passed, quiz_failed
from .models import Lesson, LessonProgress, QuizAttempt


class ContentService:
    """Service layer for Content related operations."""

    @staticmethod
    def update_lesson_progress(user, lesson, data: Dict[str, Any]) -> "LessonProgress":
        """
        Update or create lesson progress.
        """
        progress, _ = cast(
            tuple[LessonProgress, bool],
            LessonProgress.objects.get_or_create(user=user, lesson=lesson),
        )

        watch_time = data.get("watch_time", 0)
        last_position = data.get("last_position", 0)

        progress.watch_time = max(progress.watch_time, watch_time)
        progress.last_position = last_position

        was_completed = progress.is_completed

        # Auto-complete logic
        if lesson.content_type == "video" and lesson.video_duration > 0:
            if progress.watch_time >= (lesson.video_duration * 0.9):
                progress.is_completed = True
                progress.completed_at = timezone.now()

        # Manual completion
        if data.get("completed"):
            progress.is_completed = True
            progress.completed_at = timezone.now()

        progress.save()

        # Trigger signal if just completed
        if progress.is_completed and not was_completed:
            lesson_completed.send(
                sender=Lesson, user=user, lesson=lesson, progress=progress
            )

        return progress

    @staticmethod
    def submit_quiz(
        user, quiz, answers: Dict[str, Any], time_taken: int = 0
    ) -> "QuizAttempt":
        """
        Submit quiz answers and calculate score.
        """
        score = 0
        total = 0

        for question in quiz.questions.all():
            total += question.points
            # Convert question ID to string for lookup as JSON keys are strings
            user_answer = answers.get(str(question.id))
            if user_answer == question.correct_answer:
                score += question.points

        passed = (score / total * 100) >= quiz.passing_score if total > 0 else False

        attempt = QuizAttempt.objects.create(
            user=user,
            quiz=quiz,
            score=score,
            total_points=total,
            passed=passed,
            answers=answers,
            time_taken=time_taken,
        )

        # Trigger signals
        if passed:
            quiz_passed.send(
                sender=quiz.__class__, user=user, quiz=quiz, attempt=attempt
            )
        else:
            quiz_failed.send(
                sender=quiz.__class__, user=user, quiz=quiz, attempt=attempt
            )

        return cast(QuizAttempt, attempt)
