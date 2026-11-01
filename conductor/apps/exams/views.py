"""
Exam taxonomy API views.
Provides endpoints for countries, exams, subjects, and topics.
"""

from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Country, Exam, Subject, Topic
from .serializers import (
    CountrySerializer,
    ExamListSerializer,
    ExamDetailSerializer,
    ExamCreateUpdateSerializer,
    SubjectBriefSerializer,
    SubjectDetailSerializer,
    TopicSerializer,
    TopicListSerializer,
    TopicTreeSerializer,
)


@extend_schema_view(
    list=extend_schema(description="List all active countries"),
    retrieve=extend_schema(description="Get country details with exams"),
)
@extend_schema(tags=["Exam Taxonomy - Countries"])
class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Country endpoints.
    GET /api/v1/exams/countries/ - List countries
    GET /api/v1/exams/countries/{id}/ - Country detail with exams
    """

    queryset = Country.objects.filter(is_active=True)
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]
    lookup_field = "pk"

    def get_serializer_class(self):
        return CountrySerializer

    @extend_schema(description="Get exams for a specific country")
    @action(detail=True, methods=["get"])
    def exams(self, request, pk=None):
        """Get all active exams for a country."""
        country = self.get_object()
        exams = country.exams.filter(is_active=True).order_by("-popularity_score")
        serializer = ExamListSerializer(exams, many=True)
        return Response(
            {
                "status": "success",
                "data": serializer.data,
            }
        )


@extend_schema_view(
    list=extend_schema(description="List all active exams"),
    retrieve=extend_schema(description="Get exam details with subjects and topics"),
)
@extend_schema_view(
    list=extend_schema(
        description="List all active exams filtered by country or search"
    ),
    retrieve=extend_schema(description="Get exam details with subjects and topics"),
    create=extend_schema(description="Create exam (Admin only)"),
    update=extend_schema(description="Update exam (Admin only)"),
    partial_update=extend_schema(description="Partial update exam (Admin only)"),
)
@extend_schema(tags=["Exam Taxonomy - Exams"])
class ExamViewSet(viewsets.ModelViewSet):
    """
    Exam endpoints.
    GET /api/v1/exams/exams/ - List exams (country-filtered when feature flag enabled)
    GET /api/v1/exams/exams/{id}/ - Exam detail with subjects
    GET /api/v1/exams/exams/?country=IN - Filter by country ISO code
    GET /api/v1/exams/exams/?country_id=<uuid> - Filter by country UUID
    GET /api/v1/exams/exams/?search=JEE - Search exams
    POST /api/v1/exams/exams/ - Create exam (Admin only)
    PATCH /api/v1/exams/exams/{id}/ - Update exam (Admin only)
    """

    lookup_field = "pk"

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminUser()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = Exam.objects.filter(is_active=True).select_related("country")

        # Feature Flag evaluation
        country_filter_enabled = getattr(settings, "FEATURE_COUNTRY_FILTER", True)

        country_code = self.request.query_params.get("country")
        country_id = self.request.query_params.get(
            "country_id"
        ) or self.request.query_params.get("countryId")

        # Auto-detect via Cloudflare CF-IPCountry header if query param not provided
        if not country_code and not country_id and country_filter_enabled:
            header_country = self.request.headers.get(
                "CF-IPCountry"
            ) or self.request.META.get("HTTP_CF_IPCOUNTRY")
            if header_country and len(header_country) == 2 and header_country != "XX":
                country_code = header_country

        if country_filter_enabled:
            if country_id:
                queryset = queryset.filter(country_id=country_id)
            elif country_code:
                # Sanitized ORM query prevents SQL injection
                queryset = queryset.filter(country__code__iexact=country_code.strip())

        # Search by name or code
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search) | queryset.filter(
                code__icontains=search
            )

        # Filter by featured
        featured = self.request.query_params.get("featured")
        if featured and featured.lower() == "true":
            queryset = queryset.filter(is_featured=True)

        return queryset.order_by("-popularity_score", "name")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ExamCreateUpdateSerializer
        if self.action == "retrieve":
            return ExamDetailSerializer
        return ExamListSerializer

    @extend_schema(description="Get subjects for a specific exam")
    @action(detail=True, methods=["get"])
    def subjects(self, request, pk=None):
        """Get all active subjects for an exam."""
        exam = self.get_object()
        subjects = exam.subjects.filter(is_active=True).prefetch_related("topics")
        serializer = SubjectDetailSerializer(subjects, many=True)
        return Response(
            {
                "status": "success",
                "data": serializer.data,
            }
        )


@extend_schema_view(
    list=extend_schema(description="List all active subjects"),
    retrieve=extend_schema(description="Get subject details with topics"),
)
@extend_schema(tags=["Exam Taxonomy - Subjects"])
class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Subject endpoints.
    GET /api/v1/exams/subjects/ - List subjects
    GET /api/v1/exams/subjects/{id}/ - Subject detail with topics
    GET /api/v1/exams/subjects/?exam=JEE_MAIN - Filter by exam code
    """

    permission_classes = [AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        queryset = Subject.objects.filter(is_active=True).select_related("exam")

        # Filter by exam code
        exam_code = self.request.query_params.get("exam")
        if exam_code:
            queryset = queryset.filter(exam__code__iexact=exam_code)

        return queryset.order_by("exam", "name")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SubjectDetailSerializer
        return SubjectBriefSerializer


@extend_schema_view(
    list=extend_schema(description="List all active topics"),
    retrieve=extend_schema(description="Get topic details"),
)
@extend_schema(tags=["Exam Taxonomy - Topics"])
class TopicViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Topic endpoints.
    GET /api/v1/exams/topics/ - List topics
    GET /api/v1/exams/topics/{id}/ - Topic detail
    GET /api/v1/exams/topics/?subject=MATH - Filter by subject code
    GET /api/v1/exams/topics/?exam=JEE_MAIN - Filter by exam code
    """

    permission_classes = [AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        queryset = Topic.objects.filter(is_active=True).select_related(
            "subject", "subject__exam"
        )

        # Filter by subject code
        subject_code = self.request.query_params.get("subject")
        if subject_code:
            queryset = queryset.filter(subject__code__iexact=subject_code)

        # Filter by exam code
        exam_code = self.request.query_params.get("exam")
        if exam_code:
            queryset = queryset.filter(subject__exam__code__iexact=exam_code)

        # Filter by parent (subtopics)
        parent_id = self.request.query_params.get("parent")
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        elif parent_id == "null":
            queryset = queryset.filter(parent__isnull=True)

        return queryset.order_by("subject", "name")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TopicSerializer
        return TopicListSerializer

    @extend_schema(description="Get topic tree (hierarchical) for a subject")
    @action(detail=False, methods=["get"])
    def tree(self, request):
        """Get hierarchical topic tree for a subject."""
        subject_id = request.query_params.get("subject_id")
        if not subject_id:
            return Response(
                {"status": "error", "message": "subject_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            subject = Subject.objects.get(id=subject_id, is_active=True)
        except Subject.DoesNotExist:
            return Response(
                {"status": "error", "message": "Subject not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get root topics (no parent)
        root_topics = subject.topics.filter(is_active=True, parent__isnull=True)
        serializer = TopicTreeSerializer(root_topics, many=True)
        return Response(
            {
                "status": "success",
                "data": {
                    "subject": subject.name,
                    "topics": serializer.data,
                },
            }
        )


@extend_schema(tags=["Exam Personalization - Geolocation"])
class GeoDetectView(APIView):
    """
    Auto-detect user's country using IP/Cloudflare signals and browser locales.
    Privacy-safe: Never stores or requires precise coordinates.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        feature_enabled = getattr(settings, "FEATURE_COUNTRY_FILTER", True)
        detected_country = None
        method = "fallback"

        # Signal 1: Cloudflare CF-IPCountry header
        cf_country = request.headers.get("CF-IPCountry") or request.META.get(
            "HTTP_CF_IPCOUNTRY"
        )
        if cf_country and len(cf_country) == 2 and cf_country != "XX":
            detected_country = Country.objects.filter(
                code__iexact=cf_country, is_active=True
            ).first()
            if detected_country:
                method = "cloudflare"

        # Signal 2: Accept-Language header fallback (e.g. en-IN, en-US)
        if not detected_country:
            accept_lang = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
            for part in accept_lang.split(","):
                locale = part.split(";")[0].strip()
                if "-" in locale:
                    lang_country = locale.split("-")[1].upper()
                    # UK vs GB alias normalization
                    if lang_country == "GB":
                        lang_country = "UK"
                    matched = Country.objects.filter(
                        code__iexact=lang_country, is_active=True
                    ).first()
                    if matched:
                        detected_country = matched
                        method = "locale"
                        break

        # Signal 3: Fallback country (default active or India/US)
        if not detected_country:
            detected_country = (
                Country.objects.filter(code="IN", is_active=True).first()
                or Country.objects.filter(code="US", is_active=True).first()
                or Country.objects.filter(is_active=True).first()
            )
            method = "fallback"

        if not detected_country:
            return Response(
                {
                    "status": "success",
                    "data": {
                        "countryCode": None,
                        "countryName": None,
                        "countryId": None,
                        "method": "none",
                        "isFeatureEnabled": feature_enabled,
                    },
                }
            )

        return Response(
            {
                "status": "success",
                "data": {
                    "countryCode": detected_country.code,
                    "countryName": detected_country.name,
                    "countryId": str(detected_country.id),
                    "method": method,
                    "isFeatureEnabled": feature_enabled,
                },
            }
        )


@extend_schema(tags=["Exam Personalization - Preferences"])
class PreferenceView(APIView):
    """
    User Exam & Country preference endpoint.
    GET /api/preference or /api/v1/auth/preferences - Get current user preferences
    POST/PUT /api/preference or /api/v1/auth/preferences - Save preferences
    Enforces security & authorization; prevents cross-country data leaks.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        prefs = user.preferences or {}
        country = user.country

        exam_id = prefs.get("examId")
        exam_data = None
        if exam_id:
            try:
                exam = Exam.objects.select_related("country").get(
                    id=exam_id, is_active=True
                )
                exam_data = {
                    "id": str(exam.id),
                    "name": exam.name,
                    "code": exam.code,
                    "countryId": str(exam.country_id),
                }
            except Exam.DoesNotExist:
                exam_data = None

        country_data = None
        if country:
            country_data = {
                "id": str(country.id),
                "code": country.code,
                "name": country.name,
            }

        return Response(
            {
                "status": "success",
                "data": {
                    "countryId": str(country.id) if country else prefs.get("countryId"),
                    "examId": exam_id,
                    "subjectIds": prefs.get("subjectIds", []),
                    "difficulty": prefs.get("difficulty", "MEDIUM"),
                    "dailyGoal": prefs.get("dailyGoal", 15),
                    "country": country_data,
                    "exam": exam_data,
                },
            }
        )

    def post(self, request):
        return self._save_preferences(request)

    def put(self, request):
        return self._save_preferences(request)

    def _save_preferences(self, request):
        user = request.user
        data = request.data or {}

        country_id = data.get("countryId") or data.get("country_id")
        exam_id = data.get("examId") or data.get("exam_id")
        subject_ids = data.get("subjectIds", [])
        difficulty = data.get("difficulty", "MEDIUM")
        daily_goal = data.get("dailyGoal", 15)

        target_country = None
        if country_id:
            try:
                # Query by ID or code safely
                target_country = (
                    Country.objects.filter(id=country_id).first()
                    or Country.objects.filter(code__iexact=country_id).first()
                )
                if not target_country:
                    return Response(
                        {
                            "status": "error",
                            "message": f"Invalid or unsupported country: {country_id}",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Exception:
                return Response(
                    {"status": "error", "message": "Invalid country identifier."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        target_exam = None
        if exam_id:
            try:
                target_exam = Exam.objects.filter(id=exam_id).first()
                if not target_exam:
                    return Response(
                        {
                            "status": "error",
                            "message": "The specified target exam does not exist.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # Verify exam belongs to country to prevent cross-country data leakage
                if target_country and str(target_exam.country_id) != str(
                    target_country.id
                ):
                    return Response(
                        {
                            "status": "error",
                            "message": "Selected exam does not belong to the selected country.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Exception:
                return Response(
                    {"status": "error", "message": "Invalid exam identifier."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Update User model
        if target_country:
            user.country = target_country

        current_prefs = dict(user.preferences or {})
        current_prefs["countryId"] = (
            str(target_country.id) if target_country else country_id
        )
        if target_exam:
            current_prefs["examId"] = str(target_exam.id)
        current_prefs["subjectIds"] = list(subject_ids)
        current_prefs["difficulty"] = difficulty
        current_prefs["dailyGoal"] = daily_goal

        user.preferences = current_prefs
        user.save(update_fields=["country", "preferences"])

        return Response(
            {
                "status": "success",
                "message": "Preferences saved successfully.",
                "data": {
                    "countryId": (
                        str(user.country.id)
                        if user.country
                        else current_prefs.get("countryId")
                    ),
                    "examId": current_prefs.get("examId"),
                    "subjectIds": current_prefs.get("subjectIds", []),
                    "difficulty": current_prefs.get("difficulty"),
                    "dailyGoal": current_prefs.get("dailyGoal"),
                },
            },
            status=status.HTTP_200_OK,
        )
