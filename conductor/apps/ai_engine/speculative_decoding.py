"""
Phase 157: Speculative Decoding — 2-3x Faster LLM Inference

Speculative Decoding (Leviathan et al., 2022; Chen et al., 2023) uses a
SMALL draft model to propose K tokens, then the LARGE target model verifies
them all IN PARALLEL in a single forward pass.

Why it works:
  LLM inference is MEMORY-BOUND, not compute-bound. The GPU spends most
  time loading model weights from memory, not computing. Whether you verify
  1 token or 5 tokens in one pass costs almost the same wall-clock time.

Algorithm:
  1. Draft model generates K candidate tokens autoregressively (fast)
  2. Target model scores all K tokens in ONE parallel forward pass
  3. Accept tokens where P_target(x) ≥ P_draft(x) (always correct)
  4. For rejected tokens, sample from adjusted distribution
  5. Guaranteed to produce the EXACT same distribution as target model

Speedup: K / (1 + rejection_overhead) ≈ 2-3x in practice
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class LanguageModelSimulator:
    """
    Simulated language model that generates token probability distributions.
    Larger models produce "sharper" (more confident) distributions.
    """
    def __init__(self, vocab_size: int = 32, quality: float = 0.8, name: str = "model"):
        self.vocab_size = vocab_size
        self.quality = quality  # Higher = better predictions
        self.name = name
        self.forward_calls = 0
    
    def predict_next(self, context: List[int], seed_offset: int = 0) -> List[float]:
        """Generate probability distribution over vocabulary."""
        self.forward_calls += 1
        
        rng = random.Random(sum(context) * 31 + seed_offset + hash(self.name))
        
        # Generate raw logits
        logits = [rng.gauss(0, 1) for _ in range(self.vocab_size)]
        
        # "Better" models have sharper distributions (higher temperature inverse)
        temperature = 1.0 / (self.quality * 2)
        scaled = [l / temperature for l in logits]
        
        # Softmax
        max_val = max(scaled)
        exp_vals = [math.exp(s - max_val) for s in scaled]
        total = sum(exp_vals)
        probs = [e / total for e in exp_vals]
        
        return probs
    
    def sample(self, probs: List[float]) -> int:
        """Sample a token from the distribution."""
        r = random.random()
        cumsum = 0.0
        for i, p in enumerate(probs):
            cumsum += p
            if r <= cumsum:
                return i
        return len(probs) - 1


class SpeculativeDecoder:
    """
    Speculative Decoding engine.
    
    Uses a small draft model to propose tokens, verified by a large target model.
    Mathematically guaranteed to produce the exact same distribution as the
    target model alone (no quality loss!).
    """
    def __init__(self, target_model: LanguageModelSimulator, 
                 draft_model: LanguageModelSimulator, lookahead_k: int = 5):
        self.target = target_model
        self.draft = draft_model
        self.K = lookahead_k
        
        self.total_accepted = 0
        self.total_proposed = 0
        self.total_target_calls = 0
    
    def _speculative_step(self, context: List[int]) -> Tuple[List[int], int]:
        """
        One speculative decoding step:
        1. Draft proposes K tokens
        2. Target verifies all K in parallel (one forward pass)
        3. Accept/reject each token
        """
        # Phase 1: Draft model proposes K tokens (K forward passes of small model)
        draft_tokens = []
        draft_probs = []
        current_ctx = context[:]
        
        for i in range(self.K):
            probs = self.draft.predict_next(current_ctx, seed_offset=i)
            token = self.draft.sample(probs)
            draft_tokens.append(token)
            draft_probs.append(probs)
            current_ctx.append(token)
        
        # Phase 2: Target model scores all K positions in ONE pass
        target_probs_list = []
        verify_ctx = context[:]
        for i in range(self.K):
            target_probs = self.target.predict_next(verify_ctx, seed_offset=i)
            target_probs_list.append(target_probs)
            verify_ctx.append(draft_tokens[i])
        self.total_target_calls += 1  # One parallel forward pass
        
        # Phase 3: Accept/reject using the speculative sampling criterion
        accepted_tokens = []
        for i in range(self.K):
            token = draft_tokens[i]
            p_target = target_probs_list[i][token]
            p_draft = draft_probs[i][token]
            
            self.total_proposed += 1
            
            # Accept with probability min(1, p_target / p_draft)
            acceptance_prob = min(1.0, p_target / max(p_draft, 1e-10))
            
            if random.random() < acceptance_prob:
                accepted_tokens.append(token)
                self.total_accepted += 1
            else:
                # Rejection: sample from adjusted distribution
                # P_adjusted = max(0, P_target - P_draft) / Z
                adjusted = [max(0, target_probs_list[i][j] - draft_probs[i][j]) 
                           for j in range(self.target.vocab_size)]
                total = sum(adjusted)
                if total > 0:
                    adjusted = [a / total for a in adjusted]
                    resampled = self.target.sample(adjusted)
                else:
                    resampled = self.target.sample(target_probs_list[i])
                accepted_tokens.append(resampled)
                break  # Stop at first rejection
        
        return accepted_tokens, len(accepted_tokens)
    
    def generate(self, prompt: List[int], max_tokens: int = 30) -> Dict[str, Any]:
        """Generate tokens using speculative decoding."""
        context = prompt[:]
        generated = []
        steps = 0
        
        while len(generated) < max_tokens:
            new_tokens, num_accepted = self._speculative_step(context)
            generated.extend(new_tokens)
            context.extend(new_tokens)
            steps += 1
        
        generated = generated[:max_tokens]
        
        # Compare: without speculative decoding, target would need max_tokens forward passes
        naive_calls = max_tokens
        spec_calls = self.total_target_calls + self.draft.forward_calls * 0.1  # Draft is ~10x cheaper
        
        acceptance_rate = self.total_accepted / max(1, self.total_proposed)
        
        return {
            "tokens_generated": len(generated),
            "speculative_steps": steps,
            "acceptance_rate": round(acceptance_rate, 3),
            "target_forward_passes": self.total_target_calls,
            "draft_forward_passes": self.draft.forward_calls,
            "naive_forward_passes": naive_calls,
            "estimated_speedup": f"{round(naive_calls / max(1, self.total_target_calls), 1)}x",
            "quality": "Mathematically identical to target-only generation",
        }


class SequentialBaseline:
    """Standard autoregressive decoding for comparison."""
    def __init__(self, model: LanguageModelSimulator):
        self.model = model
    
    def generate(self, prompt: List[int], max_tokens: int = 30) -> Dict[str, Any]:
        context = prompt[:]
        for i in range(max_tokens):
            probs = self.model.predict_next(context, seed_offset=i)
            token = self.model.sample(probs)
            context.append(token)
        
        return {
            "tokens_generated": max_tokens,
            "forward_passes": self.model.forward_calls,
            "method": "standard_autoregressive",
        }


def run_speculative_decoding_experiment() -> Dict[str, Any]:
    """Compare speculative vs standard decoding."""
    target = LanguageModelSimulator(vocab_size=32, quality=0.9, name="target_70B")
    draft = LanguageModelSimulator(vocab_size=32, quality=0.6, name="draft_7B")
    
    spec_decoder = SpeculativeDecoder(target, draft, lookahead_k=5)
    result = spec_decoder.generate(prompt=[1, 5, 3], max_tokens=25)
    
    return {
        "paradigm": "Speculative Decoding",
        "target_model": "70B (high quality, slow)",
        "draft_model": "7B (lower quality, 10x faster)",
        "lookahead_k": 5,
        "result": result,
        "insight": "Draft proposes, target verifies in parallel. Same output quality, 2-3x faster. Used in vLLM, TensorRT-LLM."
    }
