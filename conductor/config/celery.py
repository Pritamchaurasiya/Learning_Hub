"""
Celery configuration for Learning Hub Backend.
"""

import os

from celery import Celery

# Set default Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("learning_hub")

# Load config from Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all registered apps
app.autodiscover_tasks()

# Celery configuration
app.conf.update(
    # Broker settings
    broker_connection_retry_on_startup=True,
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Rate limits
    task_default_rate_limit="100/m",
    # Logging
    worker_hijack_root_logger=False,
)


@app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    print(f"Request: {self.request!r}")
