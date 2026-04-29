"""
Live Sessions views — Phase 11 Enhancement.

Provides:
- LiveSessionViewSet with join, leave, upcoming, past, my_sessions, cancel
- Search across title/description
- Ordering by scheduled_time
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import timedelta
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from drf_spectacular.utils import extend_schema

from .models import LiveSession, SessionAttendee
from .serializers import LiveSessionSerializer
from rest_framework.pagination import PageNumberPagination


class SessionPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


@extend_schema(tags=["Live Sessions"])
class LiveSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Live session management.

    list:        GET  /sessions/                  — upcoming/live sessions
    join:        POST /sessions/{id}/join/         — register attendance
    leave:       POST /sessions/{id}/leave/        — unregister
    upcoming:    GET  /sessions/upcoming/          — scheduled-only sessions
    past:        GET  /sessions/past/              — ended sessions user attended
    my_sessions: GET  /sessions/my_sessions/       — sessions hosted by user
    cancel:      POST /sessions/{id}/cancel/       — host cancels session
    """

    serializer_class = LiveSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = SessionPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["scheduled_time", "duration_minutes"]
    ordering = ["-scheduled_time"]

    def get_queryset(self):
        return (
            LiveSession.objects.select_related("host", "course")
            .prefetch_related("attendees")
            .filter(
                scheduled_time__gte=timezone.now() - timedelta(hours=2)
            )
            .exclude(status="cancelled")
        )

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------

    @extend_schema(description="Register attendance for a session.")
    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        """Register attendance for a live session."""
        session = self.get_object()

        if session.status == "ended":
            return Response(
                {"status": "error", "message": "Session has ended"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _, created = SessionAttendee.objects.get_or_create(
            session=session, user=request.user
        )

        msg = "Joined successfully" if created else "Already joined"
        return Response({
            "status": "success",
            "message": msg,
            "data": {"meeting_url": session.meeting_url},
        })

    @extend_schema(description="Leave a session you joined.")
    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        """Remove attendance from a session."""
        session = self.get_object()
        deleted, _ = SessionAttendee.objects.filter(
            session=session, user=request.user
        ).delete()

        if deleted:
            return Response({"status": "success", "message": "Left session"})
        return Response(
            {"status": "error", "message": "Not registered for this session"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @extend_schema(description="Get upcoming scheduled sessions.")
    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """Scheduled sessions that haven't started yet."""
        sessions = (
            LiveSession.objects.filter(
                status="scheduled",
                scheduled_time__gte=timezone.now(),
            )
            .select_related("host", "course")
            .order_by("scheduled_time")
        )
        page = self.paginate_queryset(sessions)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(sessions, many=True)
        return Response({"status": "success", "data": serializer.data})

    @extend_schema(description="Get past ended sessions the user attended.")
    @action(detail=False, methods=["get"])
    def past(self, request):
        """Past sessions the user attended."""
        sessions = (
            LiveSession.objects.filter(
                status="ended",
                attendees__user=request.user,
            )
            .select_related("host", "course")
            .order_by("-scheduled_time")
        )
        page = self.paginate_queryset(sessions)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(sessions, many=True)
        return Response({"status": "success", "data": serializer.data})

    @extend_schema(description="Get sessions hosted by the current user.")
    @action(detail=False, methods=["get"])
    def my_sessions(self, request):
        """Sessions the current user is hosting."""
        sessions = (
            LiveSession.objects.filter(host=request.user)
            .select_related("host", "course")
            .order_by("-scheduled_time")
        )
        page = self.paginate_queryset(sessions)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(sessions, many=True)
        return Response({"status": "success", "data": serializer.data})

    @extend_schema(description="Host cancels a session.")
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a session — host only."""
        session = self.get_object()

        if session.host != request.user:
            return Response(
                {"status": "error", "message": "Only the host can cancel"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if session.status in ("ended", "cancelled"):
            return Response(
                {"status": "error", "message": f"Cannot cancel a {session.status} session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.status = "cancelled"
        session.save(update_fields=["status", "updated_at"])
        return Response({
            "status": "success",
            "message": "Session cancelled",
            "data": LiveSessionSerializer(session).data,
        })
