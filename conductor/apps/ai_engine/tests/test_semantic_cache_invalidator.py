"""
Unit tests for the Semantic Cache Invalidation Subsystem.
"""

import pytest
from django.core.cache import cache
from django.contrib.contenttypes.models import ContentType
from apps.ai_engine.models import SemanticCache, CourseEmbedding
from apps.courses.models import Course, Module, Lesson, Category
from apps.users.models import User
from apps.ai_engine.cache.semantic_cache_invalidator import (
    invalidate_semantic_cache_for_course,
    invalidate_semantic_cache_for_lesson,
    invalidate_semantic_cache_for_module,
    on_course_saved,
    on_course_deleted,
    on_lesson_saved,
    on_lesson_deleted,
)


@pytest.mark.django_db
class TestSemanticCacheInvalidator:
    """Test suite verifying cache invalidation behavior across layers."""

    @pytest.fixture(autouse=True)
    def setup_fixtures(self):
        cache.clear()
        self.instructor = User.objects.create_user(
            username="instructor_cache_test",
            email="instructor_cache@example.com",
            password="securepassword123",
            role=User.Role.INSTRUCTOR,
        )
        self.category = Category.objects.create(name="AI & ML", slug="ai-ml")
        self.course = Course.objects.create(
            instructor=self.instructor,
            category=self.category,
            title="Advanced Transformers in Production",
            slug="advanced-transformers-production",
            description="Deep dive into transformer architectures.",
        )
        self.module = Module.objects.create(
            course=self.course,
            title="Module 1: Attention Mechanisms",
            order=1,
        )
        self.lesson = Lesson.objects.create(
            module=self.module,
            title="FlashAttention 2 Implementation",
            order=1,
            text_content="FlashAttention optimizes IO operations on modern GPUs.",
        )

    def test_invalidate_semantic_cache_for_course(self):
        # Seed cache keys
        cache.set(f"course_embedding:{self.course.id}", [0.1, 0.2, 0.3], 3600)
        cache.set(f"course_summary:{self.course.id}", "Summary of course", 3600)

        # Seed SemanticCache records
        SemanticCache.objects.create(
            query_text="Tell me about Advanced Transformers in Production",
            response_payload={"answer": "This course covers attention."},
            query_embedding=[0.1, 0.2],
        )
        SemanticCache.objects.create(
            query_text="Unrelated query about cooking",
            response_payload={"answer": "Recipes here."},
            query_embedding=[0.0, 0.0],
        )

        deleted = invalidate_semantic_cache_for_course(
            course_id=self.course.id,
            course_title=self.course.title,
            course_slug=self.course.slug,
            is_deletion=False,
        )

        assert deleted == 1
        assert cache.get(f"course_embedding:{self.course.id}") is None
        assert cache.get(f"course_summary:{self.course.id}") is None
        assert SemanticCache.objects.count() == 1
        assert (
            SemanticCache.objects.first().query_text == "Unrelated query about cooking"
        )

    def test_course_deletion_purges_embeddings(self):
        ct = ContentType.objects.get_for_model(Course)
        CourseEmbedding.objects.create(
            content_type=ct,
            object_id=self.course.id,
            chunk_text="Embedding text chunk for course",
            embedding=[0.5, 0.5],
        )
        assert CourseEmbedding.objects.filter(
            content_type=ct, object_id=self.course.id
        ).exists()

        invalidate_semantic_cache_for_course(
            course_id=self.course.id,
            course_title=self.course.title,
            course_slug=self.course.slug,
            is_deletion=True,
        )

        assert not CourseEmbedding.objects.filter(
            content_type=ct, object_id=self.course.id
        ).exists()

    def test_invalidate_semantic_cache_for_lesson(self):
        cache.set(f"lesson_content:{self.lesson.id}", "cached content", 3600)
        cache.set(f"course_modules:{self.course.id}", ["Module 1"], 3600)

        SemanticCache.objects.create(
            query_text="What is FlashAttention 2 Implementation?",
            response_payload={"answer": "IO-aware attention"},
        )

        deleted = invalidate_semantic_cache_for_lesson(
            lesson_id=self.lesson.id,
            lesson_title=self.lesson.title,
            course_id=self.course.id,
            is_deletion=False,
        )

        assert deleted == 1
        assert cache.get(f"lesson_content:{self.lesson.id}") is None
        assert cache.get(f"course_modules:{self.course.id}") is None

    def test_invalidate_semantic_cache_for_module(self):
        cache.set(f"course_modules:{self.course.id}", "data", 3600)
        cache.set(f"module_details:{self.module.id}", "module data", 3600)

        invalidate_semantic_cache_for_module(
            module_id=self.module.id,
            course_id=self.course.id,
        )

        assert cache.get(f"course_modules:{self.course.id}") is None
        assert cache.get(f"module_details:{self.module.id}") is None

    def test_signal_handlers_trigger_safely(self):
        # Test signal invocation directly without exceptions
        on_course_saved(Course, self.course, created=False)
        on_lesson_saved(Lesson, self.lesson, created=False)
        on_course_deleted(Course, self.course)
        on_lesson_deleted(Lesson, self.lesson)
