
from .ai_client import AIClient
from apps.courses.models import Course, Module, Lesson, Category
from django.db import transaction
from django.utils.text import slugify
import logging

logger = logging.getLogger(__name__)

class CurriculumService:
    """Service for handling AI-generated curriculum."""
    
    @staticmethod
    def generate_curriculum(topic: str):
        """
        Generates a course structure using AI.
        Returns the raw JSON data (does not save to DB yet).
        """
        return AIClient.generate_course_outline(topic) or {"error": "Failed to generate course content."}

    @staticmethod
    def save_curriculum_to_db(user, curriculum_data):
        """
        Persists the generated curriculum to the database.
        """
        title = curriculum_data.get('title', 'AI Generated Course')
        description = curriculum_data.get('description', '')
        learning_objectives = curriculum_data.get('learning_objectives', [])
        
        # Determine category (AI Category Detection could be another feature, simplified here)
        category, _ = Category.objects.get_or_create(
            name="AI Generated",
            defaults={"slug": "ai-generated"}
        )
        
        with transaction.atomic():
            # 1. Create Course
            course = Course.objects.create(
                instructor=user,
                title=title,
                description=description,
                short_description=description[:297] + "...",
                category=category,
                learning_objectives=learning_objectives,
                is_published=False,  # Draft mode by default
                price=0, # Default to free
                difficulty='beginner' # Default
            )
            
            # 2. Modules & Lessons
            modules_data = curriculum_data.get('modules', [])
            for m_idx, m_data in enumerate(modules_data):
                module = Module.objects.create(
                    course=course,
                    title=m_data.get('title', f"Module {m_idx+1}"),
                    description=m_data.get('description', ''),
                    order=m_idx
                )
                
                lessons_data = m_data.get('lessons', [])
                for l_idx, l_data in enumerate(lessons_data):
                    content = l_data.get('text_content', '')
                    description = l_data.get('description', '')
                    
                    # Prepend description to content if it exists, as Lesson has no description field
                    if description:
                        content = f"**Overview**: {description}\n\n{content}"

                    # Auto-detect content detection if not specified
                    c_type = l_data.get('content_type', 'text').lower()
                    if c_type not in ['text', 'video', 'quiz']:
                        c_type = 'text'
                        
                    Lesson.objects.create(
                        module=module,
                        title=l_data.get('title', f"Lesson {l_idx+1}"),
                        # No description field on Lesson model
                        text_content=content,
                        content_type=c_type,
                        order=l_idx,
                        duration_minutes=10 # Estimate
                    )
            
            # 3. Embedding (Async or Direct)
            # Signal will handle 'embedding' generation on save, but we can also trigger it explicitly 
            # if we want the "course description" embedded right away. 
            # The signal I added in Phase 11 triggers on post_save of Course.
            
            return course
