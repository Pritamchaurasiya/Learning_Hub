"""
AI Content Intelligence Service

Advanced AI capabilities for:
1. Automatic Quiz Generation from text/content
2. Content Summarization
3. Flashcard Generation
4. SEO Metadata Generation
5. Difficulty Content Analysis
"""

import logging
import json
import re
from typing import Dict, Any, List, Optional
from enum import Enum

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


class ContentType(Enum):
    """Content input types."""
    TEXT = "text"
    TRANSCRIPT = "transcript"
    PDF = "pdf"
    CODE = "code"


class DifficultyLevel(Enum):
    """Content difficulty levels."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ContentIntelligenceService:
    """
    Service for AI-driven content generation and analysis.
    """
    
    # ==========================================================================
    # QUIZ GENERATION
    # ==========================================================================
    
    @classmethod
    def generate_quiz(
        cls,
        content: str,
        num_questions: int = 5,
        difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE,
        content_type: ContentType = ContentType.TEXT
    ) -> Dict[str, Any]:
        """
        Generate a quiz from provided content.
        """
        # In production, call OpenAI/Gemini API provided in AIClient
        # For now, use robust mock logic based on keyword analysis
        
        logger.info(f"Generating {difficulty.value} quiz with {num_questions} questions")
        
        # Extract keywords using simple NLP (Production: Use spacy/nltk)
        keywords = cls._extract_keywords(content)
        
        questions = []
        for i in range(num_questions):
            if i < len(keywords):
                keyword = keywords[i]
                questions.append({
                    'id': i + 1,
                    'question': f"What is the primary function of '{keyword}' in this context?",
                    'options': [
                        f"It defines {keyword}",
                        f"It validates {keyword}",
                        f"It optimizes {keyword}",
                        f"It deletes {keyword}"
                    ],
                    'correct_index': 0,
                    'explanation': f"'{keyword}' is a key concept discussed in the text."
                })
            else:
                # Fallback generic questions
                questions.append({
                    'id': i + 1,
                    'question': f"Which of the following best summarizes the section {i+1}?",
                    'options': [
                        "Implementation details",
                        "Theoretical concepts",
                        "Performance metrics",
                        "Historical context"
                    ],
                    'correct_index': 0,
                    'explanation': "This section focuses on implementation."
                })
        
        return {
            'success': True,
            'source_length': len(content),
            'difficulty': difficulty.value,
            'questions': questions
        }
    
    # ==========================================================================
    # SUMMARIZATION
    # ==========================================================================
    
    @classmethod
    def summarize_content(
        cls,
        content: str,
        max_length: int = 200,
        format_type: str = "paragraph"  # paragraph or bullet_points
    ) -> Dict[str, Any]:
        """
        Generate a summary of the content.
        """
        # Mock summarization logic
        sentences = [s.strip() for s in content.split('.') if s.strip()]
        
        if not sentences:
            return {'summary': ""}
            
        # Take first few sentences as summary
        summary_text = ". ".join(sentences[:3]) + "."
        
        if format_type == "bullet_points":
            bullets = [f"- {s}" for s in sentences[:3]]
            summary_text = "\n".join(bullets)
            
        return {
            'success': True,
            'original_length': len(content),
            'summary': summary_text,
            'compression_ratio': round(len(summary_text) / len(content), 2)
        }
    
    # ==========================================================================
    # FLASHCARD GENERATION
    # ==========================================================================
    
    @classmethod
    def generate_flashcards(
        cls,
        content: str,
        count: int = 10
    ) -> Dict[str, Any]:
        """
        Generate study flashcards from content.
        """
        keywords = cls._extract_keywords(content)
        
        cards = []
        for i, keyword in enumerate(keywords[:count]):
            cards.append({
                'id': i + 1,
                'front': f"What is {keyword}?",
                'back': f"{keyword} is a fundamental concept in this topic used for..."
            })
            
        return {
            'success': True,
            'count': len(cards),
            'cards': cards
        }
    
    # ==========================================================================
    # SEO GENERATION
    # ==========================================================================
    
    @classmethod
    def generate_seo_metadata(cls, title: str, description: str) -> Dict[str, Any]:
        """
        Generate SEO title, description, and keywords.
        """
        keywords = cls._extract_keywords(description)
        
        seo_title = f"{title} | Complete Guide {timezone.now().year}"
        seo_desc = f"Learn about {title}. {description[:130]}..."
        
        return {
            'title': seo_title[:60],  # Standard SEO length
            'description': seo_desc[:160],  # Standard SEO length
            'keywords': ", ".join(keywords[:10]),
            'slug': title.lower().replace(" ", "-")
        }
    
    # ==========================================================================
    # HELPER METHODS
    # ==========================================================================
    
    @classmethod
    def _extract_keywords(cls, text: str) -> List[str]:
        """
        Extract meaningful keywords from text.
        """
        # Remove common stop words (mock list)
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are'}
        
        # Simple tokenization
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Filter
        keywords = [
            w for w in words 
            if w not in stop_words and len(w) > 3
        ]
        
        # Frequency count
        from collections import Counter
        counts = Counter(keywords)
        
        # Return most common
        return [word for word, count in counts.most_common(20)]
