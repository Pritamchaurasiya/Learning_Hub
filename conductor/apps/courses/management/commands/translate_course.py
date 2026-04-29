
from django.core.management.base import BaseCommand
from apps.core.translation_service import TranslationService
import json

class Command(BaseCommand):
    help = 'Translates a course to a target language using AI.'

    def add_arguments(self, parser):
        parser.add_argument('course_id', type=int, help='ID of the course to translate')
        parser.add_argument('language', type=str, help='Target language (e.g., Hindi, Spanish, French)')
        parser.add_argument('--output', type=str, help='Output file path', default='translated_course.json')

    def handle(self, *args, **options):
        course_id = options['course_id']
        language = options['language']
        output_file = options['output']

        self.stdout.write(f"🌍 Starting translation for Course {course_id} to {language}...")
        
        result = TranslationService.translate_course(course_id, language)
        
        if result:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            self.stdout.write(self.style.SUCCESS(f"✅ Translation complete! Saved to {output_file}"))
        else:
            self.stdout.write(self.style.ERROR("❌ Translation failed or course not found."))
