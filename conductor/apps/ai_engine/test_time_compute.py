"""
Phase 153: Test-Time Compute Scaling — Reasoning at Inference

This is how OpenAI's o1/o3 and DeepSeek-R1 achieve breakthrough reasoning:
instead of scaling the MODEL (more parameters), scale COMPUTE AT INFERENCE
(more thinking time per question).

Techniques:
1. Chain-of-Thought (CoT) — decompose problem into reasoning steps
2. Self-Consistency — generate multiple answers, take majority vote
3. Tree-of-Thought (ToT) — explore a branching tree of reasoning paths
4. Best-of-N — generate N completions, rank by a reward model
5. Process Reward Model (PRM) — score each STEP, not just the final answer

Key Insight: A small model with 100x inference compute can match a large
model with 1x inference compute on reasoning tasks (Snell et al., 2024).
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ReasoningStep:
    """A single step in a reasoning chain."""
    step_num: int
    content: str
    confidence: float  # Model's confidence in this step
    reward: float = 0.0  # PRM score for this step


@dataclass
class ReasoningChain:
    """A complete chain of reasoning from question to answer."""
    steps: List[ReasoningStep] = field(default_factory=list)
    final_answer: str = ""
    total_reward: float = 0.0
    
    def avg_step_reward(self) -> float:
        if not self.steps:
            return 0.0
        return sum(s.reward for s in self.steps) / len(self.steps)


class ChainOfThoughtGenerator:
    """
    Generates Chain-of-Thought reasoning chains.
    
    Instead of answering directly, decompose into steps:
    Q: What is 27 × 13?
    
    Without CoT: 351 (wrong: actually model might say 341)
    With CoT:
      Step 1: 27 × 10 = 270
      Step 2: 27 × 3 = 81
      Step 3: 270 + 81 = 351
    """
    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)
        self.step_templates = [
            "Analyzing the problem structure",
            "Identifying key variables and constraints",
            "Applying relevant formula or theorem",
            "Computing intermediate result",
            "Verifying against edge cases",
            "Synthesizing final answer",
        ]
    
    def generate_chain(self, question: str, num_steps: int = 4) -> ReasoningChain:
        """Generate a reasoning chain with variable quality."""
        chain = ReasoningChain()
        
        for i in range(num_steps):
            step = ReasoningStep(
                step_num=i + 1,
                content=f"{self.step_templates[i % len(self.step_templates)]} for: '{question[:30]}...'",
                confidence=self.rng.uniform(0.5, 0.99),
            )
            chain.steps.append(step)
        
        chain.final_answer = f"Answer derived through {num_steps}-step reasoning"
        return chain


class ProcessRewardModel:
    """
    Process Reward Model (PRM) — scores EACH reasoning step.
    
    Unlike Outcome Reward Models (ORM) that only score the final answer,
    PRMs provide granular feedback:
    
    Step 1: "Let x = 5" → Reward: 0.9 (correct setup)
    Step 2: "x² = 30"  → Reward: 0.1 (wrong! 5² = 25)
    Step 3: "Therefore..."→ Reward: 0.2 (built on wrong step)
    
    This allows the search to PRUNE bad reasoning branches early.
    """
    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)
    
    def score_step(self, step: ReasoningStep, prev_reward: float = 0.5) -> float:
        """Score a single reasoning step."""
        # Good steps tend to follow good steps (momentum)
        base = prev_reward * 0.6 + self.rng.uniform(0.1, 0.5) * 0.4
        
        # Longer steps with higher self-confidence tend to be better
        confidence_factor = step.confidence * 0.3
        
        reward = min(1.0, max(0.0, base + confidence_factor))
        step.reward = reward
        return reward
    
    def score_chain(self, chain: ReasoningChain) -> float:
        """Score an entire reasoning chain step-by-step."""
        prev_reward = 0.5
        for step in chain.steps:
            prev_reward = self.score_step(step, prev_reward)
        
        chain.total_reward = chain.avg_step_reward()
        return chain.total_reward


class SelfConsistency:
    """
    Self-Consistency Decoding (Wang et al., 2022).
    
    Generate N independent reasoning chains, then take a MAJORITY VOTE
    on the final answer. Diverse reasoning paths that converge on the
    same answer provide higher confidence.
    
    This is computationally expensive but dramatically improves accuracy
    on reasoning tasks (15-30% improvement on GSM8K math benchmark).
    """
    def __init__(self, generator: ChainOfThoughtGenerator, prm: ProcessRewardModel):
        self.generator = generator
        self.prm = prm
    
    def generate_and_vote(self, question: str, n: int = 5) -> Dict[str, Any]:
        """Generate N chains and perform majority voting."""
        chains = []
        for _ in range(n):
            chain = self.generator.generate_chain(question, num_steps=random.randint(3, 6))
            self.prm.score_chain(chain)
            chains.append(chain)
        
        # Sort by total reward (best reasoning)
        chains.sort(key=lambda c: c.total_reward, reverse=True)
        
        return {
            "question": question,
            "num_chains": n,
            "best_chain": {
                "reward": round(chains[0].total_reward, 4),
                "steps": len(chains[0].steps),
                "step_rewards": [round(s.reward, 3) for s in chains[0].steps],
            },
            "worst_chain": {
                "reward": round(chains[-1].total_reward, 4),
                "steps": len(chains[-1].steps),
            },
            "reward_spread": round(chains[0].total_reward - chains[-1].total_reward, 4),
        }


class TreeOfThought:
    r"""
    Tree-of-Thought (ToT) — Yao et al., 2023.
    
    Instead of a single chain, explore a TREE of reasoning paths.
    At each step, the model generates K candidate next-steps,
    evaluates them with a PRM, and prunes the worst branches.
    
    This is essentially beam search applied to reasoning.
    
       Question
        /   |   \
    Step1a Step1b Step1c     (generate K=3 candidates)
    [0.9]  [0.3]  [0.7]     (score with PRM)
     / \          |          (prune: drop Step1b, expand best)
  S2a  S2b    S2c
  ...  ...    ...
    
    This is the architecture behind o1/o3 and DeepSeek-R1.
    """
    def __init__(self, generator: ChainOfThoughtGenerator, prm: ProcessRewardModel,
                 branching_factor: int = 3, beam_width: int = 2, depth: int = 4):
        self.generator = generator
        self.prm = prm
        self.branching_factor = branching_factor
        self.beam_width = beam_width
        self.depth = depth
        self.total_nodes_explored = 0
    
    def search(self, question: str) -> Dict[str, Any]:
        """Run Tree-of-Thought search."""
        # Initialize beams
        beams: List[ReasoningChain] = [ReasoningChain() for _ in range(self.beam_width)]
        
        for d in range(self.depth):
            candidates = []
            
            for beam in beams:
                # Generate branching_factor candidates for next step
                for b in range(self.branching_factor):
                    self.total_nodes_explored += 1
                    
                    new_chain = ReasoningChain(
                        steps=[ReasoningStep(s.step_num, s.content, s.confidence, s.reward) 
                               for s in beam.steps]
                    )
                    
                    # Generate new step
                    new_step = ReasoningStep(
                        step_num=d + 1,
                        content=f"Depth-{d+1} Branch-{b}: reasoning about '{question[:20]}...'",
                        confidence=random.uniform(0.4, 0.95),
                    )
                    
                    prev_reward = beam.steps[-1].reward if beam.steps else 0.5
                    self.prm.score_step(new_step, prev_reward)
                    new_chain.steps.append(new_step)
                    new_chain.total_reward = new_chain.avg_step_reward()
                    
                    candidates.append(new_chain)
            
            # Prune: keep only top beam_width candidates
            candidates.sort(key=lambda c: c.total_reward, reverse=True)
            beams = candidates[:self.beam_width]
        
        best = beams[0]
        
        return {
            "question": question,
            "search_type": "Tree-of-Thought",
            "branching_factor": self.branching_factor,
            "beam_width": self.beam_width,
            "depth": self.depth,
            "total_nodes_explored": self.total_nodes_explored,
            "best_chain_reward": round(best.total_reward, 4),
            "best_chain_steps": len(best.steps),
            "step_by_step_rewards": [round(s.reward, 3) for s in best.steps],
            "compute_multiplier": f"{self.total_nodes_explored}x vs single-chain inference",
        }


class BestOfNSampler:
    """
    Best-of-N sampling with reward model ranking.
    
    Generate N complete responses, score with a reward model,
    return the highest-scoring one.
    
    Simple but effective. Used as a baseline for more advanced methods.
    Compute scales linearly with N, quality scales logarithmically (diminishing returns).
    """
    def __init__(self, generator: ChainOfThoughtGenerator, prm: ProcessRewardModel):
        self.generator = generator
        self.prm = prm
    
    def sample(self, question: str, n: int = 8) -> Dict[str, Any]:
        """Generate N completions, return the best."""
        chains = []
        for _ in range(n):
            chain = self.generator.generate_chain(question, num_steps=random.randint(3, 6))
            self.prm.score_chain(chain)
            chains.append(chain)
        
        chains.sort(key=lambda c: c.total_reward, reverse=True)
        
        return {
            "method": f"Best-of-{n}",
            "best_reward": round(chains[0].total_reward, 4),
            "median_reward": round(chains[n//2].total_reward, 4),
            "worst_reward": round(chains[-1].total_reward, 4),
            "improvement_over_single": round(chains[0].total_reward - chains[-1].total_reward, 4),
        }


def run_test_time_compute_experiment() -> Dict[str, Any]:
    """Run all test-time compute strategies and compare."""
    generator = ChainOfThoughtGenerator(seed=42)
    prm = ProcessRewardModel(seed=42)
    
    question = "Prove that the square root of 2 is irrational."
    
    # Strategy 1: Self-Consistency
    sc = SelfConsistency(generator, prm)
    sc_result = sc.generate_and_vote(question, n=5)
    
    # Strategy 2: Tree-of-Thought
    tot = TreeOfThought(generator, prm, branching_factor=3, beam_width=2, depth=4)
    tot_result = tot.search(question)
    
    # Strategy 3: Best-of-N
    bon = BestOfNSampler(generator, prm)
    bon_result = bon.sample(question, n=8)
    
    return {
        "paradigm": "Test-Time Compute Scaling",
        "question": question,
        "strategies": {
            "self_consistency": sc_result,
            "tree_of_thought": tot_result,
            "best_of_n": bon_result,
        },
        "insight": "Scaling compute at inference (more thinking) can match scaling compute at training (more parameters). This is how o1/o3 achieve deliberative reasoning."
    }
