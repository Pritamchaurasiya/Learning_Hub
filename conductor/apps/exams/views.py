"""
Exam taxonomy API views.
Provides endpoints for countries, exams, subjects, and topics.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Country, Exam, Subject, Topic
from .serializers import (
    CountrySerializer,
    ExamListSerializer,
    ExamDetailSerializer,
    SubjectBriefSerializer,
    SubjectDetailSerializer,
    TopicSerializer,
    TopicListSerializer,
    TopicTreeSerializer,
)


@extend_schema_view(
    list=extend_schema(description='List all active countries'),
    retrieve=extend_schema(description='Get country details with exams'),
)
@extend_schema(tags=['Exam Taxonomy - Countries'])
class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Country endpoints.
    GET /api/v1/exams/countries/ - List countries
    GET /api/v1/exams/countries/{id}/ - Country detail with exams
    """
    queryset = Country.objects.filter(is_active=True)
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]
    lookup_field = 'pk'

    def get_serializer_class(self):
        return CountrySerializer

    @extend_schema(description='Get exams for a specific country')
    @action(detail=True, methods=['get'])
    def exams(self, request, pk=None):
        """Get all active exams for a country."""
        country = self.get_object()
        exams = country.exams.filter(is_active=True).order_by('-popularity_score')
        serializer = ExamListSerializer(exams, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
        })


@extend_schema_view(
    list=extend_schema(description='List all active exams'),
    retrieve=extend_schema(description='Get exam details with subjects and topics'),
)
@extend_schema(tags=['Exam Taxonomy - Exams'])
class ExamViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exam endpoints.
    GET /api/v1/exams/exams/ - List exams
    GET /api/v1/exams/exams/{id}/ - Exam detail with subjects
    GET /api/v1/exams/exams/?country=IN - Filter by country code
    GET /api/v1/exams/exams/?search=JEE - Search exams
    """
    permission_classes = [AllowAny]
    lookup_field = 'pk'

    def get_queryset(self):
        queryset = Exam.objects.filter(is_active=True).select_related('country')

        # Filter by country code
        country_code = self.request.query_params.get('country')
        if country_code:
            queryset = queryset.filter(country__code__iexact=country_code)

        # Search by name or code
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search) | queryset.filter(code__icontains=search)

        # Filter by featured
        featured = self.request.query_params.get('featured')
        if featured and featured.lower() == 'true':
            queryset = queryset.filter(is_featured=True)

        return queryset.order_by('-popularity_score', 'name')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ExamDetailSerializer
        return ExamListSerializer

    @extend_schema(description='Get subjects for a specific exam')
    @action(detail=True, methods=['get'])
    def subjects(self, request, pk=None):
        """Get all active subjects for an exam."""
        exam = self.get_object()
        subjects = exam.subjects.filter(is_active=True).prefetch_related('topics')
        serializer = SubjectDetailSerializer(subjects, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
        })


@extend_schema_view(
    list=extend_schema(description='List all active subjects'),
    retrieve=extend_schema(description='Get subject details with topics'),
)
@extend_schema(tags=['Exam Taxonomy - Subjects'])
class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Subject endpoints.
    GET /api/v1/exams/subjects/ - List subjects
    GET /api/v1/exams/subjects/{id}/ - Subject detail with topics
    GET /api/v1/exams/subjects/?exam=JEE_MAIN - Filter by exam code
    """
    permission_classes = [AllowAny]
    lookup_field = 'pk'

    def get_queryset(self):
        queryset = Subject.objects.filter(is_active=True).select_related('exam')

        # Filter by exam code
        exam_code = self.request.query_params.get('exam')
        if exam_code:
            queryset = queryset.filter(exam__code__iexact=exam_code)

        return queryset.order_by('exam', 'name')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SubjectDetailSerializer
        return SubjectBriefSerializer


@extend_schema_view(
    list=extend_schema(description='List all active topics'),
    retrieve=extend_schema(description='Get topic details'),
)
@extend_schema(tags=['Exam Taxonomy - Topics'])
class TopicViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Topic endpoints.
    GET /api/v1/exams/topics/ - List topics
    GET /api/v1/exams/topics/{id}/ - Topic detail
    GET /api/v1/exams/topics/?subject=MATH - Filter by subject code
    GET /api/v1/exams/topics/?exam=JEE_MAIN - Filter by exam code
    """
    permission_classes = [AllowAny]
    lookup_field = 'pk'

    def get_queryset(self):
        queryset = Topic.objects.filter(is_active=True).select_related('subject', 'subject__exam')

        # Filter by subject code
        subject_code = self.request.query_params.get('subject')
        if subject_code:
            queryset = queryset.filter(subject__code__iexact=subject_code)

        # Filter by exam code
        exam_code = self.request.query_params.get('exam')
        if exam_code:
            queryset = queryset.filter(subject__exam__code__iexact=exam_code)

        # Filter by parent (subtopics)
        parent_id = self.request.query_params.get('parent')
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        elif parent_id == 'null':
            queryset = queryset.filter(parent__isnull=True)

        return queryset.order_by('subject', 'name')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TopicSerializer
        return TopicListSerializer

    @extend_schema(description='Get topic tree (hierarchical) for a subject')
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get hierarchical topic tree for a subject."""
        subject_id = request.query_params.get('subject_id')
        if not subject_id:
            return Response(
                {'status': 'error', 'message': 'subject_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            subject = Subject.objects.get(id=subject_id, is_active=True)
        except Subject.DoesNotExist:
            return Response(
                {'status': 'error', 'message': 'Subject not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get root topics (no parent)
        root_topics = subject.topics.filter(is_active=True, parent__isnull=True)
        serializer = TopicTreeSerializer(root_topics, many=True)
        return Response({
            'status': 'success',
            'data': {
                'subject': subject.name,
                'topics': serializer.data,
            },
        })
