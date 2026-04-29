from django.apps import AppConfig


class StudyGroupsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.study_groups'

    def ready(self):
        """
        Dynamically imports the Study Group signals file when the app starts.
        This enables background Celery tasks (like Welcome Emails) to listen for ORM saves.
        """
        import apps.study_groups.signals

