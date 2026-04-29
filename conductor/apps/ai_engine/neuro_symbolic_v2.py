"""
Neuro-Symbolic Reasoning v2

Advanced hybrid reasoning:
1. First-order logic with neural embeddings.
2. Program synthesis from examples.
3. Theorem proving with neural guidance.
"""

import logging
import random
import math
from typing import List, Dict, Tuple, Optional, Set, Callable
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class LogicalOperator(Enum):
    AND = "∧"
    OR = "∨"
    NOT = "¬"
    IMPLIES = "→"
    FORALL = "∀"
    EXISTS = "∃"


@dataclass
class Term:
    name: str
    is_variable: bool = False
    arguments: Optional[List['Term']] = None

    def __str__(self):
        if self.arguments:
            args = ", ".join(str(a) for a in self.arguments)
            return f"{self.name}({args})"
        return self.name


@dataclass
class Formula:
    operator: Optional[LogicalOperator]
    left: Optional['Formula']
    right: Optional['Formula']
    predicate: Optional[str] = None
    terms: Optional[List[Term]] = None
    variable: Optional[Term] = None

    def is_atomic(self) -> bool:
        return self.predicate is not None


class FirstOrderLogic:
    """First-order logic operations with neural embeddings."""
    def __init__(self, embedding_dim: int = 32):
        self.embedding_dim = embedding_dim
        self.constant_embeddings: Dict[str, List[float]] = {}
        self.predicate_embeddings: Dict[str, List[float]] = {}

    def get_embedding(self, name: str, is_predicate: bool = False) -> List[float]:
        store = self.predicate_embeddings if is_predicate else self.constant_embeddings
        if name not in store:
            store[name] = [random.gauss(0, 0.1) for _ in range(self.embedding_dim)]
        return store[name]

    def evaluate_atomic(self, formula: Formula, assignment: Dict[str, Term]) -> Tuple[bool, float]:
        """Evaluate atomic formula with confidence score."""
        if not formula.predicate or not formula.terms:
            return False, 0.0
        
        pred_emb = self.get_embedding(formula.predicate, is_predicate=True)
        
        term_embs = []
        for term in formula.terms:
            name = assignment.get(term.name, term).name if term.is_variable else term.name
            term_embs.append(self.get_embedding(name))
        
        # Neural evaluation: combine embeddings
        combined = [0.0] * self.embedding_dim
        for emb in term_embs:
            for i in range(self.embedding_dim):
                combined[i] += emb[i]
        
        # Score with predicate
        score = sum(combined[i] * pred_emb[i] for i in range(self.embedding_dim))
        confidence = 1 / (1 + math.exp(-score))  # Sigmoid
        
        return confidence > 0.5, confidence


class ProgramSynthesis:
    """Synthesize programs from input-output examples."""
    
    @dataclass
    class ProgramSpec:
        inputs: List[List[float]]
        outputs: List[float]
    
    @dataclass
    class Program:
        code: str
        score: float
    
    def __init__(self, max_depth: int = 3):
        self.max_depth = max_depth
        self.primitives = [
            ("add", lambda x, y: x + y),
            ("sub", lambda x, y: x - y),
            ("mul", lambda x, y: x * y),
            ("neg", lambda x: -x),
            ("abs", lambda x: abs(x)),
        ]

    def generate_candidate(self, arity: int, depth: int = 0) -> Tuple[str, Callable]:
        """Generate random program candidate."""
        if depth >= self.max_depth or random.random() < 0.3:
            var_idx = random.randint(0, arity - 1)
            return f"x[{var_idx}]", lambda x, i=var_idx: x[i]
        
        prim_name, prim_fn = random.choice(self.primitives)
        
        if prim_name in ["neg", "abs"]:
            child_code, child_fn = self.generate_candidate(arity, depth + 1)
            code = f"{prim_name}({child_code})"
            fn = lambda x, p=prim_fn, c=child_fn: p(c(x))
        else:
            left_code, left_fn = self.generate_candidate(arity, depth + 1)
            right_code, right_fn = self.generate_candidate(arity, depth + 1)
            code = f"{prim_name}({left_code}, {right_code})"
            fn = lambda x, p=prim_fn, l=left_fn, r=right_fn: p(l(x), r(x))
        
        return code, fn

    def synthesize(self, spec: 'ProgramSpec', max_attempts: int = 1000) -> Optional['Program']:
        """Synthesize program matching specification."""
        arity = len(spec.inputs[0]) if spec.inputs else 0
        
        best_program = None
        best_score = float('inf')
        
        for _ in range(max_attempts):
            code, fn = self.generate_candidate(arity)
            
            try:
                errors = []
                for inp, expected in zip(spec.inputs, spec.outputs):
                    result = fn(inp)
                    errors.append((result - expected) ** 2)
                
                score = sum(errors) / len(errors)
                
                if score < best_score:
                    best_score = score
                    best_program = self.Program(code=code, score=score)
                
                if score < 1e-6:  # Exact match
                    return best_program
            except (ZeroDivisionError, TypeError, IndexError):
                continue
        
        return best_program


class NeuralTheoremProver:
    """Theorem prover with neural guidance."""
    def __init__(self, embedding_dim: int = 32):
        self.fol = FirstOrderLogic(embedding_dim)
        self.known_facts: List[Formula] = []
        
        # Neural policy for proof search
        self.policy = [[random.gauss(0, 0.1) for _ in range(embedding_dim)] for _ in range(4)]

    def add_fact(self, formula: Formula):
        self.known_facts.append(formula)

    def get_formula_embedding(self, formula: Formula) -> List[float]:
        """Get neural embedding of formula."""
        if formula.is_atomic():
            return self.fol.get_embedding(formula.predicate or "", is_predicate=True)
        
        left_emb = self.get_formula_embedding(formula.left) if formula.left else [0.0] * self.fol.embedding_dim
        right_emb = self.get_formula_embedding(formula.right) if formula.right else [0.0] * self.fol.embedding_dim
        
        combined = [(l + r) / 2 for l, r in zip(left_emb, right_emb)]
        return combined

    def select_action(self, goal: Formula, premise: Formula) -> int:
        """Neural policy selects proof action."""
        goal_emb = self.get_formula_embedding(goal)
        premise_emb = self.get_formula_embedding(premise)
        
        combined = [g + p for g, p in zip(goal_emb, premise_emb)]
        
        scores = []
        for action in range(4):
            score = sum(self.policy[action][i] * combined[i] for i in range(len(combined)))
            scores.append(score)
        
        # Softmax
        max_s = max(scores)
        exp_scores = [math.exp(s - max_s) for s in scores]
        total = sum(exp_scores)
        probs = [e / total for e in exp_scores]
        
        return probs.index(max(probs))

    def prove(self, goal: Formula, max_steps: int = 100) -> Tuple[bool, List[str]]:
        """Attempt to prove goal."""
        proof_trace = []
        
        for step in range(max_steps):
            # Check if goal matches known fact
            for fact in self.known_facts:
                if self._formulas_match(goal, fact):
                    proof_trace.append(f"Step {step}: Goal matches known fact")
                    return True, proof_trace
            
            if not self.known_facts:
                break
            
            # Neural-guided search
            premise = random.choice(self.known_facts)
            action = self.select_action(goal, premise)
            
            proof_trace.append(f"Step {step}: Action {action} on premise {premise.predicate}")
        
        return False, proof_trace

    def _formulas_match(self, f1: Formula, f2: Formula) -> bool:
        """Check if formulas match (simplified)."""
        if f1.is_atomic() and f2.is_atomic():
            return f1.predicate == f2.predicate
        return False
