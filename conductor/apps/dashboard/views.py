import csv
import io
from datetime import timedelta
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from .analytics_service import AnalyticsService
from .god_mode_service import GodModeService
from drf_spectacular.utils import extend_schema, OpenApiParameter
from apps.courses.models import Course, Enrollment
from apps.core.cache import get_cache_or_compute, CACHE_TIMES, clear_user_cache

@extend_schema(
    description="Get God Mode System Analytics."
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_god_mode_stats(request):
    """
    Super Admin Dashboard Data.
    """
    data = GodModeService.get_global_stats()
    return Response({
        "status": "success",
        "data": data
    })

class DashboardViewSet(viewsets.ViewSet):
    """
    Admin Dashboard Endpoints (Global Stats).
    """
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """ Get system overview stats. Supports date range via ?start=YYYY-MM-DD&end=YYYY-MM-DD """
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        data = AnalyticsService.get_system_overview()

        # If date-range supplied, filter enrollment counts
        if start and end:
            from datetime import datetime
            try:
                start_dt = timezone.make_aware(datetime.strptime(start, '%Y-%m-%d'))
                end_dt = timezone.make_aware(datetime.strptime(end, '%Y-%m-%d'))
                range_enrollments = Enrollment.objects.filter(
                    enrolled_at__range=(start_dt, end_dt)
                ).count()
                data['date_range'] = {'start': start, 'end': end, 'enrollments': range_enrollments}
            except (ValueError, TypeError):
                pass  # Ignore invalid date params

        return Response({"status": "success", "data": data})

    @action(detail=False, methods=['get'])
    def top_courses(self, request):
        """ Get top performing courses. """
        limit = int(request.query_params.get('limit', 5))
        data = AnalyticsService.get_top_courses(limit)
        return Response({"status": "success", "data": data})

    @action(detail=False, methods=['get'])
    def revenue(self, request):
        """ Get revenue statistics. """
        data = AnalyticsService.get_revenue_stats()
        return Response({"status": "success", "data": data})

    @action(detail=False, methods=['get'])
    def engagement(self, request):
        """ Get engagement metrics (XP, levels, top learners). """
        data = AnalyticsService.get_engagement_metrics()
        return Response({"status": "success", "data": data})

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Export analytics data as CSV.

        GET /api/v1/dashboard/dashboard/export-csv/?type=enrollments
        Types: enrollments, revenue, courses
        """
        export_type = request.query_params.get('type', 'enrollments')

        output = io.StringIO()
        writer = csv.writer(output)

        if export_type == 'enrollments':
            writer.writerow(['User', 'Course', 'Enrolled At', 'Progress'])
            enrollments = Enrollment.objects.select_related('user', 'course').all()[:500]
            for e in enrollments:
                writer.writerow([
                    e.user.email,
                    e.course.title if e.course else 'N/A',
                    e.enrolled_at.strftime('%Y-%m-%d') if hasattr(e, 'enrolled_at') and e.enrolled_at else '',
                    f'{getattr(e, "progress", 0)}%',
                ])
        elif export_type == 'courses':
            writer.writerow(['Title', 'Instructor', 'Students', 'Published'])
            courses = Course.objects.select_related('instructor').all()[:500]
            for c in courses:
                writer.writerow([
                    c.title,
                    c.instructor.email if c.instructor else 'N/A',
                    c.enrollment_count,
                    'Yes' if c.is_published else 'No',
                ])
        else:
            writer.writerow(['Type not supported'])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{export_type}_export.csv"'
        return response

class InstructorDashboardViewSet(viewsets.ViewSet):
    """
    Instructor Dashboard (Personal Stats).
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='stats')
    def overview(self, request):
        """ Get instructor specific stats. """
        from django.db.models import Avg
        
        user = request.user
        courses = Course.objects.filter(instructor=user)
        
        total_students = 0
        total_revenue = 0.0
        
        for course in courses:
            count = course.enrollment_count
            total_students += count
            if not course.is_free:
                total_revenue += float(course.price) * count
                
        # Average rating across all instructor's courses
        avg_rating = courses.aggregate(Avg('avg_rating'))['avg_rating__avg'] or 0.0
        
        return Response({
            "status": "success", 
            "data": {
                "total_courses": courses.count(),
                "total_students": total_students,
                "total_revenue": total_revenue,
                "avg_rating": round(avg_rating, 2)
            }
        })

    @action(detail=False, methods=['get'], url_path='revenue')
    def revenue_chart(self, request):
        """ Get 6-month revenue trend. """
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        user = request.user
        courses = Course.objects.filter(instructor=user)
        
        end_date = timezone.now()
        start_date = end_date - relativedelta(months=5)
        start_date = start_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        enrollments = Enrollment.objects.filter(
            course__in=courses,
            enrolled_at__gte=start_date
        ).select_related('course')
        
        revenue_by_month = {}
        for i in range(6):
            dt = end_date - relativedelta(months=i)
            # Use YYYY-MM integer proxy for sorting easily on frontend too
            month_key = dt.strftime("%b %Y") # e.g. Feb 2026
            revenue_by_month[dt.strftime("%Y-%m")] = {"label": month_key, "y": 0.0}

        for e in enrollments:
            m_key = e.enrolled_at.strftime("%Y-%m")
            if m_key in revenue_by_month:
                revenue_by_month[m_key]["y"] += float(e.course.price) if not e.course.is_free else 0.0
                
        # Sort chronologically and format
        data = []
        for key in sorted(revenue_by_month.keys()):
            data.append({"x": revenue_by_month[key]["label"], "y": revenue_by_month[key]["y"]})
        
        return Response({"status": "success", "results": data})

class AnalyticsViewSet(viewsets.ViewSet):
    """
    Legacy/Advanced Analytics Endpoint.
    """
    permission_classes = [IsAdminUser]
    
    def list(self, request):
        return Response({"status": "success", "message": "Use /dashboard/ endpoint."})

    @action(detail=False, methods=['get'])
    def retention(self, request):
        """ Get predictive retention analytics. """
        from .predictive_service import PredictiveService
        data = PredictiveService.get_retention_stats()
        at_risk = PredictiveService.get_at_risk_students(days_inactive=7)[:10] # Top 10
        
        return Response({
            "status": "success",
            "data": {
                "stats": data,
                "at_risk_students": at_risk
            }
        })


# ==========================================================================
# ADVANCED ANALYTICS ENDPOINTS
# ==========================================================================

@extend_schema(
    description="Get home dashboard data for the main landing page."
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_home_dashboard(request):
    """
    Get home dashboard data with featured courses, stats, and recent progress.
    
    Returns:
        - featured_courses: List of featured courses
        - categories: Course categories
        - stats: User statistics
        - recent_progress: Recent learning progress
        - recommendations: Personalized course recommendations
    """
    from apps.courses.serializers import CourseListSerializer, CategorySerializer
    from apps.courses.models import Category
    from apps.users.models import Bookmark
    
    user = request.user
    cache_key = f"dashboard:home:user_{user.id}"
    
    def compute_dashboard_data():
        # Fetch data with optimized queries
        featured_courses = Course.objects.filter(is_featured=True, is_published=True)[:6]
        categories = Category.objects.filter(is_active=True)[:8]
        enrolled_courses = Enrollment.objects.filter(user=user).count()
        completed_courses = Enrollment.objects.filter(user=user, completed_at__isnull=False).count()
        bookmark_count = Bookmark.objects.filter(user=user).count()
        
        # Get recent progress (last 5 enrollments with activity)
        recent_enrollments = Enrollment.objects.filter(user=user).order_by('-last_accessed_at').select_related('course')[:5]
        progress_data = []
        for enrollment in recent_enrollments:
            # We don't have completed_lessons/total_lessons on Enrollment anymore
            # total_lessons comes from course.lessons_count
            total = enrollment.course.lessons_count
            # completed_lessons would need a query to LessonCompletion, but for the dashboard
            # we can approximate or just use 0 if not easily available.
            # To be accurate:
            from apps.courses.models import LessonCompletion
            completed = LessonCompletion.objects.filter(user=user, lesson__module__course=enrollment.course).count()
            
            progress_data.append({
                'course_id': str(enrollment.course.id),
                'course_title': enrollment.course.title,
                'progress_percent': enrollment.progress_percentage,
                'completed_lessons': completed,
                'total_lessons': total,
            })
        
        # Calculate streak (simplified)
        last_week = timezone.now() - timedelta(days=7)
        active_days = Enrollment.objects.filter(
            user=user,
            last_accessed_at__gte=last_week
        ).dates('last_accessed_at', 'day').count()
        
        return {
            'featured_courses': CourseListSerializer(featured_courses, many=True).data,
            'categories': CategorySerializer(categories, many=True).data,
            'stats': {
                'enrolled_courses': enrolled_courses,
                'completed_courses': completed_courses,
                'in_progress_courses': enrolled_courses - completed_courses,
                'bookmarks': bookmark_count,
                'current_streak': active_days,
            },
            'recent_progress': progress_data,
        }
    
    data = get_cache_or_compute(cache_key, compute_dashboard_data, CACHE_TIMES['MEDIUM'])
    
    return Response({'status': 'success', 'data': data})


@extend_schema(
    description="Get personalized learner dashboard data."
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_learner_dashboard(request):
    """
    Get personalized learner dashboard data.
    
    Returns:
        - Overview metrics (courses, XP, progress)
        - Learning velocity trends
        - Skill progress by category
        - Activity heatmap
        - Streak info
        - Achievements progress
        - Quick recommendations
    """
    from .advanced_analytics import AdvancedAnalyticsService
    
    data = AdvancedAnalyticsService.get_learner_dashboard(request.user)
    
    return Response({
        "status": "success",
        "data": data
    })


@extend_schema(
    description="Get comprehensive instructor dashboard."
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_instructor_dashboard_v2(request):
    """
    Get enhanced instructor dashboard with all metrics.
    
    Returns:
        - Overview stats
        - Course performance
        - Revenue analytics
        - Student engagement
        - Review summary
    """
    from .advanced_analytics import AdvancedAnalyticsService
    
    data = AdvancedAnalyticsService.get_instructor_dashboard(request.user)
    
    return Response({
        "status": "success",
        "data": data
    })


@extend_schema(
    description="Get platform-wide metrics for admin."
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_platform_metrics(request):
    """
    Get platform-wide analytics for admin dashboard.
    """
    from .advanced_analytics import AdvancedAnalyticsService
    
    data = AdvancedAnalyticsService.get_platform_metrics()
    
    return Response({
        "status": "success",
        "data": data
    })


# ==========================================================================
# RECOMMENDATION ENGINE ENDPOINTS
# ==========================================================================

@extend_schema(
    description="Get personalized course recommendations."
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations(request):
    """
    Get AI-powered personalized course recommendations.
    
    Uses collaborative filtering + content-based + trending.
    """
    from .advanced_analytics import RecommendationEngine
    
    limit = int(request.query_params.get('limit', 10))
    recommendations = RecommendationEngine.get_personalized_recommendations(
        request.user, limit=limit
    )
    
    return Response({
        "status": "success",
        "data": recommendations
    })


@extend_schema(
    description="Get similar courses to a specific course."
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_similar_courses(request, course_id):
    """
    Get courses similar to a specific course.
    """
    from .advanced_analytics import RecommendationEngine
    
    limit = int(request.query_params.get('limit', 5))
    similar = RecommendationEngine.get_similar_courses(course_id, limit=limit)
    
    return Response({
        "status": "success",
        "data": similar
    })


# ==========================================================================
# CONTENT MODERATION ENDPOINTS
# ==========================================================================

@extend_schema(
    description="Moderate content before publishing."
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def moderate_content(request):
    """
    Check content for moderation before publishing.
    
    Body:
        - content: The text to moderate
        - content_type: Type (discussion, comment, review, chat)
    """
    from apps.core.content_moderation import (
        ContentModerationService, 
        ContentType,
        AutoModerator
    )
    
    content = request.data.get('content', '')
    content_type_str = request.data.get('content_type', 'comment')
    
    try:
        content_type = ContentType(content_type_str)
    except ValueError:
        content_type = ContentType.COMMENT
    
    result = AutoModerator.auto_moderate(
        content=content,
        content_type=content_type,
        user=request.user,
        auto_action=False  # Don't take action, just return result
    )
    
    return Response({
        "status": "success",
        "data": result
    })


@extend_schema(
    description="Get user content reputation score."
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_content_reputation(request):
    """
    Get the authenticated user's content reputation.
    """
    from apps.core.content_moderation import ContentModerationService
    
    reputation = ContentModerationService.get_user_reputation(str(request.user.id))
    
    return Response({
        "status": "success",
        "data": reputation
    })


# ==========================================================================
# LEARNING STREAK ENDPOINT
# ==========================================================================

@extend_schema(
    description="Get learning streak info for authenticated user."
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_learning_streak(request):
    """
    Get the user's current and longest learning streak.

    Returns:
        - current_streak: days in current streak
        - longest_streak: best all-time streak
        - today_active: whether user has activity today
        - last_activity: timestamp of last learning activity
    """
    from apps.courses.models import Enrollment

    # Find days user has at least one lesson/enrollment activity
    enrollments = Enrollment.objects.filter(user=request.user).order_by('-enrolled_at')

    if not enrollments.exists():
        return Response({
            "status": "success",
            "data": {
                "current_streak": 0,
                "longest_streak": 0,
                "today_active": False,
                "last_activity": None,
            }
        })

    # Simple streak calculation based on enrollment dates
    today = timezone.now().date()
    dates = set()
    for e in enrollments:
        if hasattr(e, 'enrolled_at') and e.enrolled_at:
            dates.add(e.enrolled_at.date())
        if hasattr(e, 'updated_at') and e.updated_at:
            dates.add(e.updated_at.date())

    sorted_dates = sorted(dates, reverse=True)
    today_active = today in dates

    # Calculate current streak
    current_streak = 0
    check_date = today
    for _ in range(365):
        if check_date in dates:
            current_streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    # Calculate longest streak
    longest_streak = 0
    streak = 0
    for i, d in enumerate(sorted_dates):
        if i == 0:
            streak = 1
        elif (sorted_dates[i - 1] - d).days == 1:
            streak += 1
        else:
            longest_streak = max(longest_streak, streak)
            streak = 1
    longest_streak = max(longest_streak, streak)

    return Response({
        "status": "success",
        "data": {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "today_active": today_active,
            "last_activity": sorted_dates[0].isoformat() if sorted_dates else None,
        }
    })
