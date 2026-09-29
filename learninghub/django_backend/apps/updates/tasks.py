"""
Celery Background Tasks and Periodic Poller for LearningHub Student Updates Hub.
"""
import time
import logging
from celery import shared_task
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import UpdateSource, UpdateReminder, UpdateFetchLog
from .services import StudentUpdateService, ingest_notice_from_source
from .parsers.mgkvp_parser import MGKVPNoticeParser
from .crawler import SourceCrawler

logger = logging.getLogger(__name__)


@shared_task(name="apps.updates.tasks.poll_all_active_sources")
def poll_all_active_sources():
    """
    Periodic task: polls all enabled official educational sources,
    extracts notice candidates via SourceCrawler, applies change detection,
    and updates observability logs.
    """
    logger.info("Starting background poll of active student update sources...")
    sources = UpdateSource.objects.filter(is_enabled=True).prefetch_related('endpoints')
    results = []
    crawler = SourceCrawler()

    for source in sources:
        try:
            crawl_res = crawler.crawl_source(source)
            results.append({
                'source_id': source.source_id,
                'status': crawl_res['status'],
                'endpoints_polled': len(crawl_res['endpoints']),
                'changes': crawl_res['created'] + crawl_res['modified'],
                'created': crawl_res['created'],
                'modified': crawl_res['modified'],
            })
            logger.info(f"Source {source.source_id} successfully polled: {crawl_res['created']} created, {crawl_res['modified']} modified.")
        except Exception as exc:
            logger.error(f"Error polling source {source.source_id}: {exc}")
            results.append({
                'source_id': source.source_id,
                'status': 'ERROR',
                'error': str(exc),
            })

    return results


# Backward compatibility alias
poll_registered_sources = poll_all_active_sources


@shared_task(name="apps.updates.tasks.dispatch_deadline_reminders")
def dispatch_deadline_reminders():
    """
    Checks and dispatches pending deadline reminders whose scheduled trigger time has arrived.
    Broadcasts real-time WebSocket notification to the user's private notification channel.
    """
    now = timezone.now()
    pending = UpdateReminder.objects.filter(
        is_dispatched=False,
        trigger_at__lte=now
    ).select_related('user', 'update')

    dispatched_ids = []
    channel_layer = get_channel_layer()

    for reminder in pending:
        try:
            # Mark dispatched
            reminder.is_dispatched = True
            reminder.dispatched_at = now
            reminder.save(update_fields=['is_dispatched', 'dispatched_at'])
            dispatched_ids.append(reminder.id)

            # Record transactional inbox notification if social app is available
            try:
                from apps.social.models import Notification
                deadline_str = reminder.update.deadline.strftime("%d %b %Y, %I:%M %p") if reminder.update.deadline else "Soon"
                Notification.objects.create(
                    user=reminder.user,
                    type='REMINDER',
                    title=f"Deadline Approaching: {reminder.update.title[:60]}",
                    message=f"Official deadline is {deadline_str}. Tap to review details.",
                    action_url=f"/updates/{reminder.update.id}",
                    metadata={
                        'update_id': reminder.update.id,
                        'reminder_id': reminder.id,
                        'reminder_type': reminder.reminder_type,
                    }
                )
            except Exception:
                pass

            # Broadcast via WebSocket if channel layer is available
            if channel_layer:
                try:
                    user_group = f"notifications_user_{str(reminder.user.id)}"
                    deadline_str = reminder.update.deadline.strftime("%d %b %Y, %I:%M %p") if reminder.update.deadline else "Soon"
                    async_to_sync(channel_layer.group_send)(
                        user_group,
                        {
                            "type": "user_notification",
                            "user_id": str(reminder.user.id),
                            "title": f"Deadline Reminder: {reminder.update.title[:45]}...",
                            "message": f"Official deadline approaching on {deadline_str}. Check your examination checklist.",
                            "data": {
                                "type": "STUDENT_UPDATE_DEADLINE",
                                "update_id": reminder.update.id,
                                "reminder_id": reminder.id,
                                "reminder_type": reminder.reminder_type,
                                "source_url": reminder.update.source_url,
                            }
                        }
                    )
                except Exception as ws_err:
                    logger.warning(f"Could not push WebSocket notification for reminder {reminder.id}: {ws_err}")

            logger.info(f"Dispatched deadline reminder {reminder.id} to user {reminder.user.email}")
        except Exception as exc:
            logger.error(f"Failed to dispatch reminder {reminder.id}: {exc}")

    return dispatched_ids


# Backward compatibility alias
dispatch_scheduled_reminders = dispatch_deadline_reminders


@shared_task(name="apps.updates.tasks.dispatch_update_notification_task")
def dispatch_update_notification_task(update_id: str, force_immediate: bool = False):
    """
    Background worker task to evaluate and broadcast notifications for a published notice.
    """
    logger.info(f"Triggering background notification dispatch for update {update_id}")
    return StudentUpdateService.dispatch_update_notification(update_id, force_immediate=force_immediate)


@shared_task(name="apps.updates.tasks.flush_queued_notifications_task")
def flush_queued_notifications_task():
    """
    Morning release periodic task: flushes quiet-hours deferred notifications.
    """
    logger.info("Executing scheduled flush of quiet-hours queued notifications...")
    return StudentUpdateService.release_queued_notifications()

