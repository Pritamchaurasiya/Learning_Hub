"""
Analytics API views for comprehensive reporting.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Avg, Sum, Q, F
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta, datetime
from apps.courses.models import Course, Enrollment, Review, Category
from apps.users.models import User
from apps.payments.models import Payment
import logging

logger = logging.getLogger(__name__)

CACHE_TTL = 300  # 5 minutes


@api_view(['GET'])
@permission_classes([IsAdminUser])
def dashboard_stats(request):
    """
    Admin dashboard statistics.
    Returns overview metrics for the admin dashboard.
    """
    cache_key = "analytics:dashboard_stats"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)
    
    today = timezone.now()
    last_30_days = today - timedelta(days=30)
    last_7_days = today - timedelta(days=7)
    
    stats = {
        'overview': {
            'total_users': User.objects.count(),
            'total_courses': Course.objects.filter(is_published=True).count(),
            'total_enrollments': Enrollment.objects.count(),
            'total_revenue': Payment.objects.filter(
                status='completed'
            ).aggregate(total=Sum('amount'))['total'] or 0,
        },
        'recent_activity': {
            'new_users_30d': User.objects.filter(
                date_joined__gte=last_30_days
            ).count(),
            'new_enrollments_30d': Enrollment.objects.filter(
                created_at__gte=last_30_days
            ).count(),
            'new_courses_30d': Course.objects.filter(
                is_published=True,
                created_at__gte=last_30_days
            ).count(),
            'revenue_30d': Payment.objects.filter(
                status='completed',
                created_at__gte=last_30_days
            ).aggregate(total=Sum('amount'))['total'] or 0,
        },
        'active_users': {
            'daily_active': User.objects.filter(
                last_login__date=today.date()
            ).count(),
            'weekly_active': User.objects.filter(
                last_login__gte=last_7_days
            ).count(),
            'monthly_active': User.objects.filter(
                last_login__gte=last_30_days
            ).count(),
        },
        'top_courses': Course.objects.filter(
            is_published=True
        ).annotate(
            enrollment_count=Count('enrollments')
        ).order_by('-enrollment_count')[:5].values(
            'id', 'title', 'enrollment_count', 'average_rating'
        ),
        'top_instructors': User.objects.filter(
            is_instructor=True
        ).annotate(
            course_count=Count('courses'),
            total_enrollments=Count('courses__enrollments')
        ).order_by('-total_enrollments')[:5].values(
            'id', 'username', 'course_count', 'total_enrollments'
        ),
    }
    
    cache.set(cache_key, stats, CACHE_TTL)
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def course_analytics(request):
    """
    Detailed course performance analytics.
    
    Query params:
    - period: day, week, month, year
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    """
    period = request.GET.get('period', 'month')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    # Default date range
    if not end_date:
        end_date = timezone.now()
    else:
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    
    if not start_date:
        if period == 'day':
            start_date = end_date - timedelta(days=1)
        elif period == 'week':
            start_date = end_date - timedelta(weeks=1)
        elif period == 'month':
            start_date = end_date - timedelta(days=30)
        else:  # year
            start_date = end_date - timedelta(days=365)
    else:
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    
    # Course statistics
    courses = Course.objects.filter(is_published=True)
    
    analytics = {
        'period': period,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'summary': {
            'total_courses': courses.count(),
            'new_courses': courses.filter(
                created_at__range=[start_date, end_date]
            ).count(),
            'total_enrollments': Enrollment.objects.filter(
                created_at__range=[start_date, end_date]
            ).count(),
            'average_rating': Review.objects.filter(
                created_at__range=[start_date, end_date]
            ).aggregate(avg=Avg('rating'))['avg'] or 0,
        },
        'by_category': Category.objects.filter(
            is_active=True
        ).annotate(
            course_count=Count('courses'),
            enrollment_count=Count('courses__enrollments'),
            avg_rating=Avg('courses__average_rating')
        ).values('name', 'course_count', 'enrollment_count', 'avg_rating'),
        'by_level': courses.values('level').annotate(
            count=Count('id'),
            avg_enrollments=Avg('enrollments')
        ),
        'performance': courses.annotate(
            enrollment_count=Count('enrollments'),
            review_count=Count('reviews'),
            avg_rating=Avg('reviews__rating')
        ).order_by('-enrollment_count')[:10].values(
            'id', 'title', 'enrollment_count', 'review_count', 'avg_rating'
        ),
    }
    
    return Response(analytics)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_analytics(request):
    """
    User engagement and behavior analytics.
    """
    period = request.GET.get('period', '30d')
    
    # Calculate date range
    end_date = timezone.now()
    if period == '7d':
        start_date = end_date - timedelta(days=7)
    elif period == '30d':
        start_date = end_date - timedelta(days=30)
    elif period == '90d':
        start_date = end_date - timedelta(days=90)
    else:  # 1y
        start_date = end_date - timedelta(days=365)
    
    users = User.objects.all()
    
    analytics = {
        'period': period,
        'summary': {
            'total_users': users.count(),
            'new_users': users.filter(
                date_joined__range=[start_date, end_date]
            ).count(),
            'active_users': users.filter(
                last_login__range=[start_date, end_date]
            ).count(),
            'instructors': users.filter(is_instructor=True).count(),
        },
        'by_date': users.filter(
            date_joined__range=[start_date, end_date]
        ).annotate(
            date=TruncDate('date_joined')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date'),
        'engagement': {
            'enrollments_per_user': Enrollment.objects.filter(
                created_at__range=[start_date, end_date]
            ).count() / max(users.count(), 1),
            'reviews_per_user': Review.objects.filter(
                created_at__range=[start_date, end_date]
            ).count() / max(users.count(), 1),
            'completion_rate': Enrollment.objects.filter(
                created_at__range=[start_date, end_date],
                progress_percent=100
            ).count() / max(Enrollment.objects.filter(
                created_at__range=[start_date, end_date]
            ).count(), 1) * 100,
        },
        'retention': {
            'day_1': calculate_retention(1, start_date, end_date),
            'day_7': calculate_retention(7, start_date, end_date),
            'day_30': calculate_retention(30, start_date, end_date),
        },
    }
    
    return Response(analytics)


def calculate_retention(days, start_date, end_date):
    """Calculate user retention rate."""
    cohort_start = end_date - timedelta(days=days)
    cohort_users = User.objects.filter(
        date_joined__range=[cohort_start, end_date]
    )
    
    if not cohort_users.exists():
        return 0
    
    retained = cohort_users.filter(
        last_login__gte=end_date - timedelta(days=1)
    ).count()
    
    return (retained / cohort_users.count()) * 100


@api_view(['GET'])
@permission_classes([IsAdminUser])
def revenue_analytics(request):
    """
    Revenue and payment analytics.
    """
    period = request.GET.get('period', 'month')
    
    end_date = timezone.now()
    if period == 'week':
        start_date = end_date - timedelta(weeks=1)
        trunc_func = TruncDate
    elif period == 'month':
        start_date = end_date - timedelta(days=30)
        trunc_func = TruncDate
    elif period == 'quarter':
        start_date = end_date - timedelta(days=90)
        trunc_func = TruncWeek
    else:  # year
        start_date = end_date - timedelta(days=365)
        trunc_func = TruncMonth
    
    payments = Payment.objects.filter(
        status='completed',
        created_at__range=[start_date, end_date]
    )
    
    analytics = {
        'period': period,
        'summary': {
            'total_revenue': payments.aggregate(
                total=Sum('amount')
            )['total'] or 0,
            'total_transactions': payments.count(),
            'average_transaction': payments.aggregate(
                avg=Avg('amount')
            )['avg'] or 0,
            'refunds': Payment.objects.filter(
                status='refunded',
                created_at__range=[start_date, end_date]
            ).aggregate(total=Sum('amount'))['total'] or 0,
        },
        'by_date': payments.annotate(
            date=trunc_func('created_at')
        ).values('date').annotate(
            revenue=Sum('amount'),
            transactions=Count('id')
        ).order_by('date'),
        'by_course': payments.values(
            'course__title'
        ).annotate(
            revenue=Sum('amount'),
            enrollments=Count('id')
        ).order_by('-revenue')[:10],
    }
    
    return Response(analytics)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def engagement_analytics(request):
    """
    Platform engagement metrics — all values computed from real data.
    """
    end_date = timezone.now()
    start_date = end_date - timedelta(days=30)
    
    # Real session tracking from UserSession model
    from apps.users.models import UserSession
    sessions = UserSession.objects.filter(
        created_at__range=[start_date, end_date],
        is_active=False  # Completed sessions
    )
    
    session_durations = sessions.values_list('duration_seconds', flat=True)
    avg_session_duration = (
        sum(session_durations) / len(session_durations) / 60
        if session_durations else 0
    )
    
    total_sessions = sessions.count()
    single_page_sessions = sessions.filter(pages_viewed=1).count()
    bounce_rate = round((single_page_sessions / total_sessions * 100) if total_sessions > 0 else 0, 2)
    avg_pages = round(
        sessions.aggregate(avg=Avg('pages_viewed'))['avg'] or 0, 2
    )
    
    # Real activity-based peak hours
    from apps.core.models import ActivityLog
    peak_hours_data = (
        ActivityLog.objects.filter(
            created_at__range=[start_date, end_date]
        )
        .extra({'hour': "EXTRACT(HOUR FROM created_at)"})
        .values('hour')
        .annotate(activity_count=Count('id'))
        .order_by('hour')
    )
    
    peak_hours = [
        {'hour': int(p['hour']), 'activity': p['activity_count']}
        for p in peak_hours_data
    ]
    
    # Real discussion/comment counts
    from apps.discussions.models import Thread, Comment
    discussions_count = Thread.objects.filter(
        created_at__range=[start_date, end_date]
    ).count()
    comments_count = Comment.objects.filter(
        created_at__range=[start_date, end_date]
    ).count()
    
    analytics = {
        'time_range': '30d',
        'metrics': {
            'avg_session_duration': round(avg_session_duration, 2),
            'pages_per_session': avg_pages,
            'bounce_rate': bounce_rate,
        },
        'course_engagement': {
            'lessons_started': Enrollment.objects.filter(
                created_at__range=[start_date, end_date]
            ).count(),
            'lessons_completed': Enrollment.objects.filter(
                completed_at__range=[start_date, end_date]
            ).count(),
            'average_progress': Enrollment.objects.filter(
                created_at__range=[start_date, end_date]
            ).aggregate(avg=Avg('progress_percent'))['avg'] or 0,
        },
        'social_engagement': {
            'reviews_submitted': Review.objects.filter(
                created_at__range=[start_date, end_date]
            ).count(),
            'discussions_created': discussions_count,
            'comments_posted': comments_count,
        },
        'peak_hours': peak_hours,
    }
    
    return Response(analytics)


def calculate_avg_session_duration(start_date, end_date):
    """Calculate average session duration from real data."""
    from apps.users.models import UserSession
    sessions = UserSession.objects.filter(
        created_at__range=[start_date, end_date],
        is_active=False
    )
    durations = sessions.values_list('duration_seconds', flat=True)
    if not durations:
        return 0
    return round(sum(durations) / len(durations) / 60, 2)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def generate_report(request):
    """
    Generate custom analytics report.
    
    Request body:
    - report_type: users, courses, revenue, engagement
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - format: json, csv, pdf
    """
    report_type = request.data.get('report_type', 'users')
    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')
    format_type = request.data.get('format', 'json')
    
    # Validate dates
    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    except (ValueError, TypeError):
        return Response({
            'error': 'Invalid date format. Use YYYY-MM-DD'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate report ID
    import uuid
    report_id = str(uuid.uuid4())
    
    # Store report metadata
    cache.set(f"report:{report_id}", {
        'report_type': report_type,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'format': format_type,
        'status': 'generating',
        'created_at': timezone.now().isoformat(),
    }, 3600)
    
    # TODO: Trigger background task to generate report
    # For now, return immediately with report ID
    
    return Response({
        'report_id': report_id,
        'status': 'generating',
        'download_url': f'/api/v1/analytics/reports/{report_id}/download/',
        'estimated_completion': '30 seconds',
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def download_report(request, report_id):
    """
    Download generated report.
    """
    report_data = cache.get(f"report:{report_id}")
    
    if not report_data:
        return Response({
            'error': 'Report not found or expired'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # For now, return JSON data
    # TODO: Implement CSV/PDF generation
    
    return Response(report_data)
