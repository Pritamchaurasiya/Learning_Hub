"""
Query Selectors for LearningHub Student Updates Hub.
"""
from typing import Optional, Dict, Any, List
from django.db.models import QuerySet, Q
from django.utils import timezone

from .models import (
    UpdateSource,
    StudentUpdate,
    UpdateBookmark,
    UpdateReminder,
    UpdateSubscription,
)


def list_student_updates(
    category: Optional[str] = None,
    search: Optional[str] = None,
    institution: Optional[str] = None,
    importance: Optional[str] = None,
    course: Optional[str] = None,
    only_deadlines: bool = False,
    status: str = "PUBLISHED",
    limit: int = 50,
    offset: int = 0
) -> QuerySet[StudentUpdate]:
    """
    Retrieves filtered and paginated student updates.
    """
    qs = StudentUpdate.objects.filter(status=status).select_related('source').prefetch_related('attachments', 'cross_links')

    if category and category.upper() not in ('ALL', ''):
        qs = qs.filter(category=category.upper())

    if importance and importance.upper() not in ('ALL', ''):
        qs = qs.filter(importance=importance.upper())

    if institution and institution.strip():
        qs = qs.filter(institution__icontains=institution.strip())

    if course and course.strip():
        qs = qs.filter(course__icontains=course.strip())

    if only_deadlines:
        now = timezone.now()
        qs = qs.filter(deadline__isnull=False, deadline__gte=now).order_by('deadline')

    if search and search.strip():
        term = search.strip()
        qs = qs.filter(
            Q(title__icontains=term) |
            Q(summary__icontains=term) |
            Q(institution__icontains=term) |
            Q(course__icontains=term) |
            Q(sub_category__icontains=term)
        )

    return qs[offset:offset + limit]


def get_personalized_feed(user, limit: int = 50, offset: int = 0) -> QuerySet[StudentUpdate]:
    """
    Returns tailored updates matching user's subscriptions (institutions, courses, exams, categories).
    Falls back to high-importance/recent updates if user has no subscriptions.
    """
    base_qs = StudentUpdate.objects.filter(status="PUBLISHED").select_related('source').prefetch_related('attachments', 'cross_links')

    if not user or not user.is_authenticated:
        return base_qs[:limit]

    subs = UpdateSubscription.objects.filter(user=user)
    if not subs.exists():
        # Fallback to general feed
        return base_qs[offset:offset + limit]

    conditions = Q()
    for sub in subs:
        if sub.target_type == 'INSTITUTION':
            conditions |= Q(institution__icontains=sub.target_value)
        elif sub.target_type == 'COURSE':
            conditions |= Q(course__icontains=sub.target_value)
        elif sub.target_type == 'EXAM':
            conditions |= Q(exam__icontains=sub.target_value)
        elif sub.target_type == 'CATEGORY':
            conditions |= Q(category__iexact=sub.target_value)

    matched_qs = base_qs.filter(conditions)
    if not matched_qs.exists():
        return base_qs[offset:offset + limit]

    return matched_qs[offset:offset + limit]


def get_upcoming_deadlines(limit: int = 10) -> QuerySet[StudentUpdate]:
    """
    Returns upcoming deadlines in strict chronological order.
    """
    now = timezone.now()
    return (
        StudentUpdate.objects.filter(status="PUBLISHED", deadline__isnull=False, deadline__gte=now)
        .select_related('source')
        .prefetch_related('attachments', 'cross_links')
        .order_by('deadline')[:limit]
    )


def get_update_detail(update_id: str) -> Optional[StudentUpdate]:
    """
    Retrieves a single update by ID with attachments, cross links, and version history.
    """
    return (
        StudentUpdate.objects.filter(id=update_id)
        .select_related('source')
        .prefetch_related('attachments', 'cross_links', 'versions')
        .first()
    )


def list_user_bookmarks(user) -> QuerySet[UpdateBookmark]:
    """
    Lists all saved notices for a specific student.
    """
    return (
        UpdateBookmark.objects.filter(user=user)
        .select_related('update', 'update__source')
        .prefetch_related('update__attachments', 'update__cross_links')
        .order_by('-created_at')
    )


def list_user_reminders(user) -> QuerySet[UpdateReminder]:
    """
    Lists all scheduled deadline reminders for a student.
    """
    return (
        UpdateReminder.objects.filter(user=user)
        .select_related('update', 'update__source')
        .order_by('trigger_at')
    )


def list_user_subscriptions(user) -> QuerySet[UpdateSubscription]:
    """
    Lists all follow subscriptions for a student.
    """
    return UpdateSubscription.objects.filter(user=user).order_by('-created_at')


def list_sources() -> QuerySet[UpdateSource]:
    """
    Lists all registered official sources with endpoint counts.
    """
    return UpdateSource.objects.filter(is_enabled=True).prefetch_related('endpoints').order_by('authority_level', 'name')


def get_updates_statistics() -> Dict[str, Any]:
    """
    Aggregates statistical overview for the Updates Hub command center.
    """
    now = timezone.now()
    total_count = StudentUpdate.objects.filter(status='PUBLISHED').count()
    urgent_count = StudentUpdate.objects.filter(status='PUBLISHED', importance='URGENT').count()
    active_deadlines_count = StudentUpdate.objects.filter(status='PUBLISHED', deadline__gte=now).count()
    tracked_sources_count = UpdateSource.objects.filter(is_enabled=True).count()

    return {
        'total_updates': total_count,
        'urgent_updates': urgent_count,
        'active_deadlines': active_deadlines_count,
        'tracked_sources': tracked_sources_count,
    }
