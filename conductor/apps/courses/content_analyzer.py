"""
Content Analyzer Service

Uses Information Bottleneck principles to extract key concepts
from lesson content, enabling efficient learning.

Features:
1. Key takeaway extraction
2. Concept importance ranking
3. Content compression metrics
"""

import logging
import math
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from collections import Counter

logger = logging.getLogger(__name__)


@dataclass
class ConceptWeight:
    """Weighted concept from content analysis."""
    term: str
    weight: float
    occurrences: int
    information_content: float  # Bits


class ContentAnalyzer:
    """
    Analyzes lesson content to extract essential concepts.
    
    Uses Information Bottleneck approximation to identify
    concepts that maximize relevance while minimizing redundancy.
    """
    
    # Stop words to filter
    STOP_WORDS = {
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'could', 'should', 'may', 'might', 'must', 'shall',
        'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
        'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
        'through', 'during', 'before', 'after', 'above', 'below',
        'between', 'under', 'again', 'further', 'then', 'once',
        'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either',
        'neither', 'not', 'only', 'own', 'same', 'than', 'too',
        'very', 'just', 'also', 'now', 'here', 'there', 'when',
        'where', 'why', 'how', 'all', 'each', 'every', 'both',
        'few', 'more', 'most', 'other', 'some', 'such', 'no',
        'this', 'that', 'these', 'those', 'what', 'which', 'who',
        'whom', 'whose', 'it', 'its', 'we', 'our', 'you', 'your',
        'they', 'their', 'he', 'she', 'him', 'her', 'his', 'i', 'me', 'my'
    }
    
    # Technical terms to boost (domain-specific)
    TECHNICAL_BOOST = {
        'algorithm', 'function', 'class', 'method', 'variable',
        'loop', 'recursion', 'array', 'list', 'dictionary', 'hash',
        'tree', 'graph', 'node', 'edge', 'stack', 'queue', 'heap',
        'sort', 'search', 'binary', 'linear', 'complexity', 'time',
        'space', 'memory', 'pointer', 'reference', 'object', 'data',
        'structure', 'pattern', 'design', 'api', 'database', 'query',
        'sql', 'python', 'javascript', 'java', 'cpp', 'rust', 'go'
    }
    
    def __init__(self, beta: float = 0.5):
        """
        Initialize analyzer.
        
        Args:
            beta: IB trade-off parameter (higher = more compression)
        """
        self.beta = beta
    
    def analyze(self, content: str, title: str = "") -> Dict:
        """
        Analyze content and extract key concepts.
        
        Returns:
            Analysis result with key concepts, summary, and metrics
        """
        # Tokenize and clean
        tokens = self._tokenize(content)
        
        if len(tokens) < 10:
            return {
                'key_concepts': [],
                'summary': 'Content too short for analysis.',
                'metrics': {'compression_ratio': 0, 'information_retained': 0}
            }
        
        # Compute term frequencies
        term_freq = Counter(tokens)
        total_tokens = len(tokens)
        
        # Compute information content for each term
        concepts = []
        for term, count in term_freq.items():
            if term.lower() in self.STOP_WORDS:
                continue
            if len(term) < 3:
                continue
            
            # Term frequency
            tf = count / total_tokens
            
            # Information content: -log2(P(term))
            # Lower probability = higher information
            info_content = -math.log2(tf) if tf > 0 else 0
            
            # Apply technical boost
            weight = tf * info_content
            if term.lower() in self.TECHNICAL_BOOST:
                weight *= 2.0
            
            concepts.append(ConceptWeight(
                term=term,
                weight=weight,
                occurrences=count,
                information_content=info_content
            ))
        
        # Sort by weight (IB optimal: high info, moderate frequency)
        concepts.sort(key=lambda c: c.weight, reverse=True)
        
        # Apply compression (keep top concepts based on beta)
        n_concepts = max(3, int(len(concepts) * (1 - self.beta)))
        key_concepts = concepts[:n_concepts]
        
        # Compute metrics
        total_info = sum(c.information_content for c in concepts)
        retained_info = sum(c.information_content for c in key_concepts)
        
        return {
            'key_concepts': [
                {
                    'term': c.term,
                    'weight': round(c.weight, 4),
                    'occurrences': c.occurrences
                }
                for c in key_concepts[:10]  # Top 10
            ],
            'summary': self._generate_summary(title, key_concepts[:5]),
            'metrics': {
                'total_words': total_tokens,
                'unique_terms': len(concepts),
                'key_terms_extracted': len(key_concepts),
                'compression_ratio': round(len(key_concepts) / max(1, len(concepts)), 3),
                'information_retained': round(retained_info / max(1, total_info), 3)
            }
        }
    
    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into words."""
        # Remove markdown, HTML, code blocks
        text = re.sub(r'```[\s\S]*?```', '', text)
        text = re.sub(r'`[^`]+`', '', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
        
        # Split into words
        words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9_]*\b', text)
        
        return words
    
    def _generate_summary(self, title: str, top_concepts: List[ConceptWeight]) -> str:
        """Generate a brief summary from key concepts."""
        if not top_concepts:
            return "No key concepts identified."
        
        concept_str = ", ".join(c.term for c in top_concepts[:3])
        
        if title:
            return f"**{title}** covers: {concept_str} and related topics."
        else:
            return f"Key topics: {concept_str}."
    
    def extract_key_takeaways(self, content: str, n: int = 5) -> List[str]:
        """
        Extract key takeaways as bullet points.
        
        Simple sentence extraction based on concept density.
        """
        analysis = self.analyze(content)
        key_terms = {c['term'].lower() for c in analysis['key_concepts']}
        
        # Split into sentences
        sentences = re.split(r'[.!?]+', content)
        
        # Score sentences by key term density
        scored = []
        for sent in sentences:
            sent = sent.strip()
            if len(sent) < 20:
                continue
            
            words = set(w.lower() for w in re.findall(r'\b\w+\b', sent))
            score = len(words & key_terms) / max(1, len(words))
            
            scored.append((score, sent))
        
        # Return top N
        scored.sort(reverse=True)
        
        return [sent for _, sent in scored[:n]]


class LessonAnalysisService:
    """
    Service for analyzing lessons and caching results.
    """
    _cache: Dict[int, Dict] = {}
    
    @classmethod
    def analyze_lesson(cls, lesson_id: int, content: str, title: str = "") -> Dict:
        """Analyze a lesson, with caching."""
        if lesson_id in cls._cache:
            return cls._cache[lesson_id]
        
        analyzer = ContentAnalyzer(beta=0.5)
        result = analyzer.analyze(content, title)
        result['takeaways'] = analyzer.extract_key_takeaways(content, n=5)
        
        cls._cache[lesson_id] = result
        return result
    
    @classmethod
    def invalidate_cache(cls, lesson_id: int):
        """Invalidate cache for a lesson."""
        cls._cache.pop(lesson_id, None)
