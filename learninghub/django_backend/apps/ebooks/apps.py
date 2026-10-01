from django.apps import AppConfig


class EbooksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ebooks"
    verbose_name = "Ebooks & Digital Library"

    def ready(self):
        import apps.ebooks.signals  # noqa
