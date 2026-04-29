
import json
import logging
from typing import Optional, Dict, Any
from .ai_client import AIClient
from .models import ResearchQuiz, QuizQuestion, QuizChoice

logger = logging.getLogger(__name__)

class QuizService:
    """
    Service to generate quizzes from learning content using AI.
    """

    @staticmethod
    def get_or_generate_quiz(module_slug: str, module_content: str) -> Optional[ResearchQuiz]:
        """
        Retrieves an existing quiz or generates a new one using AI.
        """
        try:
            # 1. Check DB
            return ResearchQuiz.objects.prefetch_related('questions__choices').get(module_slug=module_slug)
        except ResearchQuiz.DoesNotExist:
            # 2. Generate
            logger.info(f"Generating new quiz for '{module_slug}'")
            return QuizService._generate_and_save_quiz(module_slug, module_content)

    @staticmethod
    def _generate_and_save_quiz(module_slug: str, content: str) -> Optional[ResearchQuiz]:
        client = AIClient.get_client()
        if not client:
            logger.error("AI Client unavailable for quiz generation")
            return None

        # Truncate content if too long (token limits) - Gemini 2.0 has huge context but let's be safe
        truncated_content = content[:20000] 

        prompt = f"""
        You are a rigorous Academic Examiner. Create a multiple-choice quiz based on the following learning material.
        
        Material:
        "{truncated_content}..."
        
        Requirements:
        1. Generate 5 challenging questions.
        2. Questions must test conceptual understanding, not just recall.
        3. Provide 4 choices per question.
        4. Mark exactly one choice as correct.
        
        Output JSON ONLY:
        {{
            "title": "Module Quiz",
            "xp_reward": 100,
            "questions": [
                {{
                    "text": "Question text...",
                    "choices": [
                        {{"text": "Option A", "is_correct": false}},
                        {{"text": "Option B", "is_correct": true}},
                        ...
                    ]
                }}
            ]
        }}
        """

        try:
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
                config={'response_mime_type': 'application/json'}
            )
            
            if not response.text:
                raise ValueError("Empty response from AI")

            data = json.loads(response.text)
            
            # Save to DB
            quiz = ResearchQuiz.objects.create(
                module_slug=module_slug,
                title=data.get('title', 'Generated Quiz'),
                xp_reward=data.get('xp_reward', 100)
            )
            
            for idx, q_data in enumerate(data.get('questions', [])):
                question = QuizQuestion.objects.create(
                    quiz=quiz,
                    text=q_data['text'],
                    order=idx
                )
                for c_data in q_data.get('choices', []):
                    QuizChoice.objects.create(
                        question=question,
                        text=c_data['text'],
                        is_correct=c_data['is_correct']
                    )
            
            return quiz

        except Exception as e:
            logger.error(f"Error generating quiz: {e}")
            return None
