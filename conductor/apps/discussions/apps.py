from django.apps import AppConfig


class DiscussionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.discussions'
    verbose_name = 'Discussion Forum'

    def ready(self):
        import apps.discussions.signals # noqa

