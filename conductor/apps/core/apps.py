from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'

    def ready(self):
        """Wire event bus subscribers, signal handlers, and observability on startup."""
        # Event Bus subscribers
        try:
            from apps.core.event_subscribers import register_all_subscribers
            register_all_subscribers()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"EventBus subscriber registration deferred: {e}"
            )
        
        # Signal handlers
        try:
            import apps.core.signal_handlers  # noqa: F401
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Signal handlers registration deferred: {e}"
            )
        
        # Observability integrations (OpenTelemetry, Sentry)
        try:
            from apps.core.observability.otel_integration import init_opentelemetry
            init_opentelemetry()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"OpenTelemetry initialization deferred: {e}"
            )
        
        try:
            from apps.core.observability.sentry_integration import init_sentry
            init_sentry()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Sentry initialization deferred: {e}"
            )
