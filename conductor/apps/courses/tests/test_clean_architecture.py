"""
Tests for Courses Clean Architecture: Selectors, Validators, Permissions, and Services.
"""

from decimal import Decimal
import pytest
from rest_framework.exceptions import ValidationError
from apps.users.models import User
from apps.courses.models import (
    Category, Course, Module, Lesson, Enrollment, Review,
    Certificate, CourseNote, CourseResource, CareerTrack, TrackCourse
)
from apps.courses import selectors, validators, permissions
from apps.courses.services import LessonService, NoteService, ResourceService


@pytest.fixture
def instructor(db):
    return User.objects.create_user(
        username="course_instructor",
        email="instructor@learninghub.com",
        password="TestPassword123!",
        role="instructor"
    )


@pytest.fixture
def student(db):
    return User.objects.create_user(
        username="course_student",
        email="student@learninghub.com",
        password="TestPassword123!",
        role="student"
    )


@pytest.fixture
def other_student(db):
    return User.objects.create_user(
        username="other_student",
        email="other@learninghub.com",
        password="TestPassword123!",
        role="student"
    )


@pytest.fixture
def category(db):
    cat = Category.objects.create(
        name="Computer Science",
        slug="computer-science",
        description="Core CS concepts"
    )
    cat.refresh_from_db()
    return cat


@pytest.fixture
def sample_course(db, instructor, category):
    course = Course.objects.create(
        title="Algorithms 101",
        slug="algorithms-101",
        description="Introduction to algorithms and data structures.",
        short_description="Intro to algorithms",
        instructor=instructor,
        category=category,
        price=Decimal("0.00"),
        is_free=True,
        is_published=True,
        is_featured=True,
    )
    course.refresh_from_db()
    return course


@pytest.fixture
def sample_module(db, sample_course):
    mod = Module.objects.create(
        course=sample_course,
        title="Module 1: Basics",
        order=1
    )
    mod.refresh_from_db()
    return mod


@pytest.fixture
def sample_lesson(db, sample_module):
    les = Lesson.objects.create(
        module=sample_module,
        title="Lesson 1: Sorting",
        slug="lesson-1-sorting",
        order=1,
        duration_minutes=30
    )
    les.refresh_from_db()
    return les


# ==============================================================================
# 1. SELECTOR TESTS
# ==============================================================================

@pytest.mark.django_db
class TestCourseSelectors:
    def test_get_course_by_id(self, sample_course):
        course = selectors.get_course_by_id(str(sample_course.id))
        assert course is not None
        assert str(course.id) == str(sample_course.id)

    def test_get_course_by_slug(self, sample_course):
        course = selectors.get_course_by_slug("algorithms-101")
        assert course is not None
        assert course.slug == "algorithms-101"

    def test_list_published_courses(self, sample_course):
        courses = selectors.list_published_courses()
        assert any(str(c.id) == str(sample_course.id) for c in courses)

    def test_list_featured_and_trending_courses(self, sample_course):
        featured = selectors.list_featured_courses()
        assert any(str(c.id) == str(sample_course.id) for c in featured)

        trending = selectors.list_trending_courses()
        assert any(str(c.id) == str(sample_course.id) for c in trending)

    def test_enrollment_selectors(self, student, sample_course):
        assert selectors.is_user_enrolled(student, sample_course) is False
        assert selectors.get_user_enrollment(student, sample_course) is None

        enrollment = Enrollment.objects.create(user=student, course=sample_course)
        enrollment.refresh_from_db()
        assert selectors.is_user_enrolled(student, sample_course) is True
        fetched_enrollment = selectors.get_user_enrollment(student, sample_course)
        assert fetched_enrollment is not None
        assert str(fetched_enrollment.id) == str(enrollment.id)

        user_enrollments = selectors.list_user_enrollments(student)
        assert any(str(e.id) == str(enrollment.id) for e in user_enrollments)

    def test_lesson_selectors(self, sample_course, sample_lesson):
        lesson_by_id = selectors.get_lesson_by_id(str(sample_lesson.id))
        assert lesson_by_id is not None
        assert str(lesson_by_id.id) == str(sample_lesson.id)

        lesson_by_slug = selectors.get_lesson_by_slug("algorithms-101", "lesson-1-sorting")
        assert lesson_by_slug is not None
        assert str(lesson_by_slug.id) == str(sample_lesson.id)

    def test_category_selectors(self, category):
        cats = selectors.list_categories()
        assert any(str(c.id) == str(category.id) for c in cats)
        cat = selectors.get_category_by_slug("computer-science")
        assert cat is not None
        assert str(cat.id) == str(category.id)

    def test_career_track_selectors(self, sample_course):
        track = CareerTrack.objects.create(
            title="Software Engineering",
            slug="software-engineering",
            description="Full track",
            is_active=True
        )
        track.refresh_from_db()
        TrackCourse.objects.create(track=track, course=sample_course, order=1)

        tracks = selectors.list_career_tracks()
        assert any(str(t.id) == str(track.id) for t in tracks)

        track_by_slug = selectors.get_career_track_by_slug("software-engineering")
        assert track_by_slug is not None
        assert str(track_by_slug.id) == str(track.id)


# ==============================================================================
# 2. VALIDATOR TESTS
# ==============================================================================

class TestCourseValidators:
    def test_validate_course_pricing(self):
        # Valid free
        validators.validate_course_pricing(Decimal("0.00"), is_free=True)
        # Invalid free with price
        with pytest.raises(ValidationError):
            validators.validate_course_pricing(Decimal("19.99"), is_free=True)
        # Valid paid
        validators.validate_course_pricing(Decimal("49.99"), is_free=False)
        # Invalid paid with 0
        with pytest.raises(ValidationError):
            validators.validate_course_pricing(Decimal("0.00"), is_free=False)

    def test_validate_review_rating(self):
        for r in range(1, 6):
            validators.validate_review_rating(r)
        with pytest.raises(ValidationError):
            validators.validate_review_rating(0)
        with pytest.raises(ValidationError):
            validators.validate_review_rating(6)

    def test_validate_lesson_progress(self):
        validators.validate_lesson_progress(120.5)
        with pytest.raises(ValidationError):
            validators.validate_lesson_progress(-1.0)

    def test_validate_note_content(self):
        assert validators.validate_note_content("Great explanation!") == "Great explanation!"
        with pytest.raises(ValidationError):
            validators.validate_note_content("   ")


# ==============================================================================
# 3. PERMISSION TESTS
# ==============================================================================

@pytest.mark.django_db
class TestCoursePermissions:
    def test_is_instructor_or_read_only(self, instructor, student):
        perm = permissions.IsInstructorOrReadOnly()

        class DummyRequest:
            def __init__(self, user, method):
                self.user = user
                self.method = method

        # Safe method (GET)
        assert perm.has_permission(DummyRequest(student, "GET"), None) is True
        # POST as student
        assert perm.has_permission(DummyRequest(student, "POST"), None) is False
        # POST as instructor
        assert perm.has_permission(DummyRequest(instructor, "POST"), None) is True

    def test_is_course_instructor_or_admin(self, instructor, other_student, sample_course):
        perm = permissions.IsCourseInstructorOrAdmin()

        class DummyRequest:
            def __init__(self, user, method):
                self.user = user
                self.method = method

        assert perm.has_object_permission(DummyRequest(instructor, "DELETE"), None, sample_course) is True
        assert perm.has_object_permission(DummyRequest(other_student, "DELETE"), None, sample_course) is False


# ==============================================================================
# 4. SERVICE TESTS (LessonService, NoteService, ResourceService)
# ==============================================================================

@pytest.mark.django_db
class TestCourseDomainServices:
    def test_lesson_service_complete_lesson(self, student, sample_course, sample_lesson):
        # Create initial enrollment
        enrollment = Enrollment.objects.create(user=student, course=sample_course)

        result = LessonService.complete_lesson(student, sample_lesson, sample_course)
        assert result["status"] == "success"
        assert result["completed"] is True
        assert result["progress"] == 100

        enrollment.refresh_from_db()
        assert enrollment.progress_percentage == 100
        assert enrollment.completed_at is not None

    def test_lesson_service_update_progress(self, student, sample_lesson):
        progress = LessonService.update_lesson_progress(student, sample_lesson.id, 145.0)
        assert progress.progress_seconds == 145.0
        assert progress.user == student

    def test_note_service_create_and_delete(self, student, sample_course, sample_lesson):
        note = NoteService.create_note(
            user=student,
            course=sample_course,
            lesson=sample_lesson,
            content="Binary search requires sorted array.",
            timestamp_seconds=45
        )
        assert note.content == "Binary search requires sorted array."
        assert note.timestamp_seconds == 45

        # Delete note
        deleted = NoteService.delete_note(student, sample_course, str(note.id))
        assert deleted is True

    def test_resource_service_create_resource(self, sample_course):
        resource = ResourceService.create_resource(
            course=sample_course,
            title="Algorithm Cheat Sheet",
            resource_type="pdf",
            external_url="https://learninghub.com/resources/algos.pdf",
            description="Quick reference"
        )
        assert resource.title == "Algorithm Cheat Sheet"
        assert resource.course == sample_course
