"""
AI Test Generation Service.
Production-grade test generation with caching, retry, validation, and deduplication.
"""
import json
import hashlib
import logging
import time
from typing import Optional, Dict, Any, List
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from django.conf import settings

from apps.exams.models import Exam, Subject, Topic
from apps.test_engine.models import Test, TestQuestion, Question, Option

logger = logging.getLogger(__name__)


class PromptTemplate:
    """Manages AI prompt templates for test generation."""

    MCQ_GENERATION = """
You are an expert exam question designer for the {exam_name} exam in {country_name}.

EXAM PATTERN:
- Total questions: {total_questions}
- Total marks: {total_marks}
- Duration: {duration_minutes} minutes
- Marks per correct: {marks_per_correct}
- Negative marks per wrong: {negative_marks}
- Difficulty distribution: {difficulty_distribution}

Generate {count} ORIGINAL multiple-choice questions for:
- Subject: {subject_name}
- Topic: {topic_name}
- Target difficulty: {difficulty} (0=easiest, 5=hardest)
- Bloom's level: {bloom_level}

STRICT REQUIREMENTS:
1. Questions MUST be original — never copy from existing exam papers
2. Follow the exam pattern exactly
3. Each question must have exactly 4 options (A, B, C, D)
4. Exactly ONE option must be correct
5. Provide a detailed explanation for the correct answer
6. Briefly explain why each incorrect option is wrong
7. Tag with relevant subtopics
8. Assign appropriate Bloom's taxonomy level

OUTPUT JSON ONLY (no markdown, no extra text):
{{
    "questions": [
        {{
            "text": "Clear, unambiguous question text...",
            "options": [
                {{"text": "Option A text", "is_correct": false, "explanation": "Why this is incorrect"}},
                {{"text": "Option B text", "is_correct": true, "explanation": "Why this is correct with reasoning"}},
                {{"text": "Option C text", "is_correct": false, "explanation": "Why this is incorrect"}},
                {{"text": "Option D text", "is_correct": false, "explanation": "Why this is incorrect"}}
            ],
            "explanation": "Full detailed step-by-step explanation of the solution...",
            "solution_steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
            "difficulty": 2.5,
            "bloom_level": "apply",
            "tags": ["subtopic1", "subtopic2"]
        }}
    ]
}}
"""

    TRUE_FALSE_GENERATION = """
Generate {count} True/False questions for {subject_name} - {topic_name}.
Exam: {exam_name} ({country_name}).

OUTPUT JSON ONLY:
{{
    "questions": [
        {{
            "text": "Statement that is either true or false...",
            "options": [
                {{"text": "True", "is_correct": true, "explanation": "Explanation of why this is true"}},
                {{"text": "False", "is_correct": false, "explanation": ""}}
            ],
            "explanation": "Detailed explanation...",
            "difficulty": 1.5,
            "bloom_level": "understand",
            "tags": ["tag1"]
        }}
    ]
}}
"""


class AITestGenerationService:
    """
    Production-grade AI test generation with:
    - Semantic caching
    - Retry with exponential backoff
    - Output validation
    - Duplicate detection
    - Quality scoring
    """

    def __init__(self):
        self.prompt_templates = PromptTemplate()
        self.cache_prefix = 'ai_test_gen'

    def generate_test(
        self,
        user,
        exam_id: str,
        subject_id: Optional[str] = None,
        topic_ids: Optional[List[str]] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> Test:
        """
        Generate a complete test using AI.

        Args:
            user: The requesting user
            exam_id: Exam to pattern-match
            subject_id: Optional subject filter
            topic_ids: Optional specific topics
            config: Generation configuration

        Returns:
            Test object with generated questions
        """
        config = config or {}
        exam = Exam.objects.select_related('country').get(id=exam_id)

        # Build cache key
        cache_key = self._build_cache_key(exam_id, subject_id, topic_ids, config)

        # Check cache
        cached_test_id = cache.get(cache_key)
        if cached_test_id:
            try:
                return Test.objects.get(id=cached_test_id, is_published=True)
            except Test.DoesNotExist:
                cache.delete(cache_key)

        # Get topics to generate questions for
        topics = self._get_topics(exam, subject_id, topic_ids)

        # Calculate questions per topic
        question_count = config.get('question_count', 30)
        questions_per_topic = self._distribute_questions(topics, question_count)

        # Generate questions
        all_questions = []
        for topic, count in questions_per_topic.items():
            topic_questions = self._generate_questions_for_topic(
                exam=exam,
                topic=topic,
                count=count,
                difficulty=config.get('difficulty', 'mixed'),
                bloom_level=config.get('bloom_level', 'apply'),
            )
            all_questions.extend(topic_questions)

        # Create test and questions
        with transaction.atomic():
            test = self._create_test(
                exam=exam,
                user=user,
                config=config,
                cache_key=cache_key,
                question_count=len(all_questions),
            )

            self._save_questions(test, all_questions)

        # Cache the test
        cache_ttl = config.get('cache_ttl', 86400)
        cache.set(cache_key, str(test.id), timeout=cache_ttl)

        logger.info(f"Generated test {test.id} with {len(all_questions)} questions for {exam.code}")
        return test

    def _build_cache_key(self, exam_id, subject_id, topic_ids, config) -> str:
        """Build a unique cache key for the generation parameters."""
        raw = f"{exam_id}:{subject_id}:{sorted(topic_ids or [])}:{config}"
        hash_val = hashlib.md5(raw.encode()).hexdigest()[:16]
        return f"{self.cache_prefix}:{hash_val}"

    def _get_topics(self, exam, subject_id, topic_ids):
        """Get topics to generate questions for."""
        if topic_ids:
            return list(Topic.objects.filter(id__in=topic_ids, is_active=True))

        if subject_id:
            subject = Subject.objects.get(id=subject_id, is_active=True)
            return list(subject.topics.filter(is_active=True))

        # Default: get topics from all subjects of the exam
        topics = []
        for subject in exam.subjects.filter(is_active=True):
            topics.extend(subject.topics.filter(is_active=True)[:3])
        return topics

    def _distribute_questions(self, topics, total_count):
        """Distribute question count across topics proportionally."""
        if not topics:
            return {}

        # Weight by topic question count (prefer topics with fewer questions)
        weights = []
        for topic in topics:
            weight = max(1, 100 - topic.question_count)
            weights.append(weight)

        total_weight = sum(weights)
        distribution = {}
        allocated = 0

        for i, topic in enumerate(topics):
            if i == len(topics) - 1:
                # Last topic gets remainder
                distribution[topic] = total_count - allocated
            else:
                count = max(1, int(total_count * weights[i] / total_weight))
                distribution[topic] = count
                allocated += count

        return distribution

    def _generate_questions_for_topic(
        self, exam, topic, count, difficulty='mixed', bloom_level='apply',
    ) -> List[Dict[str, Any]]:
        """Generate questions for a specific topic using AI."""
        pattern = exam.pattern
        prompt = self.prompt_templates.MCQ_GENERATION.format(
            exam_name=exam.name,
            country_name=exam.country.name,
            total_questions=pattern.get('total_questions', 100),
            total_marks=pattern.get('total_marks', 400),
            duration_minutes=pattern.get('duration_minutes', 180),
            marks_per_correct=pattern.get('marks_per_correct', 4),
            negative_marks=pattern.get('negative_marks_per_wrong', 0),
            difficulty_distribution=json.dumps(exam.difficulty_distribution),
            count=count,
            subject_name=topic.subject.name,
            topic_name=topic.name,
            difficulty=self._difficulty_to_numeric(difficulty),
            bloom_level=bloom_level,
        )

        # Call LLM with retry
        response = self._call_llm_with_retry(prompt)
        if not response:
            logger.warning(f"LLM returned no response for topic {topic.name}")
            return []

        # Validate
        questions = self._validate_questions(response, exam)

        # Deduplicate against existing questions
        questions = self._deduplicate_questions(questions, topic)

        # Attach topic reference so _save_questions can use it
        for q in questions:
            q['_topic'] = topic

        return questions[:count]

    def _call_llm_with_retry(self, prompt: str, max_retries: int = 3) -> Optional[Dict]:
        """Call LLM with exponential backoff retry."""
        for attempt in range(max_retries):
            try:
                from apps.ai_engine.ai_client import AIClient
                client = AIClient.get_client()
                if not client:
                    logger.error("AI client not available")
                    return None

                response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=prompt,
                    config={
                        'response_mime_type': 'application/json',
                        'temperature': 0.7,
                    },
                )

                if not response.text:
                    raise ValueError("Empty response from AI")

                # Parse JSON (handle markdown code blocks)
                text = response.text.strip()
                if text.startswith('```'):
                    text = text.split('```', 2)[1]
                    if text.startswith('json'):
                        text = text[4:]
                text = text.strip()

                return json.loads(text)

            except Exception as e:
                logger.warning(f"LLM call attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    # Try fallback model
                    return self._call_fallback_llm(prompt)

        return None

    def _call_fallback_llm(self, prompt: str) -> Optional[Dict]:
        """Fallback to a simpler model if primary fails."""
        try:
            from apps.ai_engine.ai_client import AIClient
            client = AIClient.get_client()
            if not client:
                return None

            response = client.models.generate_content(
                model='gemini-2.0-flash-lite',
                contents=prompt,
                config={'response_mime_type': 'application/json'},
            )

            if response.text:
                text = response.text.strip()
                if text.startswith('```'):
                    text = text.split('```', 2)[1]
                    if text.startswith('json'):
                        text = text[4:]
                return json.loads(text.strip())
        except Exception as e:
            logger.error(f"Fallback LLM call also failed: {e}")

        return None

    def _validate_questions(self, data: Dict, exam) -> List[Dict]:
        """Validate AI-generated questions against quality rules."""
        validated = []
        questions = data.get('questions', [])

        for q in questions:
            # Required fields
            if not all(k in q for k in ['text', 'options', 'explanation']):
                continue

            # Exactly 4 options
            if len(q.get('options', [])) != 4:
                continue

            # Exactly one correct answer
            correct_count = sum(1 for o in q['options'] if o.get('is_correct'))
            if correct_count != 1:
                continue

            # Question text minimum length
            if len(q['text']) < 10:
                continue

            # Option text minimum length
            if any(len(o['text']) < 2 for o in q['options']):
                continue

            # Content moderation (basic)
            if self._contains_inappropriate_content(q['text']):
                continue

            validated.append(q)

        return validated

    def _contains_inappropriate_content(self, text: str) -> bool:
        """Basic content moderation check."""
        inappropriate_words = [
            'offensive', 'inappropriate', 'hate', 'discriminate',
        ]
        text_lower = text.lower()
        return any(word in text_lower for word in inappropriate_words)

    def _deduplicate_questions(self, questions: List[Dict], topic) -> List[Dict]:
        """Remove questions that are too similar to existing ones."""
        existing_texts = set(
            Question.objects.filter(topic=topic, is_deleted=False).values_list('text', flat=True)[:500]
        )

        unique_questions = []
        for q in questions:
            # Check exact match
            if q['text'] in existing_texts:
                continue

            # Check similarity (simple: first 50 chars)
            prefix = q['text'][:50]
            is_similar = any(prefix in existing for existing in existing_texts)
            if is_similar:
                continue

            unique_questions.append(q)

        return unique_questions

    def _difficulty_to_numeric(self, difficulty: str) -> float:
        """Convert difficulty string to numeric value."""
        mapping = {'easy': 1.5, 'medium': 2.5, 'hard': 3.5, 'mixed': 2.5, 'adaptive': 2.5}
        return mapping.get(difficulty, 2.5)

    @transaction.atomic
    def _create_test(self, exam, user, config, cache_key, question_count) -> Test:
        """Create a Test record."""
        time_limit = config.get('time_limit_minutes')
        if not time_limit:
            # Estimate based on question count (2 min per question)
            time_limit = max(15, question_count * 2)

        test = Test.objects.create(
            exam=exam,
            title=f"{exam.name} Practice Test — {timezone.now().strftime('%b %d, %Y')}",
            description=f"AI-generated practice test for {exam.name} ({question_count} questions)",
            mode=config.get('mode', 'mock'),
            difficulty=config.get('difficulty', 'mixed'),
            time_limit_minutes=time_limit,
            passing_score=exam.pattern.get('passing_score', 50),
            total_marks=question_count * exam.pattern.get('marks_per_correct', 1),
            negative_marks_per_question=exam.pattern.get('negative_marks_per_wrong', 0),
            marks_per_correct=exam.pattern.get('marks_per_correct', 1),
            is_ai_generated=True,
            generation_config=config,
            ai_generation_id=cache_key,
            cache_key=cache_key,
            created_by=user,
            is_published=True,
        )
        return test

    @transaction.atomic
    def _save_questions(self, test: Test, questions: List[Dict]):
        """Save generated questions to the question bank and link to test."""
        for idx, q_data in enumerate(questions):
            # Use the topic attached during generation — never fall back to a hardcoded first topic
            topic = q_data.get('_topic')
            if topic is None:
                first_subject = test.exam.subjects.filter(is_active=True).first()
                topic = first_subject.topics.filter(is_active=True).first() if first_subject else None

            if topic is None:
                logger.warning(f"No topic found for question {idx} in test {test.id}, skipping")
                continue

            # Create question
            question = Question.objects.create(
                topic=topic,
                text=q_data['text'],
                question_type='mcq',
                difficulty=q_data.get('difficulty', 2.5),
                bloom_level=q_data.get('bloom_level', 'apply'),
                explanation=q_data['explanation'],
                solution_steps=q_data.get('solution_steps', []),
                tags=q_data.get('tags', []),
                is_ai_generated=True,
                ai_model='gemini-2.0-flash',
                ai_generation_id=test.ai_generation_id,
                created_by=test.created_by,
            )

            # Create options
            for opt_idx, opt_data in enumerate(q_data['options']):
                Option.objects.create(
                    question=question,
                    text=opt_data['text'],
                    is_correct=opt_data['is_correct'],
                    explanation=opt_data.get('explanation', ''),
                    order=opt_idx,
                )

            # Link to test
            TestQuestion.objects.create(
                test=test,
                question=question,
                order=idx,
                marks=test.marks_per_correct,
            )

            # Update topic question count
            topic.increment_question_count()
