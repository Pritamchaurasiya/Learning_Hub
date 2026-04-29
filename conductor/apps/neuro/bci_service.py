"""
BCI Neuro-Feedback Service

Interfaces with (simulated) Brain-Computer Interfaces.
1. EEG Data Stream Processing.
2. Focus/Flow State Detection (Beta/Theta ratios).
3. Neuro-adaptive content pacing.
"""

import logging
import random
import time
from typing import Dict, Any, List
from threading import Thread
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class BrainWaves:
    delta: float # 0.5-4Hz (Sleep)
    theta: float # 4-8Hz (Deep relax)
    alpha: float # 8-13Hz (Calm focus)
    beta: float  # 13-30Hz (Active thinking)
    gamma: float # >30Hz (High processing)


class CognitiveState(Enum):
    FLOW_STATE = "flow"
    DISTRACTED = "distracted"
    FATIGUED = "fatigued"
    STRESSED = "stressed"
    NEUTRAL = "neutral"


class BCIService:
    """
    Analyzes neuro-signals to optimize learning.
    """
    
    @classmethod
    def ingest_eeg_sample(cls, channel_data: List[float]) -> BrainWaves:
        """
        Process raw EEG voltage (Mock FFT).
        """
        # Simulated Fast Fourier Transform result
        return BrainWaves(
            delta=random.uniform(0, 10),
            theta=random.uniform(0, 20),
            alpha=random.uniform(10, 50),
            beta=random.uniform(10, 40),
            gamma=random.uniform(0, 10)
        )

    @classmethod
    def analyze_focus(cls, waves: BrainWaves) -> Dict[str, Any]:
        """
        Determine cognitive state from wave ratios.
        Focus Ratio = Beta / (Theta + Alpha)
        """
        focus_index = waves.beta / (waves.theta + waves.alpha + 0.1)
        relaxation_index = waves.alpha / (waves.beta + 0.1)
        
        state = CognitiveState.NEUTRAL
        
        if focus_index > 1.5:
            # High Beta, low slow waves
            state = CognitiveState.FLOW_STATE if waves.gamma > 5 else CognitiveState.STRESSED
        elif relaxation_index > 2.0:
            state = CognitiveState.FATIGUED # Or meditative
        elif focus_index < 0.5:
            state = CognitiveState.DISTRACTED
            
        return {
            "state": state.value,
            "focus_index": round(focus_index, 2),
            "relaxation_index": round(relaxation_index, 2),
            "recommendation": cls._get_recommendation(state)
        }

    @classmethod
    def _get_recommendation(cls, state: CognitiveState) -> str:
        if state == CognitiveState.FLOW_STATE:
            return "Increase difficulty +10%"
        elif state == CognitiveState.FATIGUED:
            return "Trigger micro-break (breathing exercise)"
        elif state == CognitiveState.DISTRACTED:
            return "Switch to interactive mode"
        return "Maintain pace"
