import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class DsaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.dsa'

    def ready(self):
        import apps.dsa.signals  # noqa: F401
        logger.info("DSA signals registered successfully")

