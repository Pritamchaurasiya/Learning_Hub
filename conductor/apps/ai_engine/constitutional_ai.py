"""
Constitutional AI (RLHF from AI Feedback)

Self-alignment through principles:
1. Constitution-based critique.
2. Self-revision chain using real LLM.
3. Harmlessness classification using AIClient moderation.
"""

import logging
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
from apps.ai_engine.ai_client import AIClient

logger = logging.getLogger(__name__)


class HarmCategory(Enum):
    SAFE = "safe"
    HARMFUL = "harmful"
    AMBIGUOUS = "ambiguous"


@dataclass
class Constitution:
    """Set of principles for AI alignment."""
    principles: List[str]
    
    @classmethod
    def default(cls) -> 'Constitution':
        return cls(principles=[
            "Be helpful, harmless, and honest.",
            "Avoid generating harmful, unethical, or dangerous content.",
            "Respect user privacy and confidentiality.",
            "Provide accurate and verified information.",
            "Acknowledge limitations and uncertainty.",
            "Refuse requests for illegal or unethical actions.",
            "Treat all users with respect and dignity.",
            "Avoid bias and discrimination.",
        ])


class ConstitutionalCritic:
    """Critiques responses based on constitutional principles."""
    def __init__(self, constitution: Optional[Constitution] = None):
        self.constitution = constitution or Constitution.default()

    def critique(self, response: str) -> Tuple[bool, List[str]]:
        """
        Critique a response against constitution using AIClient moderation
        and heuristic checks.
        """
        violations = []
        
        # 1. Use Real Moderation API
        try:
            mod_result = AIClient.moderate_content(response)
            if not mod_result.get('is_safe', True):
                violations.append(f"Safety Violation: {mod_result.get('reason')}")
        except Exception as e:
            logger.warning(f"Moderation API failed: {e}")

        # 2. Heuristic Checks
        response_lower = response.lower()
        if len(response) > 1000 and "source" not in response_lower:
            # Soft check for citations in long responses
            pass 
            
        return len(violations) == 0, violations


class SelfRevisionChain:
    """Chain of self-revision based on constitutional feedback."""
    def __init__(self, constitution: Optional[Constitution] = None):
        self.critic = ConstitutionalCritic(constitution)
        self.max_revisions = 2

    def generate_revision_prompt(self, original: str, violations: List[str]) -> str:
        """Generate prompt for self-revision."""
        violation_text = "\n".join(f"- {v}" for v in violations)
        return f"""The following AI response violates safety guidelines:
-----
{original}
-----

Violations detected:
{violation_text}

Please rewrite the response to be helpful, harmless, and honest, addressing the violations above. 
If the content is fundamentally unsafe, refuse politely."""

    def revise(self, response: str) -> Tuple[str, int]:
        """
        Iteratively revise response until constitutional.
        Returns (final_response, num_revisions).
        """
        current = response
        
        for i in range(self.max_revisions):
            is_compliant, violations = self.critic.critique(current)
            
            if is_compliant:
                return current, i
            
            # Real LLM Revision
            prompt = self.generate_revision_prompt(current, violations)
            try:
                # Reuse code review generation or chat for revision
                # We'll use a generic client method if possible, or adapt
                revised = AIClient.generate_dsa_chat_response(
                    context_prompt="You are a helpful AI assistant focused on safety.",
                    user_question=prompt
                )
                if revised:
                    current = revised
                else:
                    # Fallback redaction if LLM fails
                    current = "[Content Redacted due to safety guidelines]"
                    break
            except Exception as e:
                logger.error(f"Revision failed: {e}")
                current = "[Content Redacted due to safety guidelines]"
                break
        
        return current, self.max_revisions


class ConstitutionalAI:
    """Complete Constitutional AI system."""
    def __init__(self, constitution: Optional[Constitution] = None):
        self.constitution = constitution or Constitution.default()
        self.critic = ConstitutionalCritic(self.constitution)
        self.revision_chain = SelfRevisionChain(self.constitution)

    def process(self, response: str) -> Dict:
        """Process response through constitutional pipeline."""
        # Initial critique
        is_compliant, violations = self.critic.critique(response)
        
        # Revise if needed
        if not is_compliant:
            final_response, num_revisions = self.revision_chain.revise(response)
        else:
            final_response = response
            num_revisions = 0
            
        return {
            'original': response,
            'final': final_response,
            'is_compliant': is_compliant,
            'violations': violations,
            'num_revisions': num_revisions
        }


# =============================================================================
# PHASE 5: USER CONTENT MODERATOR FOR PRODUCTION
# =============================================================================

class UserContentModerator:
    """
    Production content moderation using Constitutional AI.
    Provides API-friendly methods for content safety.
    """
    
    def __init__(self, user=None, custom_constitution: Optional[Constitution] = None):
        """
        Initialize moderator with optional user context.
        
        Args:
            user: Django User object (optional)
            custom_constitution: Custom constitution for specific use case
        """
        self.user = user
        self.constitutional_ai = ConstitutionalAI(custom_constitution)
        self.moderation_history = []
    
    def moderate_response(self, content: str, context: str = None) -> Dict:
        """
        Moderate AI-generated content through Constitutional AI pipeline.
        
        Args:
            content: Text content to moderate
            context: Optional context about the content
        
        Returns:
            Moderation result with safety assessment
        """
        # Process through Constitutional AI
        result = self.constitutional_ai.process(content)
        
        # Calculate alignment score
        alignment_score = self._calculate_alignment_score(result)
        
        # Build response
        moderation_result = {
            "original_content": content[:200] + "..." if len(content) > 200 else content,
            "moderated_content": result['final'],
            "is_safe": result['is_compliant'],
            "alignment_score": alignment_score,
            "violations": result['violations'],
            "revisions_applied": result['num_revisions'],
            "action_taken": "approved" if result['is_compliant'] else "revised"
        }
        
        # Track history
        self.moderation_history.append({
            "timestamp": self._get_timestamp(),
            "is_safe": result['is_compliant'],
            "score": alignment_score
        })
        
        return moderation_result
    
    def _calculate_alignment_score(self, result: Dict) -> float:
        """Calculate alignment score from moderation result."""
        base_score = 1.0
        
        # Deduct for violations
        violation_penalty = len(result['violations']) * 0.15
        base_score -= min(violation_penalty, 0.5)
        
        # Deduct for needed revisions
        revision_penalty = result['num_revisions'] * 0.1
        base_score -= min(revision_penalty, 0.3)
        
        return round(max(0.0, base_score), 2)
    
    def get_alignment_score(self, content: str) -> Dict:
        """
        Get alignment score without full moderation.
        
        Args:
            content: Content to score
        
        Returns:
            Alignment analysis
        """
        is_compliant, violations = self.constitutional_ai.critic.critique(content)
        
        score = 1.0 - (len(violations) * 0.15)
        score = max(0.0, min(1.0, score))
        
        return {
            "score": round(score, 2),
            "is_aligned": is_compliant,
            "concerns": violations,
            "rating": self._score_to_rating(score)
        }
    
    def _score_to_rating(self, score: float) -> str:
        """Convert score to human-readable rating."""
        if score >= 0.9:
            return "excellent"
        elif score >= 0.7:
            return "good"
        elif score >= 0.5:
            return "moderate"
        elif score >= 0.3:
            return "poor"
        else:
            return "critical"
    
    def get_constitution(self) -> Dict:
        """Get the active constitution principles."""
        return {
            "principles": self.constitutional_ai.constitution.principles,
            "principle_count": len(self.constitutional_ai.constitution.principles),
            "categories": [
                "helpfulness",
                "harmlessness",
                "honesty",
                "privacy",
                "accuracy",
                "ethics",
                "respect",
                "fairness"
            ]
        }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        import datetime
        return datetime.datetime.now().isoformat()
    
    def get_moderation_stats(self) -> Dict:
        """Get moderation statistics."""
        if not self.moderation_history:
            return {
                "total_moderated": 0,
                "safe_count": 0,
                "unsafe_count": 0,
                "average_score": 0.0
            }
        
        safe_count = sum(1 for m in self.moderation_history if m['is_safe'])
        scores = [m['score'] for m in self.moderation_history]
        
        return {
            "total_moderated": len(self.moderation_history),
            "safe_count": safe_count,
            "unsafe_count": len(self.moderation_history) - safe_count,
            "average_score": round(sum(scores) / len(scores), 2),
            "safety_rate": round(safe_count / len(self.moderation_history), 2)
        }

