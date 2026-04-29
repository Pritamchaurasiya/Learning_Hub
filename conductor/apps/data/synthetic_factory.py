"""
Synthetic Data Factory

Generates privacy-safe synthetic datasets for training/testing.
1. GAN-based profile generation (mocked).
2. Statistical distribution matching.
3. Privacy metrics verification.
"""

import logging
import random
import hashlib
from typing import Dict, List, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SyntheticProfile:
    id: str
    age_group: str
    learning_style: str
    engagement_score: float
    courses_completed: int
    avg_session_minutes: float


class SyntheticDataFactory:
    """
    Generates realistic but fake user profiles for testing and research.
    """
    
    # Distribution parameters extracted from real data (mocked)
    _age_distribution = {"18-24": 0.4, "25-34": 0.35, "35-44": 0.15, "45+": 0.1}
    _style_distribution = {"visual": 0.3, "auditory": 0.25, "kinesthetic": 0.25, "reading": 0.2}

    @classmethod
    def generate_profiles(cls, count: int) -> List[SyntheticProfile]:
        """
        Generate N synthetic student profiles matching real distributions.
        """
        profiles = []
        for i in range(count):
            profile = SyntheticProfile(
                id=cls._gen_synthetic_id(i),
                age_group=cls._sample_distribution(cls._age_distribution),
                learning_style=cls._sample_distribution(cls._style_distribution),
                engagement_score=round(random.gauss(0.65, 0.15), 2),
                courses_completed=max(0, int(random.gauss(3, 2))),
                avg_session_minutes=round(random.gauss(25, 10), 1)
            )
            profiles.append(profile)
        return profiles

    @classmethod
    def _gen_synthetic_id(cls, seed: int) -> str:
        return hashlib.sha256(f"synth:{seed}:{random.random()}".encode()).hexdigest()[:12]

    @classmethod
    def _sample_distribution(cls, dist: Dict[str, float]) -> str:
        rand = random.random()
        cumulative = 0.0
        for key, prob in dist.items():
            cumulative += prob
            if rand <= cumulative:
                return key
        return list(dist.keys())[-1]

    @classmethod
    def validate_privacy(cls, synthetic: List[SyntheticProfile], real_sample: List[Dict]) -> Dict[str, Any]:
        """
        Ensure synthetic data doesn't leak real identities.
        """
        # Check: No exact match on composite key
        real_keys = set()
        for r in real_sample:
            key = f"{r.get('age_group')}:{r.get('learning_style')}:{r.get('courses_completed')}"
            real_keys.add(key)
            
        leak_count = 0
        for s in synthetic:
            key = f"{s.age_group}:{s.learning_style}:{s.courses_completed}"
            if key in real_keys:
                leak_count += 1
                
        leak_rate = leak_count / len(synthetic) if synthetic else 0
        
        return {
            "total_synthetic": len(synthetic),
            "potential_leaks": leak_count,
            "leak_rate": round(leak_rate, 4),
            "privacy_passed": leak_rate < 0.01 # <1% threshold
        }
