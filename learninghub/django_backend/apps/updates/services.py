"""
Core Business Services for LearningHub Student Updates Hub.
HackSoft Clean Architecture: Pure writes and database transactions.
"""
from typing import Dict, Any, Optional, List, Tuple
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

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
)
from .normalizers.canonical import normalize_notice_payload
from .sources.registry import SEED_SOURCES


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

            existing_update.title = title
            existing_update.summary = normalized['summary']
            existing_update.deadline = normalized['deadline'] or existing_update.deadline
            existing_update.importance = normalized['importance'] or existing_update.importance
            existing_update.content_hash = content_hash
            existing_update.version += 1
            existing_update.last_checked_at = now
            existing_update.save()
            modified = True
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
