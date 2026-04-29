from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'

    def ready(self):
        """Wire event bus subscribers and signal handlers on startup."""
        try:
            from apps.core.event_subscribers import register_all_subscribers
            register_all_subscribers()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"EventBus subscriber registration deferred: {e}"
            )
        
        # Import signal handlers to connect them
        try:
            import apps.core.signal_handlers  # noqa: F401
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Signal handlers registration deferred: {e}"
            )
