"""
Synthetic Data Generation

Data augmentation and generation:
1. Template-based generation.
2. Paraphrasing.
3. Quality filtering.
"""

import logging
import random
import re
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SyntheticSample:
    original: Optional[str]
    generated: str
    method: str
    quality_score: float
    metadata: Dict[str, Any]


class TemplateGenerator:
    """Template-based data generation."""
    def __init__(self):
        self.templates: Dict[str, List[str]] = {}
        self.slot_values: Dict[str, List[str]] = {}

    def add_template(self, name: str, template: str, slots: Dict[str, List[str]]):
        """Add a template with slot values."""
        if name not in self.templates:
            self.templates[name] = []
        self.templates[name].append(template)
        
        for slot, values in slots.items():
            if slot not in self.slot_values:
                self.slot_values[slot] = []
            self.slot_values[slot].extend(values)

    def generate(self, template_name: str, n_samples: int = 10) -> List[SyntheticSample]:
        """Generate samples from template."""
        if template_name not in self.templates:
            return []
        
        samples = []
        templates = self.templates[template_name]
        
        for _ in range(n_samples):
            template = random.choice(templates)
            
            # Find and fill slots
            filled = template
            slots_used = {}
            
            for slot, values in self.slot_values.items():
                pattern = f"{{{slot}}}"
                if pattern in filled:
                    value = random.choice(values)
                    filled = filled.replace(pattern, value)
                    slots_used[slot] = value
            
            samples.append(SyntheticSample(
                original=template,
                generated=filled,
                method='template',
                quality_score=0.9,
                metadata={'slots': slots_used}
            ))
        
        return samples


class Paraphraser:
    """Paraphrase text for augmentation."""
    def __init__(self):
        self.synonym_map = {
            'is': ['represents', 'means', 'denotes', 'signifies'],
            'the': ['a', 'this', 'that'],
            'good': ['excellent', 'great', 'fine', 'wonderful'],
            'bad': ['poor', 'terrible', 'awful', 'negative'],
            'use': ['utilize', 'employ', 'apply', 'leverage'],
            'create': ['make', 'build', 'generate', 'produce'],
            'show': ['display', 'present', 'demonstrate', 'exhibit'],
            'help': ['assist', 'aid', 'support', 'facilitate'],
            'get': ['obtain', 'acquire', 'retrieve', 'fetch'],
            'put': ['place', 'set', 'position', 'store']
        }

    def _word_swap(self, text: str, swap_ratio: float = 0.3) -> str:
        """Swap words with synonyms."""
        words = text.split()
        new_words = []
        
        for word in words:
            word_lower = word.lower()
            
            if word_lower in self.synonym_map and random.random() < swap_ratio:
                synonym = random.choice(self.synonym_map[word_lower])
                # Preserve capitalization
                if word[0].isupper():
                    synonym = synonym.capitalize()
                new_words.append(synonym)
            else:
                new_words.append(word)
        
        return ' '.join(new_words)

    def _word_insertion(self, text: str, insert_ratio: float = 0.1) -> str:
        """Insert related words."""
        words = text.split()
        new_words = []
        
        fillers = ['also', 'additionally', 'furthermore', 'moreover', 'indeed']
        
        for i, word in enumerate(words):
            new_words.append(word)
            
            if random.random() < insert_ratio and i < len(words) - 1:
                new_words.append(random.choice(fillers))
        
        return ' '.join(new_words)

    def _word_deletion(self, text: str, delete_ratio: float = 0.1) -> str:
        """Delete random words."""
        words = text.split()
        
        # Don't delete if text is too short
        if len(words) <= 3:
            return text
        
        new_words = [
            word for word in words 
            if random.random() > delete_ratio
        ]
        
        return ' '.join(new_words) if new_words else text

    def paraphrase(self, text: str, n_variants: int = 3) -> List[SyntheticSample]:
        """Generate paraphrased variants."""
        samples = []
        
        methods = [
            ('swap', self._word_swap),
            ('insert', self._word_insertion),
            ('delete', self._word_deletion)
        ]
        
        for _ in range(n_variants):
            method_name, method_func = random.choice(methods)
            paraphrased = method_func(text)
            
            # Apply multiple methods sometimes
            if random.random() > 0.5:
                _, second_method = random.choice(methods)
                paraphrased = second_method(paraphrased)
            
            # Compute similarity as quality
            original_words = set(text.lower().split())
            para_words = set(paraphrased.lower().split())
            overlap = len(original_words & para_words) / len(original_words | para_words)
            
            samples.append(SyntheticSample(
                original=text,
                generated=paraphrased,
                method=f'paraphrase_{method_name}',
                quality_score=overlap,
                metadata={'overlap': overlap}
            ))
        
        return samples


class QualityFilter:
    """Filter synthetic data by quality."""
    def __init__(self, min_length: int = 10, max_length: int = 1000):
        self.min_length = min_length
        self.max_length = max_length
        self.filters = []

    def add_filter(self, name: str, filter_func):
        """Add custom filter."""
        self.filters.append((name, filter_func))

    def _length_check(self, text: str) -> Tuple[bool, float]:
        """Check text length."""
        length = len(text)
        
        if length < self.min_length or length > self.max_length:
            return False, 0.0
        
        # Score based on optimal length
        optimal = (self.min_length + self.max_length) / 2
        distance = abs(length - optimal) / optimal
        score = max(0, 1 - distance)
        
        return True, score

    def _coherence_check(self, text: str) -> Tuple[bool, float]:
        """Check text coherence."""
        # Simple heuristics
        words = text.split()
        
        if len(words) < 2:
            return False, 0.0
        
        # Check for repeated words
        unique_ratio = len(set(words)) / len(words)
        
        # Check for sentence structure (has punctuation)
        has_punct = bool(re.search(r'[.!?,;:]', text))
        
        score = unique_ratio * 0.7 + (0.3 if has_punct else 0)
        
        return score > 0.3, score

    def _diversity_check(self, text: str, existing: List[str]) -> Tuple[bool, float]:
        """Check diversity against existing samples."""
        if not existing:
            return True, 1.0
        
        text_words = set(text.lower().split())
        min_distance = 1.0
        
        for existing_text in existing:
            existing_words = set(existing_text.lower().split())
            overlap = len(text_words & existing_words) / len(text_words | existing_words)
            distance = 1 - overlap
            min_distance = min(min_distance, distance)
        
        return min_distance > 0.2, min_distance

    def filter(
        self, 
        samples: List[SyntheticSample], 
        threshold: float = 0.5
    ) -> List[SyntheticSample]:
        """Filter samples by quality."""
        filtered = []
        existing_texts = []
        
        for sample in samples:
            text = sample.generated
            
            # Run checks
            length_ok, length_score = self._length_check(text)
            coherence_ok, coherence_score = self._coherence_check(text)
            diversity_ok, diversity_score = self._diversity_check(text, existing_texts)
            
            if not (length_ok and coherence_ok and diversity_ok):
                continue
            
            # Aggregate score
            total_score = (length_score + coherence_score + diversity_score) / 3
            
            if total_score >= threshold:
                sample.quality_score = total_score
                filtered.append(sample)
                existing_texts.append(text)
        
        return filtered


class SyntheticDataGenerator:
    """Complete synthetic data generation pipeline."""
    def __init__(self):
        self.template_gen = TemplateGenerator()
        self.paraphraser = Paraphraser()
        self.filter = QualityFilter()

    def generate_from_templates(
        self, 
        templates: Dict[str, Dict], 
        n_samples: int = 100
    ) -> List[SyntheticSample]:
        """Generate data from templates."""
        for name, config in templates.items():
            self.template_gen.add_template(
                name,
                config['template'],
                config.get('slots', {})
            )
        
        all_samples = []
        for name in templates:
            samples = self.template_gen.generate(name, n_samples // len(templates))
            all_samples.extend(samples)
        
        return self.filter.filter(all_samples)

    def augment_dataset(
        self, 
        texts: List[str], 
        augmentation_factor: int = 3
    ) -> List[SyntheticSample]:
        """Augment existing dataset with paraphrases."""
        all_samples = []
        
        for text in texts:
            variants = self.paraphraser.paraphrase(text, augmentation_factor)
            all_samples.extend(variants)
        
        return self.filter.filter(all_samples)
