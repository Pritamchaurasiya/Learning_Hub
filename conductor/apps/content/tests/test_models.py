import pytest
from apps.content.models import Lesson, Quiz
from apps.courses.models import Course, Category
from apps.users.models import User


@pytest.mark.django_db
class TestContentModels:

    @pytest.fixture
    def course(self):
        user = User.objects.create_user(
            email="inst@test.com", username="inst", password="pass"
        )
        cat = Category.objects.create(name="Dev")
        return Course.objects.create(title="Python 101", instructor=user, category=cat)

    def test_create_lesson(self, course):
        lesson = Lesson.objects.create(
            course=course, title="Intro", content_type=Lesson.ContentType.VIDEO, order=1
        )
        assert str(lesson) == "Python 101 - Intro"
        assert lesson.is_published

    def test_create_quiz(self, course):
        lesson = Lesson.objects.create(
            course=course,
            title="Quiz Lesson",
            content_type=Lesson.ContentType.QUIZ,
            order=2,
        )
        quiz = Quiz.objects.create(lesson=lesson, title="Unit Test Quiz")
        assert quiz.passing_score == 70
        assert str(quiz) == "Unit Test Quiz"
