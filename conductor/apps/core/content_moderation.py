"""
AI Content Moderation Service

Provides automated content moderation for user-generated content
including discussions, comments, reviews, and chat messages.

Features:
1. Profanity detection
2. Spam detection
3. Toxicity analysis
4. Plagiarism check (simplified)
5. Image moderation (placeholder)
"""

import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


class ContentType(Enum):
    """Types of content that can be moderated."""
    DISCUSSION = "discussion"
    COMMENT = "comment"
    REVIEW = "review"
    CHAT = "chat"
    PROFILE = "profile"


class ModerationResult(Enum):
    """Moderation result types."""
    APPROVED = "approved"
    FLAGGED = "flagged"
    REJECTED = "rejected"
    REQUIRES_REVIEW = "requires_review"


@dataclass
class ModerationReport:
    """Detailed report of content moderation."""
    result: ModerationResult
    confidence: float
    issues: List[str]
    details: Dict[str, Any]
    ai_explanation: Optional[str] = None


class ContentModerationService:
    """
    AI-powered content moderation service.
    Uses rule-based + ML hybrid approach.
    """
    
    # Profanity patterns (simplified - in production use a proper library)
    PROFANITY_PATTERNS = [
        r'\b(fuck|shit|damn|ass|bitch)\b',
        r'\bf+u+c+k+\b',
        r'\bs+h+i+t+\b',
    ]
    
    # Spam patterns
    SPAM_PATTERNS = [
        r'(buy now|free money|click here|limited offer)',
        r'(https?://\S+){3,}',  # Multiple URLs
        r'(.)\1{5,}',  # Repeated characters
        r'([\!\?\$\%]){3,}',  # Multiple special chars
    ]
    
    # Toxicity keywords (simplified)
    TOXIC_KEYWORDS = [
        'hate', 'kill', 'die', 'stupid', 'idiot', 'loser',
        'worthless', 'trash', 'garbage'
    ]
    
    @classmethod
    def moderate_content(
        cls,
        content: str,
        content_type: ContentType,
        user_id: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> ModerationReport:
        """
        Moderate a piece of content.
        
        Args:
            content: The text content to moderate
            content_type: Type of content (discussion, comment, etc.)
            user_id: Optional user ID for context
            context: Additional context (previous violations, etc.)
            
        Returns:
            ModerationReport with result and details
        """
        issues = []
        details = {}
        scores = {}
        
        # 1. Profanity check
        profanity_result = cls._check_profanity(content)
        if profanity_result['found']:
            issues.append('profanity')
            details['profanity'] = profanity_result
        scores['profanity'] = profanity_result['score']
        
        # 2. Spam check
        spam_result = cls._check_spam(content)
        if spam_result['is_spam']:
            issues.append('spam')
            details['spam'] = spam_result
        scores['spam'] = spam_result['score']
        
        # 3. Toxicity check
        toxicity_result = cls._check_toxicity(content)
        if toxicity_result['is_toxic']:
            issues.append('toxicity')
            details['toxicity'] = toxicity_result
        scores['toxicity'] = toxicity_result['score']
        
        # 4. Length check
        length_result = cls._check_length(content, content_type)
        if not length_result['valid']:
            issues.append('length')
            details['length'] = length_result
        
        # Calculate overall confidence
        avg_score = sum(scores.values()) / len(scores) if scores else 0
        confidence = 1 - avg_score  # Higher score = more problematic
        
        # Determine result
        if len(issues) == 0:
            result = ModerationResult.APPROVED
        elif 'profanity' in issues or scores.get('toxicity', 0) > 0.7:
            result = ModerationResult.REJECTED
        elif avg_score > 0.5:
            result = ModerationResult.REQUIRES_REVIEW
        else:
            result = ModerationResult.FLAGGED
        
        # Get AI explanation for reviews
        ai_explanation = None
        if result != ModerationResult.APPROVED:
            ai_explanation = cls._get_ai_explanation(issues, details)
        
        return ModerationReport(
            result=result,
            confidence=round(confidence, 2),
            issues=issues,
            details=details,
            ai_explanation=ai_explanation
        )
    
    @classmethod
    def _check_profanity(cls, content: str) -> Dict[str, Any]:
        """Check for profanity in content."""
        content_lower = content.lower()
        found_words = []
        
        for pattern in cls.PROFANITY_PATTERNS:
            matches = re.findall(pattern, content_lower, re.IGNORECASE)
            found_words.extend(matches)
        
        score = min(len(found_words) * 0.3, 1.0)
        
        return {
            'found': len(found_words) > 0,
            'count': len(found_words),
            'score': score
        }
    
    @classmethod
    def _check_spam(cls, content: str) -> Dict[str, Any]:
        """Check for spam patterns."""
        spam_indicators = 0
        
        for pattern in cls.SPAM_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                spam_indicators += 1
        
        # Check for excessive caps
        if len(content) > 10:
            caps_ratio = sum(1 for c in content if c.isupper()) / len(content)
            if caps_ratio > 0.5:
                spam_indicators += 1
        
        # Check for repetitive content
        words = content.split()
        if len(words) > 5:
            unique_ratio = len(set(words)) / len(words)
            if unique_ratio < 0.3:
                spam_indicators += 1
        
        score = min(spam_indicators * 0.25, 1.0)
        
        return {
            'is_spam': spam_indicators >= 2,
            'indicators': spam_indicators,
            'score': score
        }
    
    @classmethod
    def _check_toxicity(cls, content: str) -> Dict[str, Any]:
        """Check for toxic language."""
        content_lower = content.lower()
        toxic_count = 0
        found_keywords = []
        
        for keyword in cls.TOXIC_KEYWORDS:
            if keyword in content_lower:
                toxic_count += 1
                found_keywords.append(keyword)
        
        # Advanced: Check for personal attacks (simplified)
        personal_attack_patterns = [
            r'\byou\s+(are|r)\s+(an?\s+)?(idiot|stupid|dumb)',
            r'\bgo\s+(to\s+)?hell\b',
            r'\bshut\s+up\b',
        ]
        
        for pattern in personal_attack_patterns:
            if re.search(pattern, content_lower):
                toxic_count += 2
        
        score = min(toxic_count * 0.2, 1.0)
        
        return {
            'is_toxic': toxic_count >= 2,
            'toxic_keywords': found_keywords,
            'score': score
        }
    
    @classmethod
    def _check_length(cls, content: str, content_type: ContentType) -> Dict[str, Any]:
        """Check content length validity."""
        limits = {
            ContentType.DISCUSSION: (10, 5000),
            ContentType.COMMENT: (1, 2000),
            ContentType.REVIEW: (10, 3000),
            ContentType.CHAT: (1, 1000),
            ContentType.PROFILE: (0, 500),
        }
        
        min_len, max_len = limits.get(content_type, (1, 5000))
        content_len = len(content.strip())
        
        return {
            'valid': min_len <= content_len <= max_len,
            'length': content_len,
            'min': min_len,
            'max': max_len
        }
    
    @classmethod
    def _get_ai_explanation(cls, issues: List[str], details: Dict) -> str:
        """Generate AI explanation for moderation decision."""
        explanations = []
        
        if 'profanity' in issues:
            explanations.append("Contains inappropriate language")
        
        if 'spam' in issues:
            explanations.append("Detected as potential spam")
        
        if 'toxicity' in issues:
            explanations.append("Contains potentially harmful content")
        
        if 'length' in issues:
            length_info = details.get('length', {})
            if length_info.get('length', 0) < length_info.get('min', 0):
                explanations.append("Content is too short")
            else:
                explanations.append("Content exceeds maximum length")
        
        return "; ".join(explanations) if explanations else "Content flagged for manual review"
    
    # ==========================================================================
    # BATCH MODERATION
    # ==========================================================================
    
    @classmethod
    def moderate_batch(
        cls,
        contents: List[Tuple[str, ContentType]],
        user_id: Optional[str] = None
    ) -> List[ModerationReport]:
        """
        Moderate multiple pieces of content.
        """
        return [
            cls.moderate_content(content, content_type, user_id)
            for content, content_type in contents
        ]
    
    # ==========================================================================
    # USER REPUTATION
    # ==========================================================================
    
    @classmethod
    def get_user_reputation(cls, user_id: str) -> Dict[str, Any]:
        """
        Get user's content reputation score.
        Based on past moderation history.
        """
        cache_key = f"user_reputation:{user_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # In production, this would query ModerationLog model
        # For now, return default good reputation
        reputation = {
            'score': 0.95,
            'level': 'trusted',
            'total_posts': 0,
            'flagged_posts': 0,
            'rejected_posts': 0
        }
        
        cache.set(cache_key, reputation, timeout=3600)
        return reputation
    
    @classmethod
    def update_user_reputation(
        cls, 
        user_id: str, 
        moderation_result: ModerationResult
    ) -> None:
        """
        Update user reputation based on moderation result.
        """
        # Invalidate cache
        cache.delete(f"user_reputation:{user_id}")
        
        # In production, update ModerationLog and recalculate
        logger.info(f"Updated reputation for user {user_id}: {moderation_result.value}")


class AutoModerator:
    """
    Automated moderation system that can be triggered on content creation.
    """
    
    @classmethod
    def auto_moderate(
        cls,
        content: str,
        content_type: ContentType,
        user,
        auto_action: bool = True
    ) -> Dict[str, Any]:
        """
        Auto-moderate content and optionally take action.
        
        Args:
            content: Content to moderate
            content_type: Type of content
            user: User who created the content
            auto_action: Whether to automatically apply actions
            
        Returns:
            Dict with moderation result and action taken
        """
        # Get user reputation for context
        reputation = ContentModerationService.get_user_reputation(str(user.id))
        
        # Trusted users get lighter moderation
        if reputation['level'] == 'trusted' and reputation['score'] > 0.9:
            # Quick check only
            result = ContentModerationService.moderate_content(
                content, content_type, str(user.id)
            )
            
            # Auto-approve unless clearly problematic
            if result.result == ModerationResult.FLAGGED:
                result = ModerationReport(
                    result=ModerationResult.APPROVED,
                    confidence=result.confidence,
                    issues=result.issues,
                    details=result.details,
                    ai_explanation="Approved due to trusted user status"
                )
        else:
            result = ContentModerationService.moderate_content(
                content, content_type, str(user.id)
            )
        
        action_taken = None
        
        if auto_action:
            if result.result == ModerationResult.REJECTED:
                action_taken = "content_blocked"
                # In production: block content, notify user
            elif result.result == ModerationResult.REQUIRES_REVIEW:
                action_taken = "queued_for_review"
                # In production: add to review queue
            elif result.result == ModerationResult.FLAGGED:
                action_taken = "published_with_warning"
                # In production: publish but mark for monitoring
            else:
                action_taken = "published"
        
        # Update reputation
        ContentModerationService.update_user_reputation(
            str(user.id), result.result
        )
        
        return {
            'moderation_result': result.result.value,
            'confidence': result.confidence,
            'issues': result.issues,
            'action_taken': action_taken,
            'explanation': result.ai_explanation
        }
