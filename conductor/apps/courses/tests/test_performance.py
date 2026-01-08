import pytest
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.db.models import Count, Q, Prefetch
from model_bakery import baker
from apps.courses.models import Category, Course
from apps.courses.serializers import CategorySerializer

@pytest.mark.django_db
def test_category_serializer_n_plus_one_issue():
    # Setup: Create 10 root categories
    root_categories = baker.make(Category, _quantity=10, parent=None, is_active=True)

    # For each root category, create 3 subcategories
    for root in root_categories:
        baker.make(Category, _quantity=3, parent=root, is_active=True)
        # Create 2 courses for each root category
        baker.make(Course, category=root, is_published=True, _quantity=2)

    # ---------------------------------------------------------
    # 1. Test unoptimized queryset (Baseline)
    # ---------------------------------------------------------
    queryset_unopt = Category.objects.filter(is_active=True, parent__isnull=True)

    with CaptureQueriesContext(connection) as ctx_unopt:
        # We need to force evaluation
        serializer = CategorySerializer(queryset_unopt, many=True)
        data = serializer.data

    queries_unopt = len(ctx_unopt.captured_queries)
    # print(f"\nUnoptimized queries: {queries_unopt}")

    # ---------------------------------------------------------
    # 2. Test optimized queryset (The Fix)
    # ---------------------------------------------------------
    # Replicate the logic from CategoryViewSet.get_queryset()
    # Nested prefetching strategy

    # Level 2 subcategories (Sub-sub)
    sub_qs_level_2 = Category.objects.filter(is_active=True).annotate(
        annotated_course_count=Count("courses", filter=Q(courses__is_published=True))
    )

    # Level 1 subcategories (Sub), prefetching Level 2
    sub_qs_level_1 = Category.objects.filter(is_active=True).annotate(
        annotated_course_count=Count("courses", filter=Q(courses__is_published=True))
    ).prefetch_related(
        Prefetch("subcategories", queryset=sub_qs_level_2, to_attr="active_subcategories")
    )

    # Root categories, prefetching Level 1
    queryset_opt = Category.objects.filter(is_active=True, parent__isnull=True).annotate(
        annotated_course_count=Count("courses", filter=Q(courses__is_published=True))
    ).prefetch_related(
        Prefetch("subcategories", queryset=sub_qs_level_1, to_attr="active_subcategories")
    )

    with CaptureQueriesContext(connection) as ctx_opt:
        serializer = CategorySerializer(queryset_opt, many=True)
        data = serializer.data

    queries_opt = len(ctx_opt.captured_queries)
    # print(f"Optimized queries: {queries_opt}")

    # Assert improvement
    # Expected:
    # 1 query for root categories
    # 1 query for subcategories (triggered by root prefetch)
    # 1 query for sub-subcategories (triggered by sub prefetch)
    # Total: 3 queries

    assert queries_opt < queries_unopt
    assert queries_opt <= 3
