import pytest
from apps.courses.models import Category, Course
from apps.users.models import User


@pytest.mark.django_db
class TestCourseModels:

    @pytest.fixture
    def instructor(self):
        return User.objects.create_user(
            email="inst@test.com", username="inst", password="password"
        )

    def test_create_category(self):
        cat = Category.objects.create(name="Development")
        assert cat.slug == "development"  # Check autocreation
        assert str(cat) == "Development"

    def test_create_course(self, instructor):
        course = Course.objects.create(
            title="Intro to Python", description="Learn Python", instructor=instructor
        )
        assert course.slug == "intro-to-python"
        assert course.instructor == instructor
