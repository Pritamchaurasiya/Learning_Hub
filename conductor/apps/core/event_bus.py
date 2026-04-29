"""
Global Event Bus Service

Decoupled communication between micro-services/modules.
1. Publish/Subscribe Pattern
2. Asynchronous Event Processing
3. Event Persistence (Mocked)
4. Dead Letter Queue
"""

import logging
import uuid
import threading
from typing import Dict, Any, List, Callable, Optional
from enum import Enum
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)


class EventType(Enum):
    USER_REGISTERED = "user.registered"
    COURSE_ENROLLED = "course.enrolled"
    PAYMENT_COMPLETED = "payment.completed"
    LESSON_COMPLETED = "lesson.completed"
    THREAT_DETECTED = "security.threat_detected"
    SYSTEM_ALERT = "system.alert"


class EventBus:
    """
    In-process Event Bus (Production should use RabbitMQ/Kafka/Redis).
    Thread-safe subscriber management with Lock.
    """
    
    _subscribers: Dict[str, List[Callable]] = {}
    _lock = threading.Lock()
    
    @classmethod
    def subscribe(cls, event_type: str, handler: Callable):
        """Subscribe a handler to an event type (thread-safe)."""
        with cls._lock:
            if event_type not in cls._subscribers:
                cls._subscribers[event_type] = []
            cls._subscribers[event_type].append(handler)
        logger.info(f"Handler subscribed to {event_type}")

    @classmethod
    def publish(cls, event_type: str, data: Dict[str, Any], correlation_id: Optional[str] = None):
        """Publish an event to all subscribers."""
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
        
        logger.info(f"Event Published: {event_type} [{event_id}]")
        cls._dispatch(event_type, event_payload)

    @classmethod
    def _dispatch(cls, event_type: str, payload: Dict):
        """Dispatch event to local subscribers (thread-safe snapshot read)."""
        with cls._lock:
            handlers = list(cls._subscribers.get(event_type, []))
        for handler in handlers:
            try:
                handler(payload)
            except Exception as e:
                logger.error(f"Error handling event {event_type}: {e}")
                cls._handle_dlq(payload, str(e))

    @classmethod
    def _handle_dlq(cls, payload: Dict, error: str):
        """Handle failed events — log to Dead Letter Queue."""
        logger.error(f"Event failed irreversibly: {payload.get('id')} - {error}")
