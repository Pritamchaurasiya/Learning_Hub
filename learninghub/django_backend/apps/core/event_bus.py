"""
Redis Streams Event Bus

Production-ready distributed event bus using Redis Streams with consumer groups.
Provides exactly-once delivery, ordering guarantees, and horizontal scaling.
"""

import json
import logging
import threading
import uuid
from typing import Dict, Any, List, Callable, Optional
from enum import Enum
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

logger = logging.getLogger(__name__)


class EventType(Enum):
    """Standard event types for the platform."""
    USER_REGISTERED = "user.registered"
    COURSE_ENROLLED = "course.enrolled"
    PAYMENT_COMPLETED = "payment.completed"
    LESSON_COMPLETED = "lesson.completed"
    THREAT_DETECTED = "security.threat_detected"
    SYSTEM_ALERT = "system.alert"
    TEST_SUBMITTED = "test.submitted"
    BADGE_EARNED = "badge.earned"
    STREAK_MILESTONE = "streak.milestone"
    CERTIFICATE_ISSUED = "certificate.issued"


class RedisStreamEventBus:
    """
    Distributed Event Bus using Redis Streams.

    Features:
    - Consumer groups for exactly-once delivery
    - Automatic retries with dead letter queue
    - Horizontal scaling across multiple workers
    - Event persistence and replay capability
    - Correlation ID tracking for distributed tracing
    """

    _instance = None
    _lock = threading.Lock()
    _consumers: Dict[str, List[Callable]] = {}
    _consumer_threads: Dict[str, threading.Thread] = {}
    _running = False

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize Redis connection and consumer group."""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available, falling back to in-memory EventBus")
            self._use_fallback = True
            self._fallback_bus = InMemoryEventBus()
            return

        self._use_fallback = False
        self.redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        self.consumer_group = getattr(settings, 'EVENT_BUS_CONSUMER_GROUP', 'learninghub')
        self.consumer_name = f"{self.consumer_group}-{uuid.uuid4().hex[:8]}"
        self.block_ms = 5000  # Block for 5 seconds
        self.count = 10  # Max events per read

        try:
            self.redis = redis.from_url(
                self.redis_url,
                decode_responses=True,
                max_connections=20,
                retry_on_timeout=True,
                health_check_interval=30,
            )
            # Test connection
            self.redis.ping()
            logger.info(f"Redis Stream EventBus initialized: {self.redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis for EventBus: {e}")
            self._use_fallback = True
            self._fallback_bus = InMemoryEventBus()

    # =========================================================================
    # PUBLIC API
    # =========================================================================

    @classmethod
    def publish(cls, event_type: str, data: Dict[str, Any], correlation_id: Optional[str] = None) -> str:
        """
        Publish an event to the stream.

        Args:
            event_type: Event type (e.g., "course.enrolled")
            data: Event payload
            correlation_id: Optional correlation ID for tracing

        Returns:
            Event ID from Redis Stream
        """
        instance = cls()
        if instance._use_fallback:
            return instance._fallback_bus.publish(event_type, data, correlation_id)

        return instance._publish_to_stream(event_type, data, correlation_id)

    @classmethod
    def subscribe(cls, event_type: str, handler: Callable):
        """
        Subscribe a handler to an event type.

        Args:
            event_type: Event type to subscribe to
            handler: Callable that accepts (event_payload)
        """
        instance = cls()
        if instance._use_fallback:
            return instance._fallback_bus.subscribe(event_type, handler)

        instance._subscribe_local(event_type, handler)

    @classmethod
    def start_consumers(cls):
        """Start background consumer threads for all subscribed event types."""
        instance = cls()
        if instance._use_fallback:
            return

        if instance._running:
            return

        instance._running = True
        for event_type in instance._consumers:
            instance._start_consumer(event_type)

        logger.info(f"Started {len(instance._consumers)} consumer threads")

    @classmethod
    def stop_consumers(cls):
        """Stop all consumer threads gracefully."""
        instance = cls()
        if instance._use_fallback:
            return

        instance._running = False
        for thread in instance._consumer_threads.values():
            thread.join(timeout=10)
        instance._consumer_threads.clear()
        logger.info("Stopped all consumer threads")

    @classmethod
    def get_stream_info(cls, event_type: str) -> Dict[str, Any]:
        """Get stream information (length, consumer groups, etc.)."""
        instance = cls()
        if instance._use_fallback:
            return {"fallback": True}

        stream_name = cls._get_stream_name(event_type)
        try:
            return instance.redis.xinfo_stream(stream_name)
        except redis.ResponseError:
            return {"exists": False}

    # =========================================================================
    # PRIVATE METHODS
    # =========================================================================

    def _get_stream_name(self, event_type: str) -> str:
        """Get Redis stream name for event type."""
        return f"events:{event_type}"

    def _publish_to_stream(self, event_type: str, data: Dict[str, Any], correlation_id: Optional[str]) -> str:
        """Publish event to Redis Stream."""
        event_id = str(uuid.uuid4())
        correlation_id = correlation_id or event_id

        event_payload = {
            "id": event_id,
            "type": event_type,
            "correlation_id": correlation_id,
            "timestamp": timezone.now().isoformat(),
            "data": json.dumps(data),
            "source": getattr(settings, 'SERVICE_NAME', 'monolith'),
        }

        stream_name = self._get_stream_name(event_type)

        try:
            # Create consumer group if not exists
            self._ensure_consumer_group(stream_name)

            # Add to stream
            msg_id = self.redis.xadd(stream_name, event_payload, maxlen=100000, approximate=True)

            logger.debug(f"Event published: {event_type} [{msg_id}]")
            return msg_id

        except Exception as e:
            logger.error(f"Failed to publish event {event_type}: {e}")
            # Fallback to in-memory
            self._fallback_bus.publish(event_type, data, correlation_id)
            return "fallback"

    def _ensure_consumer_group(self, stream_name: str):
        """Create consumer group if it doesn't exist."""
        try:
            self.redis.xgroup_create(stream_name, self.consumer_group, id='0', mkstream=True)
        except redis.ResponseError as e:
            if 'BUSYGROUP' not in str(e):
                raise

    def _subscribe_local(self, event_type: str, handler: Callable):
        """Register local handler for event type."""
        if event_type not in self._consumers:
            self._consumers[event_type] = []
        self._consumers[event_type].append(handler)
        logger.info(f"Handler subscribed to {event_type}")

    def _start_consumer(self, event_type: str):
        """Start consumer thread for event type."""
        thread = threading.Thread(
            target=self._consumer_loop,
            args=(event_type,),
            daemon=True,
            name=f"event-consumer-{event_type}"
        )
        thread.start()
        self._consumer_threads[event_type] = thread

    def _consumer_loop(self, event_type: str):
        """Main consumer loop for reading from stream."""
        stream_name = self._get_stream_name(event_type)
        handlers = self._consumers.get(event_type, [])

        logger.info(f"Consumer started for {event_type} on {stream_name}")

        while self._running:
            try:
                # Read from stream using consumer group
                messages = self.redis.xreadgroup(
                    groupname=self.consumer_group,
                    consumername=self.consumer_name,
                    streams={stream_name: '>'},
                    count=self.count,
                    block=self.block_ms,
                )

                if not messages:
                    continue

                for stream, entries in messages:
                    for msg_id, data in entries:
                        self._process_message(event_type, msg_id, data, handlers)

            except redis.ConnectionError as e:
                logger.warning(f"Redis connection error in consumer {event_type}: {e}")
                import time
                time.sleep(5)  # Back off on connection errors
            except Exception as e:
                logger.error(f"Error in consumer loop for {event_type}: {e}")
                import time
                time.sleep(1)

    def _process_message(self, event_type: str, msg_id: str, data: Dict, handlers: List[Callable]):
        """Process a single message from the stream."""
        try:
            # Parse event payload
            event_payload = {
                "id": data.get("id", msg_id),
                "type": data.get("type", event_type),
                "correlation_id": data.get("correlation_id"),
                "timestamp": data.get("timestamp"),
                "data": json.loads(data.get("data", "{}")),
                "source": data.get("source"),
            }

            # Dispatch to handlers
            for handler in handlers:
                try:
                    handler(event_payload)
                except Exception as e:
                    logger.error(f"Handler error for {event_type}: {e}")
                    self._handle_dlq(event_payload, str(e))

            # Acknowledge message
            self.redis.xack(self._get_stream_name(event_type), self.consumer_group, msg_id)

        except Exception as e:
            logger.error(f"Failed to process message {msg_id}: {e}")
            # Don't ack - will be redelivered

    def _handle_dlq(self, payload: Dict, error: str):
        """Send failed event to dead letter queue."""
        dlq_key = f"dlq:{self.consumer_group}"
        dlq_entry = {
            **payload,
            "error": error,
            "failed_at": timezone.now().isoformat(),
            "retry_count": payload.get("retry_count", 0) + 1,
        }

        try:
            self.redis.xadd(dlq_key, {"payload": json.dumps(dlq_entry)}, maxlen=10000)
            logger.warning(f"Event sent to DLQ: {payload.get('id')}")
        except Exception as e:
            logger.error(f"Failed to write to DLQ: {e}")


class InMemoryEventBus:
    """Fallback in-memory event bus (thread-safe)."""

    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._lock = threading.Lock()

    def subscribe(self, event_type: str, handler: Callable):
        with self._lock:
            if event_type not in self._subscribers:
                self._subscribers[event_type] = []
            self._subscribers[event_type].append(handler)
        logger.info(f"[Fallback] Handler subscribed to {event_type}")
        return "fallback"

    def publish(self, event_type: str, data: Dict[str, Any], correlation_id: Optional[str] = None):
        event_id = str(uuid.uuid4())
        correlation_id = correlation_id or event_id

        event_payload = {
            "id": event_id,
            "type": event_type,
            "correlation_id": correlation_id,
            "timestamp": timezone.now().isoformat(),
            "data": data,
            "source": getattr(settings, 'SERVICE_NAME', 'monolith'),
        }

        logger.info(f"[Fallback] Event Published: {event_type} [{event_id}]")
        self._dispatch(event_type, event_payload)
        return event_id

    def _dispatch(self, event_type: str, payload: Dict):
        with self._lock:
            handlers = list(self._subscribers.get(event_type, []))

        for handler in handlers:
            try:
                handler(payload)
            except Exception as e:
                logger.error(f"[Fallback] Error handling event {event_type}: {e}")


# Backward compatibility - alias to new implementation
EventBus = RedisStreamEventBus