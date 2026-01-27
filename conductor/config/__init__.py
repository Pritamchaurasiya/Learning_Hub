"""Config package."""

# Import Celery app so it's loaded when Django starts
try:
    from .celery import app as celery_app
except ImportError:
    # Allow running without Celery (e.g. for testing/dev without partial deps)
    celery_app = None

__all__ = ("celery_app",)
