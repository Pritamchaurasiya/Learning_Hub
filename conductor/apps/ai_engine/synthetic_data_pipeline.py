"""
Phase 158: Synthetic Data Generation Pipeline — Self-Improving AI

Synthetic data is how Microsoft trained Phi-3 (small but powerful) and how
NVIDIA built Nemotron-4. Instead of collecting real data (expensive, slow),
use a STRONG model to generate training data for a WEAKER model.

Pipeline:
  1. Seed Topics → LLM generates diverse questions
  2. Strong Model → generates high-quality answers
  3. Quality Filter → score and filter bad examples
  4. Decontamination → remove test-set leakage
  5. Fine-tune → train target model on synthetic data

Key Techniques:
  - Evol-Instruct (WizardLM): Evolve simple prompts into complex ones
  - Self-Instruct: Model generates its own instruction-following data
  - Rejection Sampling: Generate many, keep only the best
  - Constitutional AI: Filter for safety and alignment
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class SyntheticExample:
    """A single synthetic training example."""
    instruction: str
    input_text: str
    output: str
    quality_score: float = 0.0
    complexity_level: int = 1  # 1=simple, 5=expert
    topic: str = ""
    is_safe: bool = True


class EvolInstruct:
    """
    Evol-Instruct (WizardLM) — evolve simple instructions into complex ones.
    
    Evolution operators:
      1. ADD CONSTRAINTS: "Write a function" → "Write a function in O(n log n) time"
      2. DEEPEN: "Explain X" → "Explain X with formal proof and examples"
      3. CONCRETIZE: "Solve a problem" → "Solve this specific problem: ..."
      4. INCREASE REASONING: Add multi-step reasoning requirements
      5. BROADEN: Expand to cover edge cases
    """
    EVOLUTION_OPS = [
        ("add_constraints", "Add specific constraints or requirements"),
        ("deepen", "Request deeper analysis or formal reasoning"),
        ("concretize", "Make the instruction more specific with concrete examples"),
        ("increase_reasoning", "Require multi-step reasoning or chain-of-thought"),
        ("broaden", "Expand to cover edge cases and exceptions"),
    ]
    
    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)
    
    def evolve(self, instruction: str, num_steps: int = 3) -> List[Dict[str, Any]]:
        """Evolve an instruction through multiple complexity levels."""
        evolved = [{"level": 1, "instruction": instruction, "evolution": "original"}]
        current = instruction
        
        for step in range(num_steps):
            op_name, op_desc = self.rng.choice(self.EVOLUTION_OPS)
            evolved_instruction = self._apply_evolution(current, op_name, step + 2)
            evolved.append({
                "level": step + 2,
                "instruction": evolved_instruction,
                "evolution": op_name,
            })
            current = evolved_instruction
        
        return evolved
    
    def _apply_evolution(self, instruction: str, op: str, level: int) -> str:
        """Apply an evolution operator to increase complexity."""
        prefixes = {
            "add_constraints": f"[Level {level}] {instruction} Additionally, ensure O(n) time complexity and handle edge cases with empty inputs.",
            "deepen": f"[Level {level}] {instruction} Provide a formal mathematical proof and include at least 3 worked examples with increasing difficulty.",
            "concretize": f"[Level {level}] Given the following specific scenario: {instruction} Show your complete solution step-by-step.",
            "increase_reasoning": f"[Level {level}] {instruction} Use chain-of-thought reasoning. First analyze the problem, then identify the approach, then implement, then verify.",
            "broaden": f"[Level {level}] {instruction} Consider all edge cases including null inputs, maximum values, concurrent access, and unicode characters.",
        }
        return prefixes.get(op, instruction)


class QualityScorer:
    """
    Scores synthetic examples for training quality.
    
    Criteria:
      1. Instruction clarity (0-1)
      2. Response completeness (0-1)
      3. Factual consistency (0-1)
      4. Complexity appropriateness (0-1)
      5. Safety (binary: safe/unsafe)
    """
    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)
    
    def score(self, example: SyntheticExample) -> float:
        """Score a synthetic example."""
        instruction_len = len(example.instruction)
        output_len = len(example.output)
        
        # Longer, more detailed responses tend to be better (up to a point)
        clarity = min(1.0, instruction_len / 100)
        completeness = min(1.0, output_len / 200)
        
        # Complexity bonus
        complexity_score = min(1.0, example.complexity_level / 5)
        
        # Simulated factual consistency
        consistency = self.rng.uniform(0.6, 1.0)
        
        # Safety check (constitutional AI)
        safety_score = 1.0 if example.is_safe else 0.0
        
        total = (clarity * 0.2 + completeness * 0.3 + consistency * 0.25 +
                 complexity_score * 0.15 + safety_score * 0.1)
        
        example.quality_score = round(total, 4)
        return total


class Decontaminator:
    """
    Removes examples that overlap with evaluation benchmarks.
    
    This is CRITICAL: if synthetic training data contains test questions,
    the model will appear to perform well but hasn't actually learned anything.
    
    Methods:
      1. N-gram overlap: Check for 13-gram matches with test sets
      2. Embedding similarity: Flag examples too similar to benchmarks
    """
    def __init__(self, benchmark_ngrams: Optional[set] = None):
        self.benchmark_ngrams = benchmark_ngrams or set()
        self.contaminated_count = 0
    
    def add_benchmark(self, text: str, n: int = 13):
        """Add benchmark text to the contamination filter."""
        words = text.lower().split()
        for i in range(len(words) - n + 1):
            ngram = " ".join(words[i:i+n])
            self.benchmark_ngrams.add(ngram)
    
    def is_contaminated(self, example: SyntheticExample, n: int = 13) -> bool:
        """Check if an example overlaps with benchmarks."""
        text = (example.instruction + " " + example.output).lower()
        words = text.split()
        
        for i in range(len(words) - n + 1):
            ngram = " ".join(words[i:i+n])
            if ngram in self.benchmark_ngrams:
                self.contaminated_count += 1
                return True
        return False


class SyntheticDataPipeline:
    """
    End-to-end synthetic data generation pipeline.
    
    Seed Topics → Evolve → Generate → Score → Filter → Decontaminate → Output
    """
    def __init__(self, quality_threshold: float = 0.5, seed: int = 42):
        self.evolver = EvolInstruct(seed=seed)
        self.scorer = QualityScorer(seed=seed)
        self.decontaminator = Decontaminator()
        self.quality_threshold = quality_threshold
        self.rng = random.Random(seed)
        
        # Seed topics for an educational platform
        self.seed_topics = [
            ("python_basics", "Explain Python list comprehensions"),
            ("algorithms", "Implement binary search"),
            ("databases", "Design a normalized database schema"),
            ("ml_concepts", "Explain gradient descent intuitively"),
            ("security", "Describe SQL injection and how to prevent it"),
            ("systems", "Explain how DNS resolution works"),
            ("math", "Prove the Pythagorean theorem"),
            ("data_structures", "Implement a balanced BST"),
        ]
    
    def generate_dataset(self, num_examples: int = 40) -> Dict[str, Any]:
        """Generate a full synthetic dataset."""
        all_examples = []
        rejected = 0
        contaminated = 0
        
        for i in range(num_examples):
            topic_id, seed_instruction = self.rng.choice(self.seed_topics)
            
            # Evolve the instruction
            evolved = self.evolver.evolve(seed_instruction, num_steps=2)
            chosen = self.rng.choice(evolved)
            
            # Generate a synthetic example
            example = SyntheticExample(
                instruction=chosen["instruction"],
                input_text=f"Context for {topic_id}",
                output=f"Detailed {chosen['level']}-level response for: {chosen['instruction'][:60]}... "
                       f"This covers the key concepts, provides examples, and explains edge cases.",
                complexity_level=chosen["level"],
                topic=topic_id,
                is_safe=self.rng.random() > 0.05,  # 5% unsafe
            )
            
            # Score quality
            score = self.scorer.score(example)
            
            # Filter by quality
            if score < self.quality_threshold:
                rejected += 1
                continue
            
            # Decontamination check
            if self.decontaminator.is_contaminated(example):
                contaminated += 1
                continue
            
            all_examples.append(example)
        
        # Dataset statistics
        topic_dist = {}
        for ex in all_examples:
            topic_dist[ex.topic] = topic_dist.get(ex.topic, 0) + 1
        
        avg_quality = sum(e.quality_score for e in all_examples) / max(1, len(all_examples))
        avg_complexity = sum(e.complexity_level for e in all_examples) / max(1, len(all_examples))
        
        return {
            "paradigm": "Synthetic Data Generation Pipeline",
            "total_generated": num_examples,
            "accepted": len(all_examples),
            "rejected_quality": rejected,
            "rejected_contamination": contaminated,
            "acceptance_rate": round(len(all_examples) / num_examples, 3),
            "avg_quality_score": round(avg_quality, 4),
            "avg_complexity_level": round(avg_complexity, 2),
            "topic_distribution": topic_dist,
            "pipeline_stages": ["Seed Topics", "Evol-Instruct", "Generation", 
                               "Quality Scoring", "Filtering", "Decontamination"],
            "insight": "Synthetic data pipelines are how Phi-3 achieves near-GPT-4 quality at 1/50 the size. The key is quality filtering + diversity."
        }


def run_synthetic_data_experiment() -> Dict[str, Any]:
    """Run the synthetic data pipeline."""
    pipeline = SyntheticDataPipeline(quality_threshold=0.45, seed=42)
    return pipeline.generate_dataset(num_examples=50)
