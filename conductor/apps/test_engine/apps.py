from django.apps import AppConfig


class TestEngineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.test_engine'
    verbose_name = 'Test Engine'
