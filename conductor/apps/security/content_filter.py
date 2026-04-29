import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

class ContentFilter:
    """
    Phase 54: Advanced Cybersecurity ML - Prompt Injection Detection.
    
    Protects the underlying GenAI Foundation Models from Jailbreak attempts 
    (e.g., "Ignore all previous instructions") and Data Exfiltration attacks.
    """
    
    # 1. Heuristic-based jailbreak signatures
    JAILBREAK_PATTERNS = [
        r"ignore\s+(all\s+)?previous\s+(instructions|prompts|directions)",
        r"you\s+are\s+now\s+(a\s+)?(developer\s+mode|dan|evil|unrestricted)",
        r"forget\s+(about\s+)?(what\s+you\s+were\s+told|your\s+rules)",
        r"(system\s+override|admin\s+mode|bypass\s+filters)",
        r"print\s+your\s+(initial\s+prompt|system\s+message)",
        r"disregard\s+(the\s+)?(above|previous)",
        r"translate\s+the\s+following\s+to\s+base64"
    ]
    
    @classmethod
    def detect_prompt_injection(cls, user_input: str) -> Tuple[bool, str]:
        """
        Scans a user prompt for known adversarial injection vectors.
        
        Args:
            user_input (str): The raw text from the user.
            
        Returns:
            Tuple[bool, str]: (Is_Malicious, Reason)
            Where Is_Malicious is True if it violates safety policies.
        """
        if not user_input or not isinstance(user_input, str):
            return False, "Empty or invalid input."
            
        normalized_input = user_input.lower().strip()
        
        # 1. Signature Matching
        for pattern in cls.JAILBREAK_PATTERNS:
            if re.search(pattern, normalized_input):
                logger.warning(f"🚨 Content Filter triggered: Prompt Injection pattern matched -> {pattern}")
                return True, "Jailbreak signature detected."
                
        # 2. Extreme Length (Buffer/Context exhaustion attack)
        if len(user_input) > 20000:  # Roughly 5k tokens
            logger.warning("🚨 Content Filter triggered: Excessive Prompt Length.")
            return True, "Input exceeds maximum allowed length. Potential Denial of Wallet attack."
            
        # 3. Payload Entropy (Base64 encoded exploits or highly obfuscated text)
        entropy = cls._calculate_entropy(normalized_input)
        if entropy > 4.5 and len(normalized_input) > 50: # Standard English is ~3.5 to 4.0
            logger.warning(f"🚨 Content Filter triggered: High string entropy ({entropy:.2f}). Possible obfuscation.")
            return True, "High entropy payload detected. Possible obfuscation."
            
        return False, "OK"
        
    @staticmethod
    def _calculate_entropy(text: str) -> float:
        """Calculates Shannon entropy to detect highly randomized/obfuscated strings (like raw base64)."""
        import math
        from collections import Counter
        
        if not text:
             return 0.0
             
        counts = Counter(text)
        length = float(len(text))
        
        entropy = -sum(
            (count / length) * math.log2(count / length)
            for count in counts.values()
        )
        return entropy
