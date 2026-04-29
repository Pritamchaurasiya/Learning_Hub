from .repositories import ProblemRepository
from rest_framework.pagination import PageNumberPagination
from rest_framework import viewsets, permissions, mixins
from rest_framework.decorators import action
from .models import Submission, Tag
from .serializers import ProblemListSerializer, ProblemDetailSerializer, SubmissionSerializer, TagSerializer


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProblemViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProblemDetailSerializer
        return ProblemListSerializer

    def get_queryset(self):
        # Use Repository Pattern
        difficulty = self.request.query_params.get('difficulty')
        tag = self.request.query_params.get('tag')
        search = self.request.query_params.get('search')

        return ProblemRepository.get_list_queryset(
            difficulty=difficulty,
            tag_slug=tag,
            search=search
        )

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def hint(self, request, slug=None):
        """Get an adaptive AI hint for this problem."""
        from .services import DsaService
        hint = DsaService.get_ai_hint(request.user, slug)
        return viewsets.Response({'status': 'success', 'hint': hint})


class SubmissionViewSet(mixins.CreateModelMixin,
                        mixins.ListModelMixin,
                        mixins.RetrieveModelMixin,
                        viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubmissionSerializer
    pagination_class = StandardResultsSetPagination
    throttle_scope = 'dsa_submission'

    def get_queryset(self):
        # Optimization: Select related problem to avoid N+1
        return Submission.objects.filter(user=self.request.user).select_related('problem').order_by('-submitted_at')

    def create(self, request, *args, **kwargs):
        from .schemas import SubmissionSchema
        from pydantic import ValidationError
        from rest_framework import status
        from rest_framework.response import Response

        try:
            # Enforces 50KB maximal string bound exactly
            SubmissionSchema(**request.data)
        except ValidationError as e:
            return Response(
                {"status": "error", "message": "Invalid request topology", "details": e.errors()},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Pydantic has already evaluated code length statically prior to this model instantiation.
        # Auto-assign user.
        submission = serializer.save(user=self.request.user)

        # Trigger evaluation asynchronously
        self._evaluate_submission(submission)

    def _evaluate_submission(self, submission):
        """
        Evaluate submission asynchronously using Celery.
        """
        from .tasks import evaluate_submission_task
        evaluate_submission_task.delay(submission.id)
