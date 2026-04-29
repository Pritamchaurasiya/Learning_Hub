"""
Course views for Learning Hub API.
"""

from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.conf import settings
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.core.exceptions import ValidationError

from apps.core.permissions import IsInstructor
from django.db.models import Avg, Count, Prefetch, Q
from django.utils import timezone
from .models import Category, Course, Module, Lesson, Enrollment, Review, Certificate
from .serializers import (
    CategorySerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CreateReviewSerializer,
    EnrollmentSerializer,
    ReviewSerializer,
    CertificateSerializer,
    ModuleSerializer,
    LessonSerializer,
)

from .services import CourseService
from .certificate_service import CertificateService, CertificateType

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


@extend_schema(tags=["Categories"])
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Category endpoints.

    GET /api/v1/courses/categories/ - List categories
    GET /api/v1/courses/categories/{id}/ - Category detail
    """

    queryset = (
        Category.objects.filter(is_active=True, parent__isnull=True)
        .prefetch_related(
            Prefetch(
                "subcategories",
                queryset=Category.objects.filter(is_active=True).order_by("name"),
                to_attr="active_subcategories",
            ),
            "courses"
        )
        .annotate(
            published_course_count=Count(
                "courses", filter=Q(courses__is_published=True)
            )
        )
        .order_by("name")
    )
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


@extend_schema_view(
    enroll=extend_schema(responses={201: EnrollmentSerializer}, request=None),
    review=extend_schema(
        request=CreateReviewSerializer, responses={201: ReviewSerializer}
    ),
    reviews=extend_schema(responses={200: ReviewSerializer(many=True)}),
    my_courses=extend_schema(responses={200: EnrollmentSerializer(many=True)}),
    featured=extend_schema(responses={200: CourseListSerializer(many=True)}),
)
@extend_schema(tags=["Courses"])
class CourseViewSet(viewsets.ModelViewSet):
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

    queryset = Course.objects.filter(is_published=True).select_related('instructor', 'category')
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

    def get_permissions(self):
        """
        - Read operations: AllowAny (public courses)
        - Write operations (create/update/delete): Must be authenticated instructor
        - Custom actions have their own permission_classes decorator
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsInstructor()]
        return [AllowAny()]

    def get_queryset(self):
        query = self.request.query_params.get('search', None)
        semantic = self.request.query_params.get('semantic', 'false') == 'true'

        if query:
            if semantic:
                 from apps.core.vector_service import VectorService
                 # Threshold-based filtering could be added here
                 return VectorService.semantic_search(Course, query, limit=10)\
                     .select_related("instructor", "category")
            
            return CourseService.search_courses(query)\
                .select_related("instructor", "category")
        
        queryset = super().get_queryset().select_related('instructor', 'category')
        # Only prefetch modules/lessons for detail view; skip reviews on list
        if self.action == 'retrieve':
            return queryset.prefetch_related(
                "modules",
                "modules__lessons",
                "reviews"
            )
        return queryset

    def perform_create(self, serializer):
        """Auto-assign instructor during creation."""
        serializer.save(instructor=self.request.user)

    @method_decorator(cache_page(60 * 15))
    def list(self, request, *args, **kwargs):
        """List courses (Cached 15m)."""
        return super().list(request, *args, **kwargs)

    @method_decorator(cache_page(60 * 15))
    def retrieve(self, request, *args, **kwargs):
        """Get course detail (Cached 15m)."""
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def enroll(self, request, slug=None):
        """Enroll in a course."""
        course = self.get_object()
        user = request.user

        try:
            from apps.core.exceptions import PaymentRequiredException
        except ImportError:
            from rest_framework.exceptions import APIException
            class PaymentRequiredException(APIException):
                status_code = 402
                default_detail = "Payment required."

        try:
            enrollment = CourseService.enroll_user(user, course)
            return Response(
                {
                    "status": "success",
                    "message": "Successfully enrolled in course.",
                    "data": EnrollmentSerializer(enrollment).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except (ValueError, ValidationError) as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PaymentRequiredException as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

    @method_decorator(cache_page(60 * 5))  # cache 5 min
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

    @method_decorator(cache_page(60 * 60))  # cache 1 hour
    @action(detail=False, methods=["get"])
    def trending(self, request):
        """Get trending courses — most enrolled in last 30 days."""
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        courses = (
            Course.objects.filter(is_published=True)
            .annotate(
                recent_enrollments=Count(
                    "enrollments",
                    filter=Q(enrollments__created_at__gte=thirty_days_ago),
                ),
                computed_avg_rating=Avg("reviews__rating"),
            )
            .filter(recent_enrollments__gt=0)
            .order_by("-recent_enrollments")
            .select_related("instructor", "category")
        )[:12]
        serializer = CourseListSerializer(courses, many=True)
        return Response({"status": "success", "data": serializer.data})

    @action(detail=False, methods=["get"])
    def search(self, request):
        """
        Full-text search courses.

        GET /api/v1/courses/search/?q=python&limit=20
        Searches title, description, and instructor name.
        Uses Postgres Full-Text Search (SearchVector) if available, else icontains.
        """
        query = request.query_params.get("q", "").strip()
        if not query:
             return Response(
                {"status": "error", "message": "Search query 'q' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            limit = min(int(request.query_params.get("limit", 20)), 100)
        except (ValueError, TypeError):
            limit = 20
        
        # Check if we are running on Postgres
        is_postgres = 'postgresql' in settings.DATABASES['default']['ENGINE']

        if is_postgres:
            from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
            
            # Postgres Full-Text Search
            vector = SearchVector("title", weight="A") + \
                     SearchVector("short_description", weight="B") + \
                     SearchVector("description", weight="C") + \
                     SearchVector("instructor__username", weight="A")
            
            search_query = SearchQuery(query)
            
            courses = (
                self.get_queryset()
                .annotate(rank=SearchRank(vector, search_query))
                .filter(rank__gte=0.1)
                .order_by("-rank")[:limit]
            )
        else:
             # SQLite / Fallback Search
            courses = (
                self.get_queryset()
                .filter(
                    Q(title__icontains=query)
                    | Q(short_description__icontains=query)
                    | Q(description__icontains=query)
                    | Q(instructor__username__icontains=query)
                )
                .distinct()[:limit]
            )

        serializer = self.get_serializer(courses, many=True)
        return Response(
            {
                "status": "success",
                "results": len(serializer.data),
                "data": serializer.data,
                "strategy": "postgres_fts" if is_postgres else "simple_match"
            }
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def recommendations(self, request):
        """Get personalized course recommendations using Neuro-Symbolic AI."""
        try:
            recs = CourseService.get_personalized_recommendations(request.user)
            # manually serialize since we have a wrapper dict
            data = []
            for item in recs:
                course_data = CourseListSerializer(item['course']).data
                course_data['ai_reason'] = item['ai_reason']
                course_data['ai_score'] = item['score']
                data.append(course_data)
            
            return Response({"status": "success", "data": data})
        except Exception:
            # Fallback
            courses = Course.objects.filter(is_published=True).order_by('-enrollment_count')[:5]
            serializer = CourseListSerializer(courses, many=True)
            return Response({"status": "success", "data": serializer.data, "note": "fallback"})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def certificate(self, request, slug=None):
        """Generate/Get certificate for course."""
        course = self.get_object()
        from apps.courses.models import Enrollment
        
        # Verify enrollment
        try:
            enrollment = Enrollment.objects.get(user=request.user, course=course)
        except Enrollment.DoesNotExist:
             return Response(
                 {"error": "You are not enrolled in this course."},
                 status=status.HTTP_403_FORBIDDEN
             )
             
        # Verify completion
        if enrollment.progress_percentage < 100:
             return Response(
                 {
                     "status": "error", 
                     "message": f"Course not completed yet ({enrollment.progress_percentage}%). Complete all lessons to get certified."
                 },
                 status=status.HTTP_400_BAD_REQUEST
             )
        
        try:
            # Check for existing certificate first (idempotency guard)
            from .models import Certificate as CertModel
            existing_cert = CertModel.objects.filter(
                user=request.user, course=course
            ).first()
            if existing_cert:
                return Response(
                    {
                        "status": "success",
                        "data": CertificateSerializer(existing_cert).data,
                        "message": "Certificate already generated."
                    }
                )

            cert = CertificateService.generate_certificate(
                user=request.user,
                certificate_type=CertificateType.COURSE_COMPLETION,
                achievement_name=f"Completed {course.title}",
                achievement_details={
                    'completion_date': str(timezone.now().date()),
                    'course_id': str(course.id),
                },
                course_id=str(course.id)
            )
            # Create Certificate model record for backward compatibility
            cert_record, created = CertModel.objects.get_or_create(
                user=request.user,
                course=course,
                defaults={
                    'enrollment': enrollment,
                    'certificate_code': cert.get('verification_code', ''),
                    'signature': cert.get('signature', '')
                }
            )
            return Response(
                {
                    "status": "success",
                    "data": CertificateSerializer(cert_record).data,
                    "download_url": cert.get('pdf_url')
                }
            )
        except Exception as e:
            logger.error("Certificate generation failed for user %s, course %s: %s",
                        request.user.id, course.id, str(e))
            return Response(
                {"status": "error", "message": "Certificate generation failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='key-concepts', permission_classes=[AllowAny])
    def key_concepts(self, request, slug=None):
        """
        Get key concepts extracted from course content using Information Bottleneck.
        GET /api/v1/courses/{slug}/key-concepts/
        """
        from .content_analyzer import LessonAnalysisService
        from .models import Lesson
        
        course = self.get_object()
        
        # Aggregate content from all lessons
        lessons = Lesson.objects.filter(module__course=course).values('id', 'title', 'text_content')
        
        all_content = "\n\n".join(
            f"## {lesson['title']}\n{lesson['text_content'] or ''}"
            for lesson in lessons
        )
        
        if not all_content.strip():
            return Response({
                "status": "success",
                "data": {
                    "key_concepts": [],
                    "summary": "No content available for analysis.",
                    "metrics": {}
                }
            })
        
        analysis = LessonAnalysisService.analyze_lesson(
            lesson_id=course.id,
            content=all_content,
            title=course.title
        )
        
        return Response({
            "status": "success",
            "data": analysis
        })

    @action(detail=True, methods=['post'], url_path='complete-lesson', permission_classes=[IsAuthenticated])
    def complete_lesson(self, request, slug=None):
        """
        Mark a lesson as complete, update progress, and award XP.
        Body: { "lesson_id": <uuid/id> }
        """
        course = self.get_object()
        lesson_id = request.data.get('lesson_id')
        
        if not lesson_id:
            return Response({"error": "lesson_id required"}, status=400)
            
        from .models import Lesson, LessonCompletion, Enrollment
        from django.utils import timezone
        from apps.gamification.services import GamificationService

        try:
            lesson = Lesson.objects.get(id=lesson_id, module__course=course)
        except Lesson.DoesNotExist:
            return Response({"error": "Lesson not found in this course"}, status=404)

        try:
            from django.db import transaction

            # Idempotent Completion
            _, created = LessonCompletion.objects.get_or_create(
                user=request.user,
                lesson=lesson
            )
            
            # Only award XP on first completion
            if created:
                GamificationService.award_xp(request.user, 50, f"Completed Lesson: {lesson.title}")
            
            # Update Enrollment Progress — locked to prevent concurrent overwrites
            total_lessons = Lesson.objects.filter(module__course=course).count()
            completed_count = LessonCompletion.objects.filter(
                user=request.user, 
                lesson__module__course=course
            ).count()
            
            progress = int((completed_count / total_lessons) * 100) if total_lessons > 0 else 0
            
            with transaction.atomic():
                # select_for_update is only supported on PostgreSQL, not SQLite
                from django.db import connection
                if 'postgresql' in connection.settings_dict.get('ENGINE', ''):
                    enrollment, _ = Enrollment.objects.select_for_update().get_or_create(
                        user=request.user, course=course
                    )
                else:
                    enrollment, _ = Enrollment.objects.get_or_create(
                        user=request.user, course=course
                    )
                
                # Only update if progress increased
                if progress > enrollment.progress_percentage:
                    enrollment.progress_percentage = min(progress, 100)
                    if progress >= 100 and not enrollment.completed_at:
                        enrollment.completed_at = timezone.now()
                        GamificationService.award_xp(request.user, 500, f"Certified: {course.title}")
                        
                        # Async Certificate Generation
                        from .tasks import generate_certificate_task
                        generate_certificate_task.delay(request.user.id, course.id)
                        
                    enrollment.save(update_fields=['progress_percentage', 'completed_at', 'updated_at'])

            # Publish lesson.completed event for notifications
            try:
                from apps.core.event_bus import EventBus
                EventBus.publish("lesson.completed", {
                    "user_id": request.user.id,
                    "username": request.user.username,
                    "lesson_id": str(lesson.id),
                    "lesson_title": lesson.title,
                    "course_title": course.title,
                    "progress": progress,
                })
            except Exception:
                pass  # EventBus is non-critical

            return Response({
                "status": "success", 
                "progress": progress,
                "completed": True,
                "message": "Lesson marked as complete."
            })
            
        except Exception:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Error completing lesson %s for user %s", lesson_id, request.user.id)
            return Response({"error": "Failed to complete lesson"}, status=500)

    @action(detail=True, methods=['post'], url_path='update-progress', permission_classes=[IsAuthenticated])
    def update_progress(self, request, slug=None):
        """
        Update playback progress (timestamp).
        Body: { "lesson_id": <id>, "seconds": <float> }
        """
        lesson_id = request.data.get('lesson_id')
        seconds = request.data.get('seconds', 0.0)
        
        if not lesson_id:
             return Response({"error": "lesson_id required"}, status=400)
             
        try:
            from .models import Lesson, LessonProgress
            
            # Upsert
            progress, _ = LessonProgress.objects.update_or_create(
                user=request.user,
                lesson_id=lesson_id,
                defaults={
                    'progress_seconds': float(seconds),
                    'last_updated': timezone.now() # Auto-updates anyway due to auto_now, but being explicit
                }
            )
            
            return Response({"status": "success", "saved_at": progress.progress_seconds})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='bookmark', permission_classes=[IsAuthenticated])
    def bookmark(self, request, slug=None):
        """Bookmark a course for later."""
        course = self.get_object()
        from apps.ai_engine.models import UserBehavior
        behavior, created = UserBehavior.objects.get_or_create(
            user=request.user,
            behavior_type=UserBehavior.BehaviorType.WISHLIST,
            course=course,
            defaults={'source_page': 'course_detail'}
        )
        if not created:
            behavior.delete()
            return Response({"status": "success", "bookmarked": False})
        return Response({"status": "success", "bookmarked": True}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='bookmarks', permission_classes=[IsAuthenticated])
    def bookmarks(self, request):
        """Get user's bookmarked courses."""
        from apps.ai_engine.models import UserBehavior
        course_ids = UserBehavior.objects.filter(
            user=request.user,
            behavior_type=UserBehavior.BehaviorType.WISHLIST
        ).values_list('course_id', flat=True)
        courses = Course.objects.filter(id__in=course_ids, is_published=True)
        serializer = CourseListSerializer(courses, many=True)
        return Response({"status": "success", "data": serializer.data})

    @method_decorator(cache_page(60 * 10))
    @action(detail=True, methods=['get'], url_path='similar', permission_classes=[AllowAny])
    def similar(self, request, slug=None):
        """Get courses similar to this one."""
        course = self.get_object()
        similar = Course.objects.filter(
            category=course.category,
            is_published=True
        ).exclude(id=course.id).annotate(
            avg_rating=Avg('reviews__rating'),
            enrollment_count=Count('enrollments')
        ).order_by('-enrollment_count')[:10]
        serializer = CourseListSerializer(similar, many=True)
        return Response({"status": "success", "data": serializer.data})

    @action(detail=True, methods=['post'], url_path='share', permission_classes=[IsAuthenticated])
    def share(self, request, slug=None):
        """Share a course (track share + return share link)."""
        course = self.get_object()
        from apps.ai_engine.models import UserBehavior
        UserBehavior.objects.create(
            user=request.user,
            behavior_type=UserBehavior.BehaviorType.COURSE_CLICK,
            course=course,
            source_page='share',
            metadata={'action': 'share'}
        )
        share_url = f"{request.build_absolute_uri('/courses/')}{course.slug}"
        return Response({
            "status": "success",
            "share_url": share_url,
            "title": course.title,
            "description": course.short_description or course.description[:200]
        })


@extend_schema(tags=["Certificates"])
class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Certificate endpoints.
    
    GET /api/v1/courses/certificates/ - List my certificates
    GET /api/v1/courses/certificates/{code}/ - Get certificate detail
    """
    
    permission_classes = [IsAuthenticated]
    lookup_field = 'certificate_code'
    
    def get_queryset(self):
        return self.request.user.certificates.select_related('course', 'user')
    
    def get_serializer_class(self):
        return CertificateSerializer
    
    @action(detail=True, methods=['get'])
    def download(self, request, certificate_code=None):
        """Download certificate file."""
        import os
        from django.http import FileResponse
        from django.conf import settings
        
        certificate = self.get_object()
        
        # In this system, certificates are stored in MEDIA_ROOT/certificates/
        file_path = os.path.join(settings.MEDIA_ROOT, 'certificates', f"{certificate.id}.pdf")
        
        if not os.path.exists(file_path):
            return Response(
                {"error": "Certificate file not found. It may still be generating."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        response = FileResponse(
            open(file_path, 'rb'),
            content_type='application/pdf',
            as_attachment=True,
            filename=f"certificate_{certificate.certificate_code}.pdf",
        )
        return response

class PublicCertificateViewSet(viewsets.GenericViewSet):
    """
    Public endpoints for certificate verification.
    """
    permission_classes = [AllowAny]
    queryset = Certificate.objects.all().select_related('course', 'user')
    lookup_field = 'certificate_code'

    @action(detail=True, methods=['get'])
    def verify(self, request, certificate_code=None):
        """
        Public endpoint to verify a certificate signature.
        GET /api/v1/courses/public-certificates/{code}/verify/
        """
        try:
            cert = self.get_object()
            
            # Retrieve signature (it was generated on save)
            return Response({
                "valid": True,
                "certificate_code": cert.certificate_code,
                "student_name": cert.user.get_full_name() or cert.user.username,
                "course_title": cert.course.title,
                "issued_at": cert.issued_at,
                "signature": cert.signature,
                "verified_by": "Conductor Certification Authority"
            })
        except Exception:
            return Response(
                {"valid": False, "error": "Invalid Certificate Code"},
                status=status.HTTP_404_NOT_FOUND
            )

from .models import CareerTrack
from .serializers import CareerTrackSerializer

@extend_schema_view(
    list=extend_schema(responses={200: CareerTrackSerializer(many=True)}),
    retrieve=extend_schema(responses={200: CareerTrackSerializer})
)
class CareerTrackViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Career Track endpoints.
    GET /api/v1/courses/tracks/
    GET /api/v1/courses/tracks/{slug}/
    """
    queryset = CareerTrack.objects.filter(is_active=True).prefetch_related('courses', 'trackcourse_set__course')
    serializer_class = CareerTrackSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='verify')
    def verify(self, request):
        """
        Public endpoint to verify a certificate signature.
        GET /api/v1/courses/tracks/verify/?code=XXXX
        """
        code = request.query_params.get('code')
        if not code:
            return Response(
                {"valid": False, "error": "Certificate code is required. Use ?code=XXXX"},
                status=status.HTTP_400_BAD_REQUEST
            )
        from apps.courses.models import Certificate
        try:
            cert = Certificate.objects.select_related('user', 'course').get(certificate_code=code)
            
            # Retrieve signature (it was generated on save)
            return Response({
                "valid": True,
                "certificate_code": cert.certificate_code,
                "student_name": cert.user.get_full_name() or cert.user.username,
                "course_title": cert.course.title,
                "issued_at": cert.issued_at,
                "signature": cert.signature
            })
        except Certificate.DoesNotExist:
            return Response(
                {"valid": False, "error": "Invalid Certificate Code"},
                status=status.HTTP_404_NOT_FOUND
            )
