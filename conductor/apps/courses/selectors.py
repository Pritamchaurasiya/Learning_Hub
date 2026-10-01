"""
Course Selectors for Learning Hub Backend.
Clean Architecture - Read/Query operations for the Courses domain.
Zero business logic, optimized querysets with select_related / prefetch_related.
"""

from typing import Optional, Dict, Any, List
from django.db.models import QuerySet, Count, Avg, Q, Prefetch
from apps.courses.models import (
    Category,
    Course,
    Module,
    Lesson,
    Enrollment,
    Review,
    Certificate,
    CareerTrack,
    TrackCourse,
    LessonCompletion,
    LessonProgress,
    CourseNote,
    CourseResource,
)


def get_course_by_id(course_id: str) -> Optional[Course]:
    """Retrieve a course by UUID or return None."""
    try:
        return (
            Course.objects.select_related("instructor", "category")
            .prefetch_related("modules__lessons")
            .get(id=course_id)
        )
    except (Course.DoesNotExist, ValueError):
        return None


def get_course_by_slug(slug: str, *, include_unpublished: bool = False) -> Optional[Course]:
    """Retrieve a course by its unique slug."""
    qs = (
        Course.objects.select_related("instructor", "category")
        .prefetch_related(
            Prefetch(
                "modules",
                queryset=Module.objects.order_by("order").prefetch_related(
                    Prefetch("lessons", queryset=Lesson.objects.order_by("order"))
                ),
            )
        )
    )
    if not include_unpublished:
        qs = qs.filter(is_published=True)
    try:
        return qs.get(slug=slug)
    except Course.DoesNotExist:
        return None


def list_published_courses(
    *,
    category_slug: Optional[str] = None,
    difficulty: Optional[str] = None,
    is_free: Optional[bool] = None,
    instructor_id: Optional[str] = None,
    search_query: Optional[str] = None,
) -> QuerySet[Course]:
    """List published courses with filters and relation optimization."""
    qs = (
        Course.objects.filter(is_published=True)
        .select_related("instructor", "category")
        .order_by("-created_at")
    )
    if category_slug:
        qs = qs.filter(
            Q(category__slug=category_slug) | Q(category__parent__slug=category_slug)
        )
    if difficulty:
        qs = qs.filter(difficulty=difficulty)
    if is_free is not None:
        qs = qs.filter(is_free=is_free)
    if instructor_id:
        qs = qs.filter(instructor_id=instructor_id)
    if search_query:
        qs = qs.filter(
            Q(title__icontains=search_query)
            | Q(short_description__icontains=search_query)
            | Q(description__icontains=search_query)
        )
    return qs


def list_featured_courses(limit: int = 10) -> QuerySet[Course]:
    """Return top featured published courses."""
    return (
        Course.objects.filter(is_published=True, is_featured=True)
        .select_related("instructor", "category")
        .order_by("-enrollment_count", "-avg_rating")[:limit]
    )


def list_trending_courses(limit: int = 10) -> QuerySet[Course]:
    """Return trending courses based on enrollment count and rating."""
    return (
        Course.objects.filter(is_published=True)
        .select_related("instructor", "category")
        .order_by("-enrollment_count", "-avg_rating", "-created_at")[:limit]
    )


def get_user_enrollment(user, course: Course) -> Optional[Enrollment]:
    """Get active enrollment record for user in a course."""
    if not user or not user.is_authenticated:
        return None
    try:
        return Enrollment.objects.get(user=user, course=course)
    except Enrollment.DoesNotExist:
        return None


def is_user_enrolled(user, course: Course) -> bool:
    """Return True if user is actively enrolled in course."""
    if not user or not user.is_authenticated:
        return False
    return Enrollment.objects.filter(user=user, course=course).exists()


def list_user_enrollments(user) -> QuerySet[Enrollment]:
    """List all enrollments for a user with related course metadata."""
    if not user or not user.is_authenticated:
        return Enrollment.objects.none()
    return (
        Enrollment.objects.filter(user=user)
        .select_related("course", "course__instructor", "course__category")
        .prefetch_related("course__modules")
        .order_by("-created_at")
    )


def get_lesson_by_id(lesson_id: str) -> Optional[Lesson]:
    """Retrieve a single lesson by ID."""
    try:
        return (
            Lesson.objects.select_related("module", "module__course")
            .get(id=lesson_id)
        )
    except (Lesson.DoesNotExist, ValueError):
        return None


def get_lesson_by_slug(course_slug: str, lesson_slug: str) -> Optional[Lesson]:
    """Retrieve a lesson by course slug and lesson slug."""
    try:
        return (
            Lesson.objects.select_related("module", "module__course")
            .get(module__course__slug=course_slug, slug=lesson_slug)
        )
    except Lesson.DoesNotExist:
        return None


def get_user_lesson_progress(user, lesson: Lesson) -> Optional[LessonProgress]:
    """Get user's video / completion progress for a lesson."""
    if not user or not user.is_authenticated:
        return None
    try:
        return LessonProgress.objects.get(user=user, lesson=lesson)
    except LessonProgress.DoesNotExist:
        return None


def list_completed_lesson_ids(user, course: Course) -> List[str]:
    """Return list of completed lesson IDs for a user in a course."""
    if not user or not user.is_authenticated:
        return []
    return list(
        LessonCompletion.objects.filter(
            user=user, lesson__module__course=course
        ).values_list("lesson_id", flat=True)
    )


def get_course_reviews(course: Course, *, limit: int = 50) -> QuerySet[Review]:
    """Get approved reviews for a course."""
    return (
        Review.objects.filter(course=course, is_approved=True)
        .select_related("user")
        .order_by("-created_at")[:limit]
    )


def list_categories(*, parent_only: bool = True) -> QuerySet[Category]:
    """List active categories with subcategories and course counts."""
    qs = Category.objects.filter(is_active=True)
    if parent_only:
        qs = qs.filter(parent__isnull=True)
    return (
        qs.prefetch_related(
            Prefetch(
                "subcategories",
                queryset=Category.objects.filter(is_active=True).order_by("order", "name"),
                to_attr="active_subcategories",
            )
        )
        .annotate(
            published_course_count=Count(
                "courses", filter=Q(courses__is_published=True)
            )
        )
        .order_by("order", "name")
    )


def get_category_by_slug(slug: str) -> Optional[Category]:
    """Retrieve a category by slug."""
    try:
        return Category.objects.prefetch_related("subcategories").get(slug=slug, is_active=True)
    except Category.DoesNotExist:
        return None


def get_certificate_by_code(certificate_code: str) -> Optional[Certificate]:
    """Retrieve a verified certificate by unique cryptographic code."""
    try:
        return (
            Certificate.objects.select_related("user", "course", "enrollment")
            .get(certificate_code=certificate_code)
        )
    except Certificate.DoesNotExist:
        return None


def list_user_certificates(user) -> QuerySet[Certificate]:
    """List all certificates issued to a user."""
    if not user or not user.is_authenticated:
        return Certificate.objects.none()
    return (
        Certificate.objects.filter(user=user)
        .select_related("course", "enrollment")
        .order_by("-issued_at")
    )


def list_course_notes(user, course: Course, *, lesson_id: Optional[str] = None) -> QuerySet[CourseNote]:
    """List student's timestamped notes for a course."""
    if not user or not user.is_authenticated:
        return CourseNote.objects.none()
    qs = CourseNote.objects.filter(user=user, course=course).select_related("lesson")
    if lesson_id:
        qs = qs.filter(lesson_id=lesson_id)
    return qs.order_by("-created_at")


def list_course_resources(course: Course, *, lesson_id: Optional[str] = None) -> QuerySet[CourseResource]:
    """List downloadable resources for a course."""
    qs = CourseResource.objects.filter(course=course).select_related("lesson")
    if lesson_id:
        qs = qs.filter(lesson_id=lesson_id)
    return qs.order_by("title")


def list_career_tracks(*, is_active: bool = True) -> QuerySet[CareerTrack]:
    """List career tracks with course ordering."""
    return (
        CareerTrack.objects.filter(is_active=is_active)
        .prefetch_related(
            Prefetch(
                "trackcourse_set",
                queryset=TrackCourse.objects.select_related("course").order_by("order"),
            )
        )
        .order_by("title")
    )


def get_career_track_by_slug(slug: str) -> Optional[CareerTrack]:
    """Retrieve a career track by slug."""
    try:
        return (
            CareerTrack.objects.prefetch_related(
                Prefetch(
                    "trackcourse_set",
                    queryset=TrackCourse.objects.select_related("course").order_by("order"),
                )
            )
            .get(slug=slug, is_active=True)
        )
    except CareerTrack.DoesNotExist:
        return None
