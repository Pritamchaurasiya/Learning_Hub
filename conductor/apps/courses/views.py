"""
Course views for Learning Hub API.
"""

from django.db.models import Count, Prefetch, Q
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Category, Course
from .serializers import (
    CategorySerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CreateReviewSerializer,
    EnrollmentSerializer,
    ReviewSerializer,
)


from .services import CourseService


class CourseFilter(filters.FilterSet):
    """Filter for courses."""

    category = filters.CharFilter(field_name="category__slug")
    difficulty = filters.ChoiceFilter(choices=Course.Difficulty.choices)
    is_free = filters.BooleanFilter()
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")
    instructor = filters.UUIDFilter(field_name="instructor__id")

    class Meta:
        model = Course
        fields = ["category", "difficulty", "is_free", "instructor"]


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Category endpoints.

    GET /api/v1/courses/categories/ - List categories
    GET /api/v1/courses/categories/{id}/ - Category detail
    """

    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        """
        Optimized queryset with recursive prefetching for list view.
        """
        published_courses = Count("courses", filter=Q(courses__is_published=True))

        qs = Category.objects.filter(is_active=True).annotate(
            published_course_count=published_courses
        )

        if self.action == "list":
            qs = qs.filter(parent__isnull=True)

            # Great-Grandchildren (Depth 4 - Leaf)
            great_grandchild_qs = Category.objects.filter(is_active=True).annotate(
                published_course_count=published_courses
            )

            # Grandchildren (Depth 3)
            grandchild_qs = Category.objects.filter(is_active=True).annotate(
                published_course_count=published_courses
            ).prefetch_related(
                Prefetch("subcategories", queryset=great_grandchild_qs, to_attr="active_subcategories")
            )

            # Children (Depth 2)
            child_qs = Category.objects.filter(is_active=True).annotate(
                published_course_count=published_courses
            ).prefetch_related(
                Prefetch("subcategories", queryset=grandchild_qs, to_attr="active_subcategories")
            )

            # Root (Depth 1)
            qs = qs.prefetch_related(
                Prefetch("subcategories", queryset=child_qs, to_attr="active_subcategories")
            )

        return qs


@extend_schema_view(
    enroll=extend_schema(responses={201: EnrollmentSerializer}, request=None),
    review=extend_schema(
        request=CreateReviewSerializer, responses={201: ReviewSerializer}
    ),
    reviews=extend_schema(responses={200: ReviewSerializer(many=True)}),
    my_courses=extend_schema(responses={200: EnrollmentSerializer(many=True)}),
    featured=extend_schema(responses={200: CourseListSerializer(many=True)}),
)
class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Course endpoints.

    GET /api/v1/courses/ - List courses
    GET /api/v1/courses/{slug}/ - Course detail
    POST /api/v1/courses/{slug}/enroll/ - Enroll in course
    GET /api/v1/courses/{slug}/reviews/ - Get reviews
    POST /api/v1/courses/{slug}/review/ - Submit review
    GET /api/v1/courses/my-courses/ - User's enrolled courses
    GET /api/v1/courses/featured/ - Featured courses
    """

    queryset = Course.objects.filter(is_published=True)
    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_class = CourseFilter
    search_fields = ["title", "description", "instructor__display_name"]
    ordering_fields = ["created_at", "enrollment_count", "avg_rating", "price"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CourseDetailSerializer
        if self.action == "review":
            return CreateReviewSerializer
        return CourseListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.select_related("instructor", "category")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def enroll(self, request, slug=None):
        """Enroll in a course."""
        course = self.get_object()
        user = request.user

        enrollment = CourseService.enroll_user(user, course)
        return Response(
            {
                "status": "success",
                "message": "Successfully enrolled in course.",
                "data": EnrollmentSerializer(enrollment).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def reviews(self, request, slug=None):
        """Get course reviews."""
        course = self.get_object()
        reviews = CourseService.get_course_reviews(course)
        serializer = ReviewSerializer(reviews, many=True)

        return Response({"status": "success", "data": serializer.data})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def review(self, request, slug=None):
        """Submit a review."""
        course = self.get_object()
        user = request.user

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = CourseService.add_review(user, course, serializer.validated_data)
        return Response(
            {
                "status": "success",
                "message": "Review submitted successfully.",
                "data": ReviewSerializer(review).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_courses(self, request):
        """Get user's enrolled courses."""
        enrollments = CourseService.get_user_enrollments(request.user)
        serializer = EnrollmentSerializer(enrollments, many=True)

        return Response({"status": "success", "data": serializer.data})

    @method_decorator(cache_page(60 * 15))
    @action(detail=False, methods=["get"])
    def featured(self, request):
        """Get featured courses."""
        courses = CourseService.get_featured_courses()
        serializer = CourseListSerializer(courses, many=True)

        return Response({"status": "success", "data": serializer.data})
