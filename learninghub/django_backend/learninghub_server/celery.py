"""
Celery configuration for Learning Hub Backend.
"""

import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "learninghub_server.settings")

app = Celery("learninghub_server")

# Load config from Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all registered apps
app.autodiscover_tasks()

app.conf.update(
    broker_connection_retry_on_startup=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_queues={
        "default": {"exchange": "default", "routing_key": "default"},
        "ai_computation": {"exchange": "ai_computation", "routing_key": "ai_computation"},
    },
    task_routes={
        "apps.ai_engine.*": {"queue": "ai_computation"},
        "apps.ai_tutor.*": {"queue": "ai_computation"},
        "*": {"queue": "default"},
    },
    task_time_limit=300,
    task_soft_time_limit=240,
    worker_prefetch_multiplier=1,
    task_default_rate_limit="100/m",
    worker_hijack_root_logger=False,
    beat_schedule={
        "check-expired-attempts-every-minute": {
            "task": "apps.test_engine.tasks.check_expired_attempts",
            "schedule": 60.0,
        },
        "cleanup-abandoned-attempts-every-hour": {
            "task": "apps.test_engine.tasks.cleanup_abandoned_attempts",
            "schedule": 3600.0,
        },
        "poll-student-updates-active-sources": {
            "task": "apps.updates.tasks.poll_all_active_sources",
            "schedule": 1800.0,  # Every 30 minutes
        },
        "dispatch-student-deadline-reminders": {
            "task": "apps.updates.tasks.dispatch_deadline_reminders",
            "schedule": 300.0,   # Every 5 minutes
        },
    },
)
