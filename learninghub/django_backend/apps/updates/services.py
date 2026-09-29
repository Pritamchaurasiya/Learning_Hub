"""
Core Business Services for LearningHub Student Updates Hub.
HackSoft Clean Architecture: Pure writes and database transactions.
"""
import logging
import datetime
from datetime import timedelta
from typing import Dict, Any, Optional, List, Tuple
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import (
    UpdateSource,
    UpdateSourceEndpoint,
    StudentUpdate,
    UpdateVersion,
    UpdateAttachment,
    UpdateCrossLink,
    UpdateSubscription,
    UpdateBookmark,
    UpdateReminder,
    UpdateFetchLog,
    UpdateNotificationPreference,
    QueuedUpdateNotification,
    UpdateNotificationAudit,
    ResultWatcher,
)
from .normalizers.canonical import normalize_notice_payload
from .sources.registry import SEED_SOURCES

logger = logging.getLogger(__name__)


class IngestResult(tuple):
    """
    Dual-compatibility return type: can be unpacked as (update, created, modified)
    or accessed directly as the StudentUpdate instance (e.g. res.version, res.id).
    """
    def __new__(cls, update: StudentUpdate, created: bool, modified: bool):
        return super().__new__(cls, (update, created, modified))

    def __init__(self, update: StudentUpdate, created: bool, modified: bool):
        self.update = update
        self.created = created
        self.modified = modified

    def __getattr__(self, name: str) -> Any:
        return getattr(self.update, name)


@transaction.atomic
def ingest_notice_from_source(
    source_or_id: Any,
    raw_payload: Dict[str, Any],
    endpoint_id: Optional[str] = None
) -> IngestResult:
    """
    Ingests a raw notice from an external source or crawler with deterministic
    change detection, revision tracking, and automated attachment association.
    """
    if isinstance(source_or_id, UpdateSource):
        source = source_or_id
    elif isinstance(source_or_id, str):
        source = UpdateSource.objects.filter(source_id=source_or_id).first()
    else:
        source = None

    if not source:
        source = UpdateSource.objects.first()
        if not source:
            seed_default_sources()
            source = UpdateSource.objects.first()

    institution_name = source.institution if source else "Mahatma Gandhi Kashi Vidyapith"
    normalized = normalize_notice_payload(raw_payload, default_institution=institution_name)

    title = normalized['title']
    source_url = normalized['source_url']
    if not title or not source_url:
        raise ValidationError("Title and source URL are required.")

    date_str = str(normalized['published_at']) if normalized['published_at'] else ""
    content_hash = StudentUpdate.calculate_hash(title, source_url, date_str, normalized['summary'])

    now = timezone.now()

    # Check existing by title & source_url (or source_url)
    existing_update = StudentUpdate.objects.filter(
        source_url=source_url
    ).first()

    if existing_update:
        created = False
        if existing_update.content_hash != content_hash:
            diff_summary = f"Notice content updated on {now.strftime('%d %b %Y')}. Revision #{existing_update.version + 1}."
            UpdateVersion.objects.create(
                update=existing_update,
                version_number=existing_update.version,
                title=existing_update.title,
                summary=existing_update.summary,
                content_hash=existing_update.content_hash,
                diff_summary=diff_summary,
                changed_fields=['summary', 'deadline', 'content_hash']
            )

            old_deadline = existing_update.deadline
            new_deadline = normalized['deadline']

            existing_update.title = title
            existing_update.summary = normalized['summary']
            existing_update.deadline = new_deadline or existing_update.deadline
            existing_update.importance = normalized['importance'] or existing_update.importance
            existing_update.content_hash = content_hash
            existing_update.version += 1
            existing_update.last_checked_at = now
            existing_update.save()
            modified = True

            if new_deadline and old_deadline and new_deadline != old_deadline:
                reschedule_reminders_on_deadline_change(existing_update, old_deadline, new_deadline)
        else:
            existing_update.last_checked_at = now
            existing_update.save(update_fields=['last_checked_at'])
            modified = False

        target_update = existing_update
    else:
        created = True
        modified = False
        target_update = StudentUpdate.objects.create(
            source=source,
            title=title,
            summary=normalized['summary'],
            source_url=source_url,
            category=normalized['category'],
            sub_category=normalized['sub_category'],
            institution=normalized['institution'],
            course=normalized['course'],
            semester=normalized['semester'],
            published_at=normalized['published_at'] or now,
            deadline=normalized['deadline'],
            importance=normalized['importance'],
            status='PUBLISHED',
            verification_status='VERIFIED' if (source and source.authority_level <= 2) else 'PENDING_REVIEW',
            content_hash=content_hash,
            version=1,
            last_checked_at=now,
        )


        # Ingest attachments
        for att_data in normalized.get('attachments', []):
            att_title = att_data.get('title') or 'Official Circular'
            att_url = att_data.get('url') or ''
            if att_url:
                UpdateAttachment.objects.get_or_create(
                    update=target_update,
                    file_url=att_url,
                    defaults={
                        'title': att_title,
                        'mime_type': 'application/pdf' if att_url.lower().endswith('.pdf') else 'text/html',
                    }
                )

        _link_ecosystem_context(target_update)
        if target_update.status == 'PUBLISHED':
            match_and_notify_result_watchers(target_update)

    return IngestResult(target_update, created, modified)


def _link_ecosystem_context(update: StudentUpdate) -> None:
    """
    Synthesizes cross-links into Test A+, Ebooks, and Courses based on update context.
    """
    title_lower = update.title.lower()
    if any(w in title_lower for w in ('bca', 'computer', 'dsa', 'data structures', 'database', 'dbms')):
        UpdateCrossLink.objects.get_or_create(
            update=update,
            content_type='TEST',
            target_id='test-dsa-foundation',
            defaults={
                'title': 'Take BCA / DSA Practice Assessment (Test A+)',
                'action_cta': 'Start Assessment',
                'action_url': '/tests/a',
            }
        )
        UpdateCrossLink.objects.get_or_create(
            update=update,
            content_type='EBOOK',
            target_id='ebook-dbms-complete',
            defaults={
                'title': 'Read Database Systems & SQL Interactive Notes',
                'action_cta': 'Read Ebook',
                'action_url': '/ebooks',
            }
        )


@transaction.atomic
def seed_default_sources() -> List[UpdateSource]:
    """
    Seeds canonical sources and endpoints from registry if not already present.
    """
    created_sources = []
    for src_def in SEED_SOURCES:
        source, _ = UpdateSource.objects.get_or_create(
            source_id=src_def["source_id"],
            defaults={
                "name": src_def["name"],
                "domain": src_def["domain"],
                "source_type": src_def.get("source_type", "UNIVERSITY"),
                "authority_level": src_def.get("authority_level", 1),
                "category": src_def.get("category", "ACADEMIC"),
                "country": src_def.get("country", "India"),
                "state": src_def.get("state", "Uttar Pradesh"),
                "institution": src_def["institution"],
                "base_url": src_def["base_url"],
                "fetch_method": src_def.get("fetch_method", "HTML_TABLE"),
                "polling_interval_minutes": src_def.get("polling_interval_minutes", 60),
                "robots_policy": src_def.get("robots_policy", "COMPLIANT"),
                "terms_status": src_def.get("terms_status", "APPROVED"),
                "is_enabled": src_def.get("is_enabled", True),
                "verification_required": src_def.get("verification_required", False),
            }
        )
        created_sources.append(source)
        for ep_def in src_def.get("endpoints", []):
            UpdateSourceEndpoint.objects.get_or_create(
                id=ep_def["id"],
                defaults={
                    "source": source,
                    "name": ep_def["name"],
                    "sub_category": ep_def.get("sub_category", "NOTICE_BOARD"),
                    "endpoint_url": ep_def["endpoint_url"],
                    "css_selector": ep_def.get("css_selector", ""),
                    "is_active": True,
                }
            )
    return created_sources


@transaction.atomic
def bookmark_update(user, update_id: str, notes: str = "", tag: str = "General") -> UpdateBookmark:
    update = StudentUpdate.objects.get(pk=update_id)
    bookmark, created = UpdateBookmark.objects.get_or_create(
        user=user,
        update=update,
        defaults={'notes': notes.strip(), 'tag': tag.strip()}
    )
    if not created and (notes or tag):
        if notes:
            bookmark.notes = notes.strip()
        if tag:
            bookmark.tag = tag.strip()
        bookmark.save()
    return bookmark


@transaction.atomic
def remove_bookmark(user, update_id: str) -> bool:
    deleted_count, _ = UpdateBookmark.objects.filter(user=user, update__id=update_id).delete()
    return deleted_count > 0


@transaction.atomic
def schedule_deadline_reminders(user, update_id: str, reminder_types: List[str]) -> List[UpdateReminder]:
    update = StudentUpdate.objects.get(pk=update_id)
    if not update.deadline:
        raise ValidationError("This update has no active deadline associated with it.")

    created = []
    now = timezone.now()
    UpdateReminder.objects.filter(user=user, update=update, is_dispatched=False).delete()

    offsets = {
        '7_DAYS_BEFORE': timedelta(days=7),
        '3_DAYS_BEFORE': timedelta(days=3),
        '1_DAY_BEFORE': timedelta(days=1),
        'DAY_OF': timedelta(hours=4),
    }

    for r_type in reminder_types:
        if r_type in offsets:
            trigger_at = update.deadline - offsets[r_type]
            if trigger_at > now:
                rem = UpdateReminder.objects.create(
                    user=user,
                    update=update,
                    reminder_type=r_type,
                    trigger_at=trigger_at,
                    is_dispatched=False
                )
                created.append(rem)

    return created


@transaction.atomic
def create_deadline_reminder(user, update_id: str, reminder_type: str) -> UpdateReminder:
    update = StudentUpdate.objects.get(pk=update_id)
    if not update.deadline:
        raise ValidationError("This update has no active deadline associated with it.")

    now = timezone.now()
    if reminder_type == '7_DAYS_BEFORE':
        trigger_at = update.deadline - timedelta(days=7)
    elif reminder_type == '3_DAYS_BEFORE':
        trigger_at = update.deadline - timedelta(days=3)
    elif reminder_type == '1_DAY_BEFORE':
        trigger_at = update.deadline - timedelta(days=1)
    elif reminder_type == 'DAY_OF':
        trigger_at = update.deadline.replace(hour=8, minute=0, second=0, microsecond=0)
    else:
        raise ValidationError(f"Invalid reminder type '{reminder_type}'.")

    if trigger_at < now:
        trigger_at = now + timedelta(minutes=5)

    reminder, _ = UpdateReminder.objects.get_or_create(
        user=user,
        update=update,
        reminder_type=reminder_type,
        defaults={
            'trigger_at': trigger_at,
            'is_dispatched': False,
        }
    )
    return reminder


@transaction.atomic
def cancel_reminder(user, reminder_id: str) -> bool:
    deleted_count, _ = UpdateReminder.objects.filter(user=user, id=reminder_id).delete()
    return deleted_count > 0


@transaction.atomic
def reschedule_reminders_on_deadline_change(update: StudentUpdate, old_deadline, new_deadline) -> int:
    """
    When an official notice extends or modifies its deadline, recalculates trigger_at
    for all pending reminders and notifies affected students.
    """
    if not new_deadline or new_deadline == old_deadline:
        return 0

    now = timezone.now()
    pending_reminders = UpdateReminder.objects.filter(
        update=update,
        is_dispatched=False
    ).select_related('user')

    offsets = {
        '7_DAYS_BEFORE': timedelta(days=7),
        '3_DAYS_BEFORE': timedelta(days=3),
        '1_DAY_BEFORE': timedelta(days=1),
        'DAY_OF': timedelta(hours=4),
    }

    updated_count = 0
    channel_layer = get_channel_layer()

    try:
        from apps.social.models import Notification
    except ImportError:
        Notification = None

    for rem in pending_reminders:
        offset = offsets.get(rem.reminder_type, timedelta(days=1))
        new_trigger = new_deadline - offset
        if new_trigger < now:
            new_trigger = now + timedelta(minutes=5)
        rem.trigger_at = new_trigger
        rem.save(update_fields=['trigger_at'])
        updated_count += 1

        # Emit in-app notification & WebSocket message
        try:
            deadline_fmt = new_deadline.strftime("%d %b %Y")
            if Notification:
                Notification.objects.create(
                    user=rem.user,
                    type='REMINDER',
                    title=f"Deadline Extended: {update.title[:45]}...",
                    message=f"The deadline has been revised to {deadline_fmt}. Your scheduled reminders have been automatically adjusted.",
                    action_url=f"/updates/{update.id}",
                    metadata={'update_id': update.id, 'new_deadline': new_deadline.isoformat()}
                )
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"notifications_user_{str(rem.user.id)}",
                    {
                        "type": "user_notification",
                        "user_id": str(rem.user.id),
                        "title": f"Deadline Extended: {update.title[:45]}...",
                        "message": f"Deadline extended to {deadline_fmt}. Reminders updated.",
                        "data": {
                            "type": "DEADLINE_EXTENDED",
                            "update_id": update.id,
                            "new_deadline": new_deadline.isoformat(),
                        }
                    }
                )
        except Exception as e:
            logger.warning(f"Failed to deliver reschedule notice to user {rem.user.id}: {e}")

    return updated_count


@transaction.atomic
def create_subscription(user, target_type: str, target_value: str) -> UpdateSubscription:
    sub, _ = UpdateSubscription.objects.get_or_create(
        user=user,
        target_type=target_type.upper().strip(),
        target_value=target_value.strip()
    )
    return sub


@transaction.atomic
def remove_subscription(user, subscription_id: str) -> bool:
    deleted_count, _ = UpdateSubscription.objects.filter(user=user, id=subscription_id).delete()
    return deleted_count > 0


@transaction.atomic
def unfollow_target(user, target_type: str, target_value: str) -> bool:
    deleted_count, _ = UpdateSubscription.objects.filter(
        user=user,
        target_type=target_type.upper().strip(),
        target_value=target_value.strip()
    ).delete()
    return deleted_count > 0


@transaction.atomic
def link_learninghub_cross_feature(
    update_id: str,
    content_type: str,
    target_id: str,
    title: str,
    action_cta: str = "Prepare Now",
    action_url: str = ""
) -> UpdateCrossLink:
    update = StudentUpdate.objects.get(pk=update_id)
    link, _ = UpdateCrossLink.objects.update_or_create(
        update=update,
        content_type=content_type,
        target_id=target_id,
        defaults={
            'title': title,
            'action_cta': action_cta,
            'action_url': action_url or f"/{content_type.lower()}s/{target_id}"
        }
    )
    return link


def log_source_fetch(
    source: UpdateSource,
    status_code: int,
    latency_ms: int,
    change_detected: bool = False,
    error_message: str = ""
) -> UpdateFetchLog:
    if status_code == 200:
        source.last_success_at = timezone.now()
        source.failure_count = 0
    else:
        source.last_failure_at = timezone.now()
        source.failure_count += 1
    source.last_checked_at = timezone.now()
    source.save(update_fields=['last_success_at', 'last_failure_at', 'failure_count', 'last_checked_at'])

    return UpdateFetchLog.objects.create(
        source=source,
        status_code=status_code,
        latency_ms=latency_ms,
        change_detected=change_detected,
        error_message=error_message
    )


def get_or_create_user_preferences(user) -> UpdateNotificationPreference:
    pref, _ = UpdateNotificationPreference.objects.get_or_create(user=user)
    return pref


@transaction.atomic
def update_user_preferences(user, **fields) -> UpdateNotificationPreference:
    pref, _ = UpdateNotificationPreference.objects.get_or_create(user=user)
    allowed_fields = [
        'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
        'max_daily_push', 'allow_exam_forms', 'allow_results',
        'allow_timetables', 'allow_scholarships', 'allow_admit_cards',
        'allow_academic', 'digest_mode'
    ]
    for key, val in fields.items():
        if key in allowed_fields and val is not None:
            setattr(pref, key, val)
    pref.save()
    return pref


def dispatch_update_notification(update_or_id: Any, force_immediate: bool = False) -> Dict[str, Any]:
    """
    Evaluates anti-noise capping, quiet hours, and user preferences,
    then dispatches in-app, WebSocket, and push notifications to subscribers.
    """
    if isinstance(update_or_id, StudentUpdate):
        update = update_or_id
    else:
        update = StudentUpdate.objects.filter(pk=update_or_id).first()

    if not update:
        raise ValidationError(f"StudentUpdate with id '{update_or_id}' does not exist.")

    # Target subscribers
    subscribers = set()
    
    # Institution followers
    if update.institution:
        inst_users = UpdateSubscription.objects.filter(
            target_type='INSTITUTION',
            target_value__iexact=update.institution
        ).values_list('user_id', flat=True)
        subscribers.update(inst_users)

    # Category followers
    if update.category:
        cat_users = UpdateSubscription.objects.filter(
            target_type='CATEGORY',
            target_value__iexact=update.category
        ).values_list('user_id', flat=True)
        subscribers.update(cat_users)

    # Course followers
    if update.course:
        crs_users = UpdateSubscription.objects.filter(
            target_type='COURSE',
            target_value__iexact=update.course
        ).values_list('user_id', flat=True)
        subscribers.update(crs_users)

    from django.contrib.auth import get_user_model
    User = get_user_model()
    users = User.objects.filter(id__in=subscribers, is_active=True)

    channel_layer = get_channel_layer()
    now = timezone.now()
    current_time = timezone.localtime(now).time()

    stats = {
        'total_subscribers': len(subscribers),
        'immediate_delivered': 0,
        'queued_quiet_hours': 0,
        'queued_digest': 0,
        'suppressed': 0,
    }

    try:
        from apps.social.models import Notification
    except ImportError:
        Notification = None

    for user in users:
        pref, _ = UpdateNotificationPreference.objects.get_or_create(user=user)

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_delivered_count = UpdateNotificationAudit.objects.filter(
            user=user,
            decision='IMMEDIATE',
            delivered_at__gte=today_start
        ).count()

        eval_res = pref.evaluate_delivery(
            update,
            today_delivered_count=today_delivered_count,
            current_time=current_time
        )

        decision = eval_res['channel']
        if force_immediate:
            decision = 'IMMEDIATE'

        if decision == 'IMMEDIATE':
            if Notification:
                try:
                    Notification.objects.create(
                        user=user,
                        type='REMINDER' if update.importance == 'URGENT' else 'INFO',
                        title=f"[{update.get_category_display()}] {update.title[:80]}",
                        message=update.summary[:250],
                        action_url=f"/updates/{update.id}",
                        metadata={
                            'update_id': update.id,
                            'category': update.category,
                            'importance': update.importance,
                            'source_url': update.source_url
                        }
                    )
                except Exception as exc:
                    logger.warning(f"Failed to create social Notification for user {user.id}: {exc}")

            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"notifications_user_{user.id}",
                        {
                            "type": "user_notification",
                            "user_id": str(user.id),
                            "title": f"[{update.category}] {update.title[:60]}",
                            "message": update.summary[:200],
                            "data": {
                                "type": "STUDENT_UPDATE_ANNOUNCEMENT",
                                "update_id": update.id,
                                "category": update.category,
                                "importance": update.importance,
                                "source_url": update.source_url,
                            }
                        }
                    )
                except Exception as ws_err:
                    logger.warning(f"Could not push WebSocket to user {user.id}: {ws_err}")

            UpdateNotificationAudit.objects.create(
                user=user,
                update=update,
                channel='IN_APP',
                decision='IMMEDIATE',
                reason=eval_res['reason']
            )
            stats['immediate_delivered'] += 1

        elif decision == 'QUEUED_QUIET_HOURS':
            local_now = timezone.localtime(now)
            end_t = pref.quiet_hours_end
            if local_now.time() >= end_t:
                sched_date = (local_now + timedelta(days=1)).date()
            else:
                sched_date = local_now.date()
            sched_dt = timezone.make_aware(
                datetime.datetime.combine(sched_date, end_t),
                timezone.get_current_timezone()
            )

            QueuedUpdateNotification.objects.create(
                user=user,
                update=update,
                queue_reason='QUIET_HOURS',
                scheduled_for=sched_dt
            )
            UpdateNotificationAudit.objects.create(
                user=user,
                update=update,
                channel='QUEUED_QUIET_HOURS',
                decision='QUEUED_QUIET_HOURS',
                reason=eval_res['reason']
            )
            stats['queued_quiet_hours'] += 1

        elif decision == 'DIGEST_ONLY':
            local_now = timezone.localtime(now)
            sched_dt = timezone.make_aware(
                datetime.datetime.combine((local_now + timedelta(days=1)).date(), datetime.time(8, 0)),
                timezone.get_current_timezone()
            )
            QueuedUpdateNotification.objects.create(
                user=user,
                update=update,
                queue_reason='DIGEST',
                scheduled_for=sched_dt
            )
            UpdateNotificationAudit.objects.create(
                user=user,
                update=update,
                channel='DIGEST',
                decision='DIGEST_ONLY',
                reason=eval_res['reason']
            )
            stats['queued_digest'] += 1

        else:
            UpdateNotificationAudit.objects.create(
                user=user,
                update=update,
                channel='SUPPRESSED',
                decision='SUPPRESSED',
                reason=eval_res['reason']
            )
            stats['suppressed'] += 1

    return stats


def release_queued_notifications() -> List[str]:
    """
    Flushes and dispatches queued quiet hours notifications whose scheduled release has arrived.
    """
    now = timezone.now()
    pending = QueuedUpdateNotification.objects.filter(
        is_dispatched=False,
        scheduled_for__lte=now
    ).select_related('user', 'update')

    dispatched_ids = []
    channel_layer = get_channel_layer()
    try:
        from apps.social.models import Notification
    except ImportError:
        Notification = None

    for item in pending:
        try:
            item.is_dispatched = True
            item.dispatched_at = now
            item.save(update_fields=['is_dispatched', 'dispatched_at'])
            dispatched_ids.append(item.id)

            if Notification:
                try:
                    Notification.objects.create(
                        user=item.user,
                        type='INFO',
                        title=f"Morning Release: {item.update.title[:60]}",
                        message=item.update.summary[:200],
                        action_url=f"/updates/{item.update.id}",
                        metadata={'update_id': item.update.id, 'queued_reason': item.queue_reason}
                    )
                except Exception:
                    pass

            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"notifications_user_{item.user.id}",
                        {
                            "type": "user_notification",
                            "user_id": str(item.user.id),
                            "title": f"Morning Release: {item.update.title[:60]}",
                            "message": item.update.summary[:200],
                            "data": {
                                "type": "STUDENT_UPDATE_RELEASED",
                                "update_id": item.update.id,
                                "category": item.update.category,
                            }
                        }
                    )
                except Exception:
                    pass
        except Exception as exc:
            logger.error(f"Error releasing queued update notification {item.id}: {exc}")

    return dispatched_ids


@transaction.atomic
def create_result_watcher(user, institution: str, course: str, semester: str = "", roll_number: str = "") -> ResultWatcher:
    """
    Registers a new result watcher for automated tracking.
    """
    watcher, _ = ResultWatcher.objects.get_or_create(
        user=user,
        institution=institution.strip(),
        course=course.strip(),
        semester=semester.strip(),
        defaults={
            'roll_number': roll_number.strip(),
            'status': 'ACTIVE',
        }
    )
    if roll_number and watcher.roll_number != roll_number.strip():
        watcher.roll_number = roll_number.strip()
        watcher.save(update_fields=['roll_number', 'updated_at'])
    return watcher


@transaction.atomic
def cancel_result_watcher(user, watcher_id: str) -> bool:
    """
    Cancels or removes a student result watch.
    """
    deleted_count, _ = ResultWatcher.objects.filter(user=user, id=watcher_id).delete()
    return deleted_count > 0


def match_and_notify_result_watchers(update: StudentUpdate) -> List[ResultWatcher]:
    """
    Scans for active ResultWatchers matching the newly published or modified update.
    Triggers immediate high-priority WebSocket toast and updates watcher status.
    """
    category_upper = (update.category or "").upper()
    title_lower = (update.title or "").lower()
    summary_lower = (update.summary or "").lower()

    is_result = (
        category_upper == 'RESULT' or
        'result' in title_lower or
        'result' in summary_lower or
        'marksheet' in title_lower or
        'scorecard' in title_lower or
        'परिणाम' in title_lower
    )

    if not is_result or update.status != 'PUBLISHED':
        return []

    from .selectors import find_active_watchers_for_update
    active_watchers = find_active_watchers_for_update(update)
    matched = []
    channel_layer = get_channel_layer()
    now = timezone.now()

    for watcher in active_watchers:
        # If watcher specified a semester, verify it matches or is contained
        if watcher.semester and update.semester:
            if watcher.semester.lower() not in update.semester.lower() and update.semester.lower() not in watcher.semester.lower():
                continue

        watcher.status = 'RESULT_DECLARED'
        watcher.matched_update = update
        watcher.result_url = update.source_url
        watcher.notified_at = now
        watcher.save(update_fields=['status', 'matched_update', 'result_url', 'notified_at', 'updated_at'])
        matched.append(watcher)

        # High priority push via WebSocket
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"notifications_user_{watcher.user.id}",
                    {
                        "type": "user_notification",
                        "user_id": str(watcher.user.id),
                        "title": f"🎓 Result Declared: {update.institution} {update.course}",
                        "message": f"Official results for {update.course} {update.semester or ''} are now live! Check your scorecard.",
                        "data": {
                            "type": "RESULT_WATCHER_ALERT",
                            "watcher_id": watcher.id,
                            "update_id": update.id,
                            "institution": update.institution,
                            "course": update.course,
                            "result_url": update.source_url,
                            "roll_number": watcher.roll_number,
                        }
                    }
                )
            except Exception as ws_err:
                logger.warning(f"Failed to send result watcher WebSocket alert to user {watcher.user.id}: {ws_err}")

    return matched


class StudentUpdateService:
    @staticmethod
    def ingest_notice_from_source(source_or_id, raw_payload, endpoint_id=None) -> StudentUpdate:
        res = ingest_notice_from_source(source_or_id, raw_payload, endpoint_id)
        if isinstance(res, tuple):
            return res[0]
        return res

    seed_default_sources = staticmethod(seed_default_sources)
    create_bookmark = staticmethod(bookmark_update)
    bookmark_update = staticmethod(bookmark_update)
    delete_bookmark = staticmethod(remove_bookmark)
    remove_bookmark = staticmethod(remove_bookmark)
    schedule_deadline_reminders = staticmethod(schedule_deadline_reminders)
    create_deadline_reminder = staticmethod(create_deadline_reminder)
    cancel_reminder = staticmethod(cancel_reminder)
    create_subscription = staticmethod(create_subscription)
    follow_target = staticmethod(create_subscription)
    remove_subscription = staticmethod(remove_subscription)
    unfollow_target = staticmethod(remove_subscription)
    link_learninghub_cross_feature = staticmethod(link_learninghub_cross_feature)
    log_source_fetch = staticmethod(log_source_fetch)
    get_or_create_user_preferences = staticmethod(get_or_create_user_preferences)
    update_user_preferences = staticmethod(update_user_preferences)
    dispatch_update_notification = staticmethod(dispatch_update_notification)
    release_queued_notifications = staticmethod(release_queued_notifications)
    create_result_watcher = staticmethod(create_result_watcher)
    cancel_result_watcher = staticmethod(cancel_result_watcher)
    match_and_notify_result_watchers = staticmethod(match_and_notify_result_watchers)
    reschedule_reminders_on_deadline_change = staticmethod(reschedule_reminders_on_deadline_change)

