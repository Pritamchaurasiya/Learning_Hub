"""
Support / Feedback views — Phase 11 Enhancement.

Provides:
- Full CRUD with filtering by category, is_resolved
- SearchFilter on subject + message
- Ordering by created_at
- resolve action (admin/staff marks resolved + adds response)
- stats action (ticket counts grouped by category and resolution status)
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

from .models import Feedback
from .serializers import FeedbackSerializer


@extend_schema(tags=["Support"])
class FeedbackViewSet(viewsets.ModelViewSet):
    """
    API endpoint for user feedback and support tickets.

    list:   GET  /api/v1/support/            — all user's tickets (filterable)
    create: POST /api/v1/support/            — create new ticket
    read:   GET  /api/v1/support/{id}/       — single ticket
    resolve: POST /api/v1/support/{id}/resolve/  — mark as resolved (staff only)
    stats:  GET  /api/v1/support/stats/      — aggregate stats (staff only)
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FeedbackSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "status"]
    search_fields = ["subject", "message"]
    ordering_fields = ["created_at", "category"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Feedback.objects.all()
        return Feedback.objects.filter(user=user)

    def perform_create(self, serializer):
        # Save ticket immediately so the user doesn't wait
        ticket = serializer.save(user=self.request.user)
        
        # Fire off an asynchronous Celery task to perform AI Triage on the exact text.
        # This will calculate urgency, assign a status, and draft an AI response,
        # moving the ticket through its State Machine automatically.
        from apps.support.tasks import auto_triage_support_ticket
        auto_triage_support_ticket.delay(ticket.id)

    @extend_schema(description="Mark a ticket as resolved with an admin response.")
    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def resolve(self, request, pk=None):
        """Admin resolves a ticket with optional response text."""
        ticket = self.get_object()

        if ticket.status in ['resolved', 'closed']:
            return Response(
                {"status": "error", "message": f"Already {ticket.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        admin_response = request.data.get("admin_response", "")
        ticket.status = "resolved"
        ticket.admin_response = admin_response
        ticket.save(update_fields=["status", "admin_response", "updated_at"])

        return Response({
            "status": "success",
            "message": "Ticket resolved",
            "data": FeedbackSerializer(ticket).data,
        })

    @extend_schema(description="Get support ticket statistics (staff only).")
    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAdminUser])
    def stats(self, request):
        """Aggregate ticket statistics in a single optimized DB query."""
        from django.db.models import Case, When, IntegerField, Value

        qs = Feedback.objects.all()

        # Single aggregate query instead of 5 separate counts
        agg = qs.aggregate(
            total=Count("id"),
            open_count=Count("id", filter=Q(status='open')),
            in_progress_count=Count("id", filter=Q(status='in_progress')),
            resolved_count=Count("id", filter=Q(status__in=['resolved', 'closed'])),
            critical_count=Count("id", filter=Q(urgency_score__gte=8, status__in=['open', 'in_progress'])),
        )

        by_category = list(
            qs.values("category")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response({
            "status": "success",
            "data": {
                "total": agg["total"],
                "open": agg["open_count"],
                "in_progress": agg["in_progress_count"],
                "resolved": agg["resolved_count"],
                "critical_backlog": agg["critical_count"],
                "by_category": by_category,
            },
        })

    def list(self, request, *args, **kwargs):
        """Override list to wrap in standard response format."""
        response = super().list(request, *args, **kwargs)
        return Response({
            "status": "success",
            "data": response.data,
        })

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to wrap in standard response format."""
        response = super().retrieve(request, *args, **kwargs)
        return Response({
            "status": "success",
            "data": response.data,
        })

    def create(self, request, *args, **kwargs):
        """Override create for consistent response format."""
        response = super().create(request, *args, **kwargs)
        return Response(
            {"status": "success", "data": response.data},
            status=status.HTTP_201_CREATED,
        )
