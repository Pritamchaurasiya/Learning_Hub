from django.apps import AppConfig


class AiEngineConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ai_engine"
    verbose_name = "AI Engine"

    def ready(self):
        import apps.ai_engine.signals  # noqa: F401
        from apps.ai_engine.cache.semantic_cache_invalidator import register_cache_invalidation_signals
        register_cache_invalidation_signals()
