"""LearningHub Server Package."""

import platform
import sys

if sys.platform == "win32":
    platform._wmi_query = lambda *args, **kwargs: ("10", "1", "Multiprocessor Free", "10", "0")

from .celery import app as celery_app

__all__ = ("celery_app",)
