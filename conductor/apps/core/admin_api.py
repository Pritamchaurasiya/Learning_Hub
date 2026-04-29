"""
Admin API views for user management, course approvals, and system monitoring.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Avg, Q
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_list(request):
    """
    Admin user management - list users with filters.
    
    Query params:
    - search: Search by username/email
    - role: student, instructor, admin
    - status: active, inactive
    - page: Page number
    - per_page: Items per page
    """
    from apps.users.models import User
    
    search = request.GET.get('search', '')
    role = request.GET.get('role', '')
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))
    
    users = User.objects.all()
    
    if search:
        users = users.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search)
        )
    
    if role == 'instructor':
        users = users.filter(is_instructor=True)
    elif role == 'admin':
        users = users.filter(is_superuser=True)
    
    total = users.count()
    start = (page - 1) * per_page
    users = users[start:start + per_page]
    
    return Response({
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': (total + per_page - 1) // per_page
        },
        'users': [{
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'is_active': u.is_active,
            'is_instructor': u.is_instructor,
            'is_superuser': u.is_superuser,
            'date_joined': u.date_joined.isoformat(),
            'last_login': u.last_login.isoformat() if u.last_login else None,
            'enrollment_count': u.enrollments.count() if hasattr(u, 'enrollments') else 0,
        } for u in users]
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_user_bulk_action(request):
    """
    Bulk operations on users.
    
    Request body:
    - user_ids: List of user IDs
    - action: activate, deactivate, make_instructor, remove_instructor, delete
    """
    from apps.users.models import User
    
    user_ids = request.data.get('user_ids', [])
    action = request.data.get('action', '')
    
    if not user_ids or not action:
        return Response({
            'error': 'user_ids and action are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    valid_actions = ['activate', 'deactivate', 'make_instructor', 'remove_instructor', 'delete']
    if action not in valid_actions:
        return Response({
            'error': f'Invalid action. Must be one of: {valid_actions}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    users = User.objects.filter(id__in=user_ids)
    affected = 0
    
    if action == 'activate':
        affected = users.update(is_active=True)
    elif action == 'deactivate':
        affected = users.update(is_active=False)
    elif action == 'make_instructor':
        affected = users.update(is_instructor=True)
    elif action == 'remove_instructor':
        affected = users.update(is_instructor=False)
    elif action == 'delete':
        # Prevent deleting superusers
        affected = users.filter(is_superuser=False).delete()[0]
    
    return Response({
        'status': 'success',
        'action': action,
        'affected_count': affected
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_pending_courses(request):
    """
    Get courses pending admin approval.
    """
    from apps.courses.models import Course
    
    courses = Course.objects.filter(
        is_published=False
    ).select_related('instructor', 'category').order_by('-created_at')
    
    return Response({
        'count': courses.count(),
        'courses': [{
            'id': c.id,
            'slug': c.slug,
            'title': c.title,
            'instructor': {
                'id': c.instructor.id,
                'name': c.instructor.get_full_name() or c.instructor.username,
            },
            'category': c.category.name if c.category else None,
            'level': c.level,
            'price': str(c.price),
            'created_at': c.created_at.isoformat(),
        } for c in courses[:50]]
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_approve_course(request, course_id):
    """
    Approve or reject a course.
    
    Request body:
    - action: approve or reject
    - reason: Reason for rejection (optional)
    """
    from apps.courses.models import Course
    
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)
    
    action = request.data.get('action', 'approve')
    
    if action == 'approve':
        course.is_published = True
        course.save()
        # Invalidate cache
        cache.delete_many([
            'courses:featured',
            'courses:trending',
            f'course:detail:{course.slug}',
        ])
        return Response({'status': 'success', 'message': f'Course "{course.title}" approved'})
    elif action == 'reject':
        reason = request.data.get('reason', '')
        course.is_published = False
        course.save()
        return Response({
            'status': 'success',
            'message': f'Course "{course.title}" rejected',
            'reason': reason
        })
    
    return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_system_logs(request):
    """
    Get recent system logs and audit entries.
    
    Query params:
    - level: INFO, WARNING, ERROR, CRITICAL
    - limit: Number of entries (default 100)
    """
    from apps.ai_engine.models import ActivityLog
    
    level = request.GET.get('level', '')
    limit = int(request.GET.get('limit', 100))
    
    activities = ActivityLog.objects.select_related('user').order_by('-created_at')
    
    if level:
        activities = activities.filter(action__icontains=level)
    
    activities = activities[:limit]
    
    return Response({
        'count': activities.count() if hasattr(activities, 'count') else len(activities),
        'logs': [{
            'id': a.id,
            'user': a.user.username if a.user else 'system',
            'action': a.action,
            'device_type': a.device_type,
            'created_at': a.created_at.isoformat(),
            'metadata': a.metadata,
        } for a in activities]
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_system_health(request):
    """
    Comprehensive system health check for admin dashboard.
    """
    from django.db import connection
    from apps.courses.models import Course, Enrollment
    from apps.users.models import User
    from apps.ai_engine.models import ActivityLog
    
    health = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'database': {
            'status': 'connected',
            'total_queries': len(connection.queries) if settings.DEBUG else 'N/A',
        },
        'models': {
            'users': User.objects.count(),
            'courses': Course.objects.count(),
            'enrollments': Enrollment.objects.count(),
            'activities': ActivityLog.objects.count(),
        },
        'cache': {
            'status': 'available' if cache else 'unavailable',
        },
        'recent_activity': {
            'last_24h_users': User.objects.filter(
                last_login__gte=timezone.now() - timedelta(hours=24)
            ).count(),
            'last_24h_enrollments': Enrollment.objects.filter(
                created_at__gte=timezone.now() - timedelta(hours=24)
            ).count(),
            'last_24h_activities': ActivityLog.objects.filter(
                created_at__gte=timezone.now() - timedelta(hours=24)
            ).count(),
        },
        'errors': {
            'last_24h': ActivityLog.objects.filter(
                created_at__gte=timezone.now() - timedelta(hours=24),
                metadata__has_key='error'
            ).count()
        }
    }
    
    return Response(health)


# Need settings import
from django.conf import settings
