
import logging
from apps.ai_engine.ai_client import AIClient

logger = logging.getLogger(__name__)

class TranslationService:
    """
    Service for AI-powered content translation.
    """
    
    @staticmethod
    def translate_text(text: str, target_language: str) -> str:
        """
        Translates text to target language using GenAI.
        Preserves Markdown formatting.
        """
        if not text:
            return ""

        client = AIClient.get_client()
        if not client:
            logger.warning("AI Client unavailable for translation.")
            return text

        try:
            prompt = f"""
            You are a professional translator. 
            Translate the following text to {target_language}.
            
            IMPORTANT RULES:
            1. Preserve all Markdown formatting (bold, italics, code blocks).
            2. Do NOT translate code inside code blocks.
            3. Maintain the original tone (Educational/Professional).
            4. Output ONLY the translated text.

            Text to Translate:
            {text}
            """
            
            response = client.models.generate_content(
                model='gemini-1.5-flash', # Fast model is sufficient
                contents=prompt
            )

            if response.text:
                return response.text.strip()
            
            return text

        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return text

    @staticmethod
    def translate_course(course_id: int, target_language: str):
        """
        Translates a full course structure.
        Note: In a real app, we would store translations in a separate table (e.g. django-modeltranslation).
        For this God Mode Demo, we will just print the result or return a localized JSON structure
        to avoid destroying the original data.
        """
        from apps.courses.models import Course
        
        try:
            course = Course.objects.get(id=course_id)
            logger.info(f"Translating Course '{course.title}' to {target_language}...")
            
            translated_data = {
                "course_id": course.id,
                "language": target_language,
                "title": TranslationService.translate_text(course.title, target_language),
                "description": TranslationService.translate_text(course.description, target_language),
                "modules": []
            }
            
            for module in course.modules.all():
                m_data = {
                    "title": TranslationService.translate_text(module.title, target_language),
                    "description": TranslationService.translate_text(module.description, target_language),
                    "lessons": []
                }
                
                for lesson in module.lessons.all():
                    l_data = {
                        "title": TranslationService.translate_text(lesson.title, target_language),
                        "content": TranslationService.translate_text(lesson.text_content, target_language)
                    }
                    m_data["lessons"].append(l_data)
                    
                translated_data["modules"].append(m_data)
                
            return translated_data
            
        except Exception as e:
            logger.error(f"Course Translation failed: {e}")
            return None
