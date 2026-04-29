import os
import json
import logging
from typing import List, Dict, Optional
from google import genai
from django.conf import settings

logger = logging.getLogger(__name__)


class ContentGenerator:
    """
    Phase 55: Generative Adaptive Content Factory.
    
    Uses Gemini 2.0 Flash to autonomously synthesize personalized learning
    materials (quizzes, flashcards) targeted at specific knowledge gaps
    identified by the Deep Knowledge Tracing engine.
    """
    _client = None

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            api_key = os.getenv("GEMINI_API_KEY")
            if api_key:
                cls._client = genai.Client(api_key=api_key)
            else:
                logger.warning("GEMINI_API_KEY not set. ContentGenerator disabled.")
        return cls._client

    @classmethod
    def generate_targeted_quiz(
        cls,
        topic: str,
        difficulty: str = "intermediate",
        num_questions: int = 5
    ) -> Optional[List[Dict]]:
        """
        Synthesizes a multiple-choice quiz tailored to a specific topic and difficulty.
        
        Args:
            topic: The conceptual domain (e.g., "Python List Comprehensions").
            difficulty: One of 'beginner', 'intermediate', 'advanced'.
            num_questions: Number of questions to generate.
            
        Returns:
            A list of question dictionaries with keys:
            [question, options (list of 4), correct_answer, explanation]
        """
        client = cls._get_client()
        if not client:
            return None

        prompt = f"""You are an expert educational content creator.
Generate exactly {num_questions} multiple-choice questions on the topic: "{topic}".
Difficulty level: {difficulty}.

Rules:
1. Each question must have exactly 4 options labeled A, B, C, D.
2. Only one option is correct.
3. Include a brief explanation for the correct answer.
4. Questions should test deep understanding, not trivial recall.

Return ONLY a valid JSON array. Each element must have this exact structure:
{{
    "question": "The question text",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A",
    "explanation": "Brief explanation of why this is correct."
}}

Return the raw JSON array only. No markdown, no code fences, no extra text."""

        try:
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt
            )
            raw_text = str(response.text).strip()

            # Strip markdown fences if the model wraps them
            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[-1]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3].strip()

            quiz_data = json.loads(raw_text)

            # Validate structure
            if not isinstance(quiz_data, list):
                logger.error("ContentGenerator: Quiz response is not a list.")
                return None

            for q in quiz_data:
                required_keys = {"question", "options", "correct_answer", "explanation"}
                if not required_keys.issubset(q.keys()):
                    logger.error("ContentGenerator: Quiz question missing required keys.")
                    return None

            logger.info(
                "ContentGenerator: Generated %d questions for topic '%s'.",
                len(quiz_data), topic
            )
            return quiz_data

        except json.JSONDecodeError as e:
            logger.error("ContentGenerator: Failed to parse quiz JSON: %s", str(e))
            return None
        except Exception as e:
            logger.error("ContentGenerator: Quiz generation failed: %s", str(e))
            return None

    @classmethod
    def generate_flashcards(
        cls,
        module_content: str,
        max_cards: int = 10
    ) -> Optional[List[Dict]]:
        """
        Parses course material into spaced-repetition flashcard JSONs.
        
        Args:
            module_content: Raw text content of the learning module.
            max_cards: Maximum number of flashcards to generate.
            
        Returns:
            A list of flashcard dictionaries with keys:
            [front, back, difficulty, tags]
        """
        client = cls._get_client()
        if not client:
            return None

        # Truncate to avoid token overflow
        truncated_content = module_content[:8000]

        prompt = f"""You are an expert educational content creator specializing in spaced-repetition learning.

Given the following learning material, generate up to {max_cards} flashcards.
Each flashcard should test one specific concept from the material.

Material:
---
{truncated_content}
---

Rules:
1. The "front" is a clear, concise question or prompt.
2. The "back" is a precise, memorable answer (1-3 sentences max).
3. Assign a difficulty: "easy", "medium", or "hard".
4. Add 1-3 relevant topic tags.

Return ONLY a valid JSON array. Each element must have this exact structure:
{{
    "front": "Question or prompt text",
    "back": "Answer text",
    "difficulty": "medium",
    "tags": ["tag1", "tag2"]
}}

Return the raw JSON array only. No markdown, no code fences, no extra text."""

        try:
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt
            )
            raw_text = str(response.text).strip()

            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[-1]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3].strip()

            flashcard_data = json.loads(raw_text)

            if not isinstance(flashcard_data, list):
                logger.error("ContentGenerator: Flashcard response is not a list.")
                return None

            for card in flashcard_data:
                if "front" not in card or "back" not in card:
                    logger.error("ContentGenerator: Flashcard missing front/back.")
                    return None

            logger.info(
                "ContentGenerator: Generated %d flashcards.", len(flashcard_data)
            )
            return flashcard_data

        except json.JSONDecodeError as e:
            logger.error("ContentGenerator: Failed to parse flashcard JSON: %s", str(e))
            return None
        except Exception as e:
            logger.error("ContentGenerator: Flashcard generation failed: %s", str(e))
            return None

    @classmethod
    def generate_remediation_content(
        cls,
        user_id: int,
        weaknesses: Dict[str, float]
    ) -> Dict[str, List[Dict]]:
        """
        Orchestrates the full adaptive content loop:
        1. Takes weaknesses from `KnowledgeTracer.analyze_global_gaps`.
        2. Generates targeted quizzes for every weak domain.
        
        Args:
            user_id: The student's ID.
            weaknesses: Dict mapping domain -> mastery score (all < 0.6).
            
        Returns:
            Dict mapping domain -> list of generated quiz questions.
        """
        remediation_map = {}

        for domain, mastery_score in weaknesses.items():
            # Map mastery to difficulty
            if mastery_score < 0.3:
                difficulty = "beginner"
            elif mastery_score < 0.5:
                difficulty = "intermediate"
            else:
                difficulty = "advanced"

            quiz = cls.generate_targeted_quiz(
                topic=domain,
                difficulty=difficulty,
                num_questions=5
            )

            if quiz:
                remediation_map[domain] = quiz
                logger.info(
                    "ContentGenerator: Remediation quiz generated for user %d, domain '%s' (mastery=%.2f).",
                    user_id, domain, mastery_score
                )

        return remediation_map
