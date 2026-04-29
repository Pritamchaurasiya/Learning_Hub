"""Config package."""

# Monkeypatch platform WMI query to prevent Celery import hanging on Windows
import platform
import sys
if sys.platform == 'win32':
    platform._wmi_query = lambda *args, **kwargs: ("10", "1", "Multiprocessor Free", "10", "0")

# Import Celery app so it's loaded when Django starts
from .celery import app as celery_app

__all__ = ("celery_app",)
