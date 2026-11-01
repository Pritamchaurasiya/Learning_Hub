"""
Background tasks and startup/shutdown handlers.
"""

import logging
from celery import shared_task
from celery.signals import worker_init, worker_shutdown
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, ignore_result=True)
def start_event_bus_consumers(self):
    """Start event bus consumers on worker initialization."""
    try:
        from apps.core.event_bus import RedisStreamEventBus

        RedisStreamEventBus.start_consumers()
        logger.info("Event bus consumers started successfully")
    except Exception as e:
        logger.error(f"Failed to start event bus consumers: {e}")
        raise


@shared_task(bind=True, ignore_result=True)
def stop_event_bus_consumers(self):
    """Stop event bus consumers on worker shutdown."""
    try:
        from apps.core.event_bus import RedisStreamEventBus

        RedisStreamEventBus.stop_consumers()
        logger.info("Event bus consumers stopped successfully")
    except Exception as e:
        logger.error(f"Failed to stop event bus consumers: {e}")


# Celery signal handlers for automatic startup/shutdown
@worker_init.connect
def on_worker_init(sender=None, **kwargs):
    """Called when a Celery worker starts."""
    logger.info(f"Worker {sender} initializing...")
    # Start event bus consumers
    try:
        from apps.core.event_bus import RedisStreamEventBus

        RedisStreamEventBus.start_consumers()
    except Exception as e:
        logger.error(f"Failed to start event bus on worker init: {e}")


@worker_shutdown.connect
def on_worker_shutdown(sender=None, **kwargs):
    """Called when a Celery worker shuts down."""
    logger.info(f"Worker {sender} shutting down...")
    # Stop event bus consumers
    try:
        from apps.core.event_bus import RedisStreamEventBus

        RedisStreamEventBus.stop_consumers()
    except Exception as e:
        logger.error(f"Failed to stop event bus on worker shutdown: {e}")


# Periodic task to monitor event bus health
@shared_task(bind=True, ignore_result=True)
def monitor_event_bus_health(self):
    """Monitor event bus stream health and lag."""
    try:
        from apps.core.event_bus import RedisStreamEventBus
        from apps.core.cache_service import CacheService

        event_types = [
            "user.registered",
            "course.enrolled",
            "payment.completed",
            "lesson.completed",
            "test.submitted",
            "badge.earned",
        ]

        health_data = {}
        for event_type in event_types:
            info = RedisStreamEventBus.get_stream_info(event_type)
            health_data[event_type] = info

        # Cache health data for monitoring dashboard
        CacheService.set("event_bus:health", health_data, ttl=300)

        # Check for consumer lag
        for event_type, info in health_data.items():
            if isinstance(info, dict) and info.get("length", 0) > 10000:
                logger.warning(
                    f"Event stream lag detected: {event_type} has {info['length']} pending messages"
                )

        logger.debug("Event bus health check completed")

    except Exception as e:
        logger.error(f"Event bus health monitoring failed: {e}")


# Task to reprocess dead letter queue
@shared_task(bind=True, max_retries=3)
def reprocess_dead_letter_queue(self, event_type: str = None):
    """Reprocess events from dead letter queue."""
    try:
        from apps.core.event_bus import RedisStreamEventBus
        import redis
        from django.conf import settings

        if not settings.REDIS_URL:
            return "Redis not configured"

        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        dlq_key = "dlq:learninghub"

        # Get pending DLQ messages
        messages = redis_client.xrange(dlq_key, count=100)

        reprocessed = 0
        for msg_id, data in messages:
            payload = data.get("payload")
            if not payload:
                continue

            try:
                event = eval(payload) if isinstance(payload, str) else payload

                # Check if we should filter by event_type
                if event_type and event.get("type") != event_type:
                    continue

                # Retry if retry count < 3
                if event.get("retry_count", 0) < 3:
                    # Re-publish to original stream
                    stream_name = f"events:{event['type']}"
                    event["retry_count"] = event.get("retry_count", 0) + 1
                    redis_client.xadd(
                        stream_name,
                        {
                            "id": event["id"],
                            "type": event["type"],
                            "correlation_id": event["correlation_id"],
                            "timestamp": event["timestamp"],
                            "data": str(event["data"]),
                            "source": event["source"],
                        },
                    )

                    # Remove from DLQ
                    redis_client.xdel(dlq_key, msg_id)
                    reprocessed += 1

            except Exception as e:
                logger.error(f"Failed to reprocess DLQ message {msg_id}: {e}")

        return f"Reprocessed {reprocessed} messages"

    except Exception as e:
        logger.error(f"DLQ reprocessing failed: {e}")
        raise self.retry(exc=e, countdown=60)


# Startup task for cache warming
@shared_task(bind=True, ignore_result=True)
def warm_caches_on_startup(self):
    """Warm critical caches on application startup."""
    try:
        from apps.core.cache_service import cache_warmer
        from apps.courses.models import Category
        from apps.gamification.models import Badge

        def warm_categories():
            return list(
                Category.objects.filter(is_active=True).values(
                    "id", "name", "slug", "icon"
                )
            )

        def warm_badges():
            return list(
                Badge.objects.filter(is_active=True).values(
                    "id", "name", "description", "icon", "xp_reward"
                )
            )

        cache_warmer.register("categories", warm_categories, ttl=3600)
        cache_warmer.register("badges", warm_badges, ttl=3600)

        cache_warmer.warm_all()
        logger.info("Cache warming completed on startup")

    except Exception as e:
        logger.error(f"Cache warming failed: {e}")


# Cleanup task for old events
@shared_task(bind=True)
def cleanup_old_event_streams(self, days: int = 30):
    """Clean up old event stream entries (trim streams)."""
    try:
        from apps.core.event_bus import RedisStreamEventBus
        import redis
        from django.conf import settings

        if not settings.REDIS_URL:
            return "Redis not configured"

        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

        event_types = [
            "user.registered",
            "course.enrolled",
            "payment.completed",
            "lesson.completed",
            "test.submitted",
            "badge.earned",
            "security.threat_detected",
            "system.alert",
        ]

        trimmed = 0
        for event_type in event_types:
            stream_name = f"events:{event_type}"
            # Trim to last 10000 entries (approx 30 days for most streams)
            result = redis_client.xtrim(stream_name, maxlen=10000, approximate=True)
            trimmed += result

        # Also trim DLQ
        dlq_key = "dlq:learninghub"
        redis_client.xtrim(dlq_key, maxlen=5000, approximate=True)

        logger.info(f"Event stream cleanup: trimmed {trimmed} old entries")
        return f"Trimmed {trimmed} old entries"

    except Exception as e:
        logger.error(f"Event stream cleanup failed: {e}")
        raise
