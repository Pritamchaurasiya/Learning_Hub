"""
Affective Computing Service (Emotion AI)

Detects learner's emotional state to adapt teaching style.
1. Multimodal Emotion Detection (Simulated fusion of Text/Voice/Face).
2. Frustration Level Monitoring.
3. Adaptive Tone Generation.
"""

import logging
import random
from typing import Dict, Any, List, Optional
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class Emotion(Enum):
    NEUTRAL = "neutral"
    JOY = "joy"
    FRUSTRATION = "frustration"
    CONFUSION = "confusion"
    BOREDOM = "boredom"
    CURIOSITY = "curiosity"


@dataclass
class EmotionalState:
    primary: Emotion
    confidence: float
    valence: float # -1.0 to 1.0 (Negative to Positive)
    arousal: float # 0.0 to 1.0 (Calm to Excited)


class AffectiveComputingService:
    """
    Engine to analyze user sentiment and adapt system response.
    """
    
    @classmethod
    def analyze_session_input(cls, text_input: str, audio_features: Optional[Dict] = None) -> EmotionalState:
        """
        Analyze multi-modal input to determine emotion.
        """
        # 1. Text Analysis (Heuristic Mock)
        text_lower = text_input.lower()
        
        detected = Emotion.NEUTRAL
        valence = 0.0
        arousal = 0.5
        
        if any(w in text_lower for w in ["stuck", "hard", "error", "fail", "broken"]):
            detected = Emotion.FRUSTRATION
            valence = -0.7
            arousal = 0.8
        elif any(w in text_lower for w in ["wow", "cool", "thanks", "great"]):
            detected = Emotion.JOY
            valence = 0.8
            arousal = 0.7
        elif "?" in text_input and any(w in text_lower for w in ["why", "how", "what"]):
            detected = Emotion.CURIOSITY
            valence = 0.2
            arousal = 0.6
        elif any(w in text_lower for w in ["boring", "slow", "tired"]):
            detected = Emotion.BOREDOM
            valence = -0.3
            arousal = 0.2
            
        # 2. Audio Fusion (Mock)
        if audio_features:
            # e.g. High pitch/volume -> High arousal
            if audio_features.get("pitch_variability", 0) > 0.8:
                arousal += 0.2
                
        return EmotionalState(detected, 0.85, valence, arousal)

    @classmethod
    def adapt_response_tone(cls, base_response: str, user_emotion: EmotionalState) -> str:
        """
        Rewrite response based on user emotion.
        """
        if user_emotion.primary == Emotion.FRUSTRATION:
            return cls._soften_tone(base_response)
        elif user_emotion.primary == Emotion.BOREDOM:
            return cls._energize_tone(base_response)
        elif user_emotion.primary == Emotion.JOY:
            return cls._celebrate_tone(base_response)
            
        return base_response

    @classmethod
    def _soften_tone(cls, text: str) -> str:
        prefixes = [
            "I hear you, this is tricky. Let's break it down: ",
            "Don't worry, it happens to everyone. Try this: ",
            "Let's take a deep breath and look at this part: "
        ]
        return random.choice(prefixes) + text

    @classmethod
    def _energize_tone(cls, text: str) -> str:
        prefixes = [
            "Check this out! ",
            "Here's the cool part: ",
            "Imagine this in action: "
        ]
        return random.choice(prefixes) + text + " 🚀"

    @classmethod
    def _celebrate_tone(cls, text: str) -> str:
        return text + " You're crushing it! 🎉"
