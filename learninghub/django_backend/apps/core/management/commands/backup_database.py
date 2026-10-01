import os
import gzip
import json
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core import serializers
from apps.users.models import User
from apps.courses.models import Course, Chapter, Lesson
from apps.problems.models import Problem, TestCase
from apps.tests_engine.models import Test, Question, Option
from apps.gamification.models import Badge

class Command(BaseCommand):
    help = 'Generates an automated, timestamped, compressed database backup JSON snapshot'

    def add_arguments(self, parser):
        parser.add_argument('--output-dir', type=str, default='backups', help='Output directory for backup snapshots')

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"learninghub_backup_{timestamp}.json.gz"
        filepath = os.path.join(output_dir, filename)

        models_to_backup = [User, Course, Chapter, Lesson, Problem, TestCase, Test, Question, Option, Badge]
        all_objects = []

        for model in models_to_backup:
            try:
                for obj in model.objects.all():
                    all_objects.append(obj)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not export model {model.__name__}: {e}"))

        serialized_data = serializers.serialize('json', all_objects, indent=2)

        with gzip.open(filepath, 'wt', encoding='utf-8') as gz_file:
            gz_file.write(serialized_data)

        file_size_kb = round(os.path.getsize(filepath) / 1024, 2)
        self.stdout.write(self.style.SUCCESS(
            f"Successfully created database snapshot: {filepath} ({len(all_objects)} records, {file_size_kb} KB compressed)"
        ))
