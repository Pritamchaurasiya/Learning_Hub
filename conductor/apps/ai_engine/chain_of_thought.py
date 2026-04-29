"""
Chain-of-Thought Reasoning

Advanced reasoning techniques:
1. Step-by-step decomposition.
2. Self-consistency with multiple paths.
3. Tree of Thoughts exploration.
"""

import logging
import random
import math
from typing import List, Dict, Tuple, Optional, Callable, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ReasoningType(Enum):
    DIRECT = "direct"
    COT = "chain_of_thought"
    SELF_CONSISTENCY = "self_consistency"
    TREE_OF_THOUGHTS = "tree_of_thoughts"


@dataclass
class ThoughtStep:
    step_number: int
    content: str
    confidence: float
    children: Optional[List['ThoughtStep']] = None


from apps.ai_engine.ai_client import AIClient

class StepByStepDecomposer:
    """Decompose problems into reasoning steps using LLM."""
    def __init__(self):
        pass

    def decompose(self, problem: str, n_steps: int = 4) -> List[str]:
        """Decompose problem into reasoning steps."""
        prompt = f"""
        Break down the following problem into a step-by-step reasoning chain.
        Problem: {problem}
        
        Output format:
        Step 1: ...
        Step 2: ...
        ...
        Answer: ...
        """
        try:
            response = AIClient.generate_text(prompt)
            steps = [line.strip() for line in response.split('\n') if line.strip()]
            return steps
        except Exception as e:
            logger.error(f"CoT Decomposition failed: {e}")
            return [f"Error decomposing problem: {e}"]

    def format_cot_prompt(self, problem: str) -> str:
        """Format problem with CoT instruction."""
        return f"""Problem: {problem}
Let's think step by step:"""


class SelfConsistency:
    """Self-consistency through multiple reasoning paths."""
    def __init__(self, n_paths: int = 3, temperature: float = 0.7):
        self.n_paths = n_paths
        self.temperature = temperature

    def generate_paths(self, problem: str, generator: Optional[Callable] = None) -> List[List[str]]:
        """Generate multiple reasoning paths."""
        paths = []
        
        prompt = f"""
        Solve the following problem. Show your reasoning steps clearly.
        Problem: {problem}
        """
        
        for _ in range(self.n_paths):
            try:
                # In a real API, we'd pass temperature here
                # AIClient might not support temp param exposed yet, but we call it multiple times
                response = AIClient.generate_text(prompt)
                path = [line.strip() for line in response.split('\n') if line.strip()]
                paths.append(path)
            except Exception as e:
                logger.error(f"Path generation failed: {e}")
                paths.append(["Error generating path"])
        
        return paths

    def extract_answers(self, paths: List[List[str]]) -> List[str]:
        """Extract final answers from reasoning paths."""
        answers = []
        for path in paths:
            if not path: continue
            
            # Simple heuristic: Look for "Answer:" or take last line
            last_line = path[-1]
            if "Answer:" in last_line:
                answers.append(last_line.split("Answer:")[-1].strip())
            else:
                answers.append(last_line)
        return answers

    def majority_vote(self, answers: List[str]) -> Tuple[str, float]:
        """Select answer by majority vote."""
        if not answers:
            return "No consensus", 0.0
            
        from collections import Counter
        # Normalize answers roughly
        norm_answers = [a.lower().strip().strip('.') for a in answers]
        
        counts = Counter(norm_answers)
        most_common, count = counts.most_common(1)[0]
        
        confidence = count / len(answers)
        return most_common, confidence


class TreeOfThoughts:
    """Tree of Thoughts for exploration-based reasoning."""
    def __init__(self, branching_factor: int = 3, max_depth: int = 3):
        self.branching_factor = branching_factor
        self.max_depth = max_depth

    def generate_thought(self, parent: Optional[ThoughtStep], problem: str, depth: int) -> ThoughtStep:
        """Generate a thought step using LLM."""
        step_num = 0 if parent is None else parent.step_number + 1
        
        context = f"Previous thought: {parent.content}" if parent else "Start of reasoning."
        prompt = f"""
        Problem: {problem}
        Context: {context}
        Current Depth: {depth}
        
        Generate a single, concise next step in reasoning (Thought). 
        Do not solve the whole problem yet, just the next logical step.
        """
        
        try:
            content = AIClient.generate_text(prompt).strip()
            # Simple confidence estimation (mock or self-eval)
            confidence = 0.8 # Placeholder for self-eval call
            
            return ThoughtStep(
                step_number=step_num,
                content=content,
                confidence=confidence,
                children=[]
            )
        except Exception:
            return ThoughtStep(0, "Error thinking", 0.0)

    def evaluate_thought(self, thought: ThoughtStep) -> float:
        """Evaluate promisingness of a thought."""
        # Ideally call LLM to rate the thought
        return thought.confidence

    def expand(self, thought: ThoughtStep, problem: str, depth: int) -> List[ThoughtStep]:
        """Expand thought into children."""
        if depth >= self.max_depth: return []
        
        children = []
        for _ in range(self.branching_factor):
            child = self.generate_thought(thought, problem, depth + 1)
            children.append(child)
        
        thought.children = children
        return children

    def bfs_search(self, problem: str) -> List[ThoughtStep]:
        """Breadth-first search through thought tree."""
        root = self.generate_thought(None, problem, 0)
        frontier = [(root, 0)]
        best_path = [root]
        
        while frontier:
            # Sort by evaluation score
            frontier.sort(key=lambda x: -self.evaluate_thought(x[0]))
            
            # Take best
            current, depth = frontier.pop(0)
            
            if depth >= self.max_depth:
                continue
            
            # Expand
            children = self.expand(current, problem, depth)
            
            for child in children:
                frontier.append((child, depth + 1))
                
                if child.confidence > best_path[-1].confidence:
                    best_path.append(child)
        
        return best_path

    def get_reasoning_trace(self, path: List[ThoughtStep]) -> str:
        """Format reasoning path as trace."""
        lines = []
        for thought in path:
            lines.append(f"Step {thought.step_number} (confidence: {thought.confidence:.2f}):")
            lines.append(f"  {thought.content}")
        return "\n".join(lines)


class ChainOfThoughtReasoner:
    """Complete CoT reasoning system."""
    def __init__(self, reasoning_type: ReasoningType = ReasoningType.COT):
        self.reasoning_type = reasoning_type
        self.decomposer = StepByStepDecomposer()
        self.self_consistency = SelfConsistency()
        self.tree_of_thoughts = TreeOfThoughts()

    def reason(self, problem: str) -> Dict[str, Any]:
        """Apply reasoning to problem."""
        result = {
            'problem': problem,
            'method': self.reasoning_type.value,
            'steps': [],
            'answer': '',
            'confidence': 0.0
        }
        
        if self.reasoning_type == ReasoningType.DIRECT:
            result['answer'] = f"Direct answer to: {problem}"
            result['confidence'] = 0.5
        
        elif self.reasoning_type == ReasoningType.COT:
            result['steps'] = self.decomposer.decompose(problem)
            result['answer'] = result['steps'][-1] if result['steps'] else ""
            result['confidence'] = 0.7
        
        elif self.reasoning_type == ReasoningType.SELF_CONSISTENCY:
            paths = self.self_consistency.generate_paths(problem)
            answers = self.self_consistency.extract_answers(paths)
            answer, confidence = self.self_consistency.majority_vote(answers)
            result['steps'] = [str(p) for p in paths]
            result['answer'] = answer
            result['confidence'] = confidence
        
        elif self.reasoning_type == ReasoningType.TREE_OF_THOUGHTS:
            path = self.tree_of_thoughts.bfs_search(problem)
            result['steps'] = [t.content for t in path]
            result['answer'] = path[-1].content if path else ""
            result['confidence'] = max(t.confidence for t in path) if path else 0.0
        
        return result
