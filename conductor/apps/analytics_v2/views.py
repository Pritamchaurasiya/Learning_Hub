"""Analytics v2 API views."""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import TopicPerformance, ExamPerformance, PerformanceTrend, AIRecommendation
from .serializers import (
    TopicPerformanceSerializer,
    ExamPerformanceSerializer,
    PerformanceTrendSerializer,
    AIRecommendationSerializer,
    DashboardSerializer,
)
from .services import AnalyticsEngine


@extend_schema(tags=['Analytics V2'])
class AnalyticsViewSet(viewsets.ViewSet):
    """
    Analytics endpoints.
    GET /api/v1/analytics/dashboard/ - Overall performance dashboard
    GET /api/v1/analytics/topics/ - Topic-level performance
    GET /api/v1/analytics/exams/ - Exam-level performance
    GET /api/v1/analytics/trends/ - Performance trends over time
    GET /api/v1/analytics/weak-areas/ - Identified weak areas
    GET /api/v1/analytics/recommendations/ - AI recommendations
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(description='Overall performance dashboard')
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get comprehensive performance dashboard."""
        exam_id = request.query_params.get('exam_id')
        data = AnalyticsEngine.get_dashboard(request.user, exam_id)
        return Response({'status': 'success', 'data': data})

    @extend_schema(description='Topic-level performance')
    @action(detail=False, methods=['get'])
    def topics(self, request):
        """Get topic-level performance breakdown."""
        exam_id = request.query_params.get('exam_id')
        performances = TopicPerformance.objects.filter(
            user=request.user, total_attempts__gte=1
        ).select_related('topic', 'topic__subject', 'topic__subject__exam').order_by('-accuracy')

        if exam_id:
            performances = performances.filter(topic__subject__exam_id=exam_id)

        serializer = TopicPerformanceSerializer(performances, many=True)
        return Response({'status': 'success', 'data': serializer.data})

    @extend_schema(description='Exam-level performance')
    @action(detail=False, methods=['get'])
    def exams(self, request):
        """Get exam-level performance summary."""
        performances = ExamPerformance.objects.filter(
            user=request.user, total_tests_taken__gte=1
        ).select_related('exam', 'exam__country').order_by('-avg_percentage')

        serializer = ExamPerformanceSerializer(performances, many=True)
        return Response({'status': 'success', 'data': serializer.data})

    @extend_schema(description='Performance trends over time')
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """Get performance trends for charting."""
        exam_id = request.query_params.get('exam_id')
        period = request.query_params.get('period', 'daily')
        days = int(request.query_params.get('days', 30))

        cutoff = request.query_params.get('cutoff')
        if not cutoff:
            from datetime import timedelta
            from django.utils import timezone
            cutoff = (timezone.now() - timedelta(days=days)).date()

        trends = PerformanceTrend.objects.filter(
            user=request.user,
            date__gte=cutoff,
            period=period,
        )

        if exam_id:
            trends = trends.filter(exam_id=exam_id)

        serializer = PerformanceTrendSerializer(trends.order_by('date'), many=True)
        return Response({'status': 'success', 'data': serializer.data})

    @extend_schema(description='Identified weak areas')
    @action(detail=False, methods=['get'])
    def weak_areas(self, request):
        """Get topics that need improvement."""
        exam_id = request.query_params.get('exam_id')
        weak_areas = AnalyticsEngine._get_weak_areas(request.user, exam_id, limit=10)
        return Response({'status': 'success', 'data': weak_areas})

    @extend_schema(description='AI recommendations')
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """Get personalized AI recommendations."""
        exam_id = request.query_params.get('exam_id')
        recommendations = AnalyticsEngine._get_active_recommendations(request.user, exam_id, limit=10)
        return Response({'status': 'success', 'data': recommendations})

    @extend_schema(description='Dismiss a recommendation')
    @action(detail=False, methods=['post'])
    def dismiss_recommendation(self, request):
        """Dismiss a recommendation."""
        rec_id = request.data.get('recommendation_id')
        if not rec_id:
            return Response({'status': 'error', 'message': 'recommendation_id required'}, status=400)

        try:
            rec = AIRecommendation.objects.get(id=rec_id, user=request.user)
            rec.is_dismissed = True
            rec.save()
            return Response({'status': 'success'})
        except AIRecommendation.DoesNotExist:
            return Response({'status': 'error', 'message': 'Recommendation not found'}, status=404)

    @extend_schema(description='Mark recommendation as actioned')
    @action(detail=False, methods=['post'])
    def action_recommendation(self, request):
        """Mark a recommendation as actioned."""
        rec_id = request.data.get('recommendation_id')
        if not rec_id:
            return Response({'status': 'error', 'message': 'recommendation_id required'}, status=400)

        try:
            rec = AIRecommendation.objects.get(id=rec_id, user=request.user)
            rec.is_actioned = True
            from django.utils import timezone
            rec.actioned_at = timezone.now()
            rec.save()
            return Response({'status': 'success'})
        except AIRecommendation.DoesNotExist:
            return Response({'status': 'error', 'message': 'Recommendation not found'}, status=404)
