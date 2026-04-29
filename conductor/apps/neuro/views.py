from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
import logging

from apps.courses.models import Course, Lesson
from .models import BrainwaveSession

logger = logging.getLogger(__name__)

class NeuroTelemetryViewSet(viewsets.ViewSet):
    """
    High-frequency API to ingest BCI (Brain-Computer Interface) data.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='ingest')
    def ingest_telemetry(self, request):
        """
        Receives batches of brainwave telemetry (Alpha, Beta, Theta, Gamma, Delta).
        Triggered client-side every few seconds.
        """
        course_id = request.data.get('course_id')
        lesson_id = request.data.get('lesson_id')
        telemetry_batch = request.data.get('telemetry', []) # List of dicts
        
        if not all([course_id, lesson_id, telemetry_batch]):
            return Response({"error": "course_id, lesson_id, and telemetry required."}, status=status.HTTP_400_BAD_REQUEST)
            
        course = get_object_or_404(Course, id=course_id)
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        # Get or create active session
        session, created = BrainwaveSession.objects.get_or_create(
            user=request.user,
            course=course,
            lesson=lesson,
            is_completed=False
        )
        
        # Append to raw payload (Caution: In prod this grows infinitely, use TSDB)
        session.raw_telemetry.extend(telemetry_batch)
        
        # Calculate moving averages for the adaptive feedback loop
        total_attention = 0
        samples = len(telemetry_batch)
        
        # Simulate simple Attention proxy: (Beta / Alpha)
        for point in telemetry_batch:
            alpha = point.get('alpha', 0.1)
            beta = point.get('beta', 0.1)
            # Avoid DivisionByZero
            if alpha == 0: alpha = 0.1
            attention_proxy = beta / alpha
            total_attention += attention_proxy
            
        avg_batch_attention = total_attention / (samples if samples > 0 else 1)
        
        # Update rolling average
        # (Very simplified math for prototype)
        session.avg_attention = (session.avg_attention + avg_batch_attention) / 2
        session.save()
        
        # Trigger Adaptive Learning Curriculum Change
        if session.avg_attention > 1.5:
            # High Beta/Alpha = Stressed / Overwhelmed. Suggest easier content.
            adaptive_action = "SUGGEST_REVIEW"
            logger.info(f"User {request.user.id} is Stressed. Triggering Review Material.")
        elif session.avg_attention < 0.5:
            # Low Beta/Alpha = Bored / Tuned out. Suggest skipping ahead.
            adaptive_action = "SUGGEST_SKIP"
            logger.info(f"User {request.user.id} is Bored. Triggering Curriculum Skip.")
        else:
            adaptive_action = "MAINTAIN_PACE"
            
        return Response({
            "status": "ingested", 
            "samples_processed": samples,
            "current_attention_index": session.avg_attention,
            "adaptive_action": adaptive_action
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='end-session')
    def end_session(self, request):
        """Marks the session as complete."""
        session_id = request.data.get('session_id')
        session = get_object_or_404(BrainwaveSession, id=session_id, user=request.user)
        session.is_completed = True
        session.save()
        return Response({"status": "session_ended"})
