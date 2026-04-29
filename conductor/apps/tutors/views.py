"""
Tutors views — Phase 11 Enhancement.

Provides:
- TutorViewSet: list verified tutors, search by skills/name, top_rated action
- BookingViewSet: full lifecycle (create, confirm, cancel, complete, upcoming)
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

from .models import TutorProfile, Booking
from .serializers import TutorProfileSerializer, BookingSerializer


@extend_schema(tags=["Tutors"])
class TutorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and retrieve verified tutor profiles.

    GET  /tutors/           — all verified tutors
    GET  /tutors/{id}/      — single tutor
    GET  /tutors/top_rated/ — tutors sorted by rating
    """

    queryset = TutorProfile.objects.filter(is_verified=True).select_related("user")
    serializer_class = TutorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ["skills", "user__first_name", "user__last_name"]
    ordering_fields = ["rating", "total_reviews", "hourly_rate"]
    ordering = ["-rating"]

    @extend_schema(description="Get top-rated tutors.")
    @action(detail=False, methods=["get"])
    def top_rated(self, request):
        """Return tutors sorted by rating descending, min 1 review."""
        limit = min(int(request.query_params.get("limit", 10)), 50)
        tutors = (
            self.get_queryset()
            .filter(total_reviews__gte=1)
            .order_by("-rating", "-total_reviews")
        )[:limit]
        serializer = self.get_serializer(tutors, many=True)
        return Response({"status": "success", "data": serializer.data})


@extend_schema(tags=["Tutors"])
class BookingViewSet(viewsets.ModelViewSet):
    """
    Manage tutor bookings with full lifecycle.

    list:     GET  /bookings/               — user's bookings
    create:   POST /bookings/               — create booking
    confirm:  POST /bookings/{id}/confirm/  — tutor confirms
    cancel:   POST /bookings/{id}/cancel/   — cancel with reason
    complete: POST /bookings/{id}/complete/ — mark completed
    upcoming: GET  /bookings/upcoming/      — future confirmed bookings
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status"]
    ordering_fields = ["start_time"]
    ordering = ["-start_time"]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, "tutor_profile"):
            return Booking.objects.filter(
                models.Q(student=user) | models.Q(tutor=user.tutor_profile)
            ).select_related("student", "tutor", "tutor__user")
        return Booking.objects.filter(student=user).select_related(
            "student", "tutor", "tutor__user"
        )

    def perform_create(self, serializer):
        from django.db import transaction
        from rest_framework.exceptions import ValidationError
        
        tutor = serializer.validated_data.get('tutor')
        start_time = serializer.validated_data.get('start_time')
        end_time = serializer.validated_data.get('end_time')
        
        if start_time >= end_time:
            raise ValidationError({"error": "Start time must be before end time."})
            
        with transaction.atomic():
            # Pessimistic Locking: Lock the tutor profile row until the transaction completes.
            # This serializes concurrent booking requests, 100% preventing double-booking race conditions.
            from .models import TutorProfile
            locked_tutor = TutorProfile.objects.select_for_update().get(id=tutor.id)
            
            # Check for overlapping active bookings (Pending or Confirmed)
            overlapping = Booking.objects.filter(
                tutor=locked_tutor,
                status__in=['pending', 'confirmed'],
                start_time__lt=end_time,
                end_time__gt=start_time
            ).exists()
            
            if overlapping:
                raise ValidationError({"error": "This time slot has already been booked."})
                
            serializer.save(student=self.request.user)

    @extend_schema(description="Tutor confirms a pending booking.")
    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """Tutor confirms a booking — only the assigned tutor can confirm."""
        from django.db import transaction
        
        with transaction.atomic():
            # Use pessimistic locking to prevent race conditions during state transition
            booking = Booking.objects.select_for_update().get(pk=self.get_object().pk)

            if not hasattr(request.user, "tutor_profile") or booking.tutor != request.user.tutor_profile:
                return Response(
                    {"status": "error", "message": "Only the assigned tutor can confirm"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if booking.status != "pending":
                return Response(
                    {"status": "error", "message": f"Cannot confirm a {booking.status} booking"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            booking.status = "confirmed"
            booking.save(update_fields=["status", "updated_at"])
            
        return Response({
            "status": "success",
            "message": "Booking confirmed",
            "data": BookingSerializer(booking).data,
        })

    @extend_schema(description="Cancel a booking with optional reason.")
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a booking — student or tutor can cancel."""
        from django.db import transaction

        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=self.get_object().pk)

            if booking.status in ("cancelled", "completed"):
                return Response(
                    {"status": "error", "message": f"Cannot cancel a {booking.status} booking"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            reason = request.data.get("reason", "")
            if not isinstance(reason, str):
                reason = "Invalid reason format."
                
            booking.status = "cancelled"
            booking.notes = f"{booking.notes or ''}\n[Cancelled] {reason}".strip()
            booking.save(update_fields=["status", "notes", "updated_at"])
            
        return Response({
            "status": "success",
            "message": "Booking cancelled",
            "data": BookingSerializer(booking).data,
        })

    @extend_schema(description="Mark a booking as completed.")
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark booking as completed — only tutor can complete."""
        from django.db import transaction

        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=self.get_object().pk)

            if not hasattr(request.user, "tutor_profile") or booking.tutor != request.user.tutor_profile:
                return Response(
                    {"status": "error", "message": "Only the tutor can mark as completed"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if booking.status != "confirmed":
                return Response(
                    {"status": "error", "message": "Only confirmed bookings can be completed"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            booking.status = "completed"
            booking.save(update_fields=["status", "updated_at"])
            
        return Response({
            "status": "success",
            "message": "Booking completed",
            "data": BookingSerializer(booking).data,
        })

    @extend_schema(description="Get upcoming confirmed bookings.")
    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """Return future confirmed bookings for the user."""
        bookings = (
            self.get_queryset()
            .filter(status="confirmed", start_time__gte=timezone.now())
            .order_by("start_time")
        )[:20]
        serializer = self.get_serializer(bookings, many=True)
        return Response({"status": "success", "data": serializer.data})
