
import logging
from typing import Dict, Any
from .ai_client import AIClient

logger = logging.getLogger(__name__)

class ModerationService:
    @staticmethod
    def check_message(text: str) -> Dict[str, Any]:
        """
        Check message for safety using AI.
        Returns: {'is_safe': bool, 'reason': str}
        """
        if not text:
            return {"is_safe": True, "reason": "Empty text"}

        try:
            result = AIClient.moderate_content(text)
            
            if not result.get("is_safe"):
                logger.warning(f"Unsafe content detected: {result.get('flags')} - Reason: {result.get('reason')}")
            
            return result
        except Exception as e:
            logger.error(f"Moderation failed: {e}")
            return {"is_safe": True, "reason": "System Error (Allowing Default)"}
