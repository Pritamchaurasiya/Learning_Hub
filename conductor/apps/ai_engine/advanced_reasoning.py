"""
Advanced Reasoning Module (Phase 28).
Multi-hop reasoning, neuro-symbolic AI, and logical inference.
"""
import logging
import re
from typing import List, Dict, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)


class LogicalOperator(Enum):
    """Logical operators for symbolic reasoning."""
    AND = "AND"
    OR = "OR"
    NOT = "NOT"
    IMPLIES = "IMPLIES"
    IFF = "IFF"


@dataclass
class Fact:
    """A fact in the knowledge base."""
    predicate: str
    arguments: Tuple[str, ...]
    confidence: float = 1.0
    source: str = "assertion"
    
    def __hash__(self):
        return hash((self.predicate, self.arguments))
    
    def __eq__(self, other):
        if not isinstance(other, Fact):
            return False
        return self.predicate == other.predicate and self.arguments == other.arguments
    
    def __str__(self):
        args = ", ".join(self.arguments)
        return f"{self.predicate}({args})"


@dataclass
class Rule:
    """An inference rule."""
    name: str
    premises: List[str]  # Pattern strings like "parent(X, Y)"
    conclusion: str  # Pattern string like "ancestor(X, Y)"
    confidence: float = 1.0
    
    def __str__(self):
        premises_str = " AND ".join(self.premises)
        return f"{self.name}: {premises_str} => {self.conclusion}"


class SymbolicReasoner:
    """Forward-chaining symbolic reasoner."""
    
    def __init__(self):
        self.facts: Set[Fact] = set()
        self.rules: List[Rule] = []
        self.inference_trace: List[Dict[str, Any]] = []
    
    def add_fact(self, predicate: str, *args: str, confidence: float = 1.0):
        """Add a fact to the knowledge base."""
        fact = Fact(predicate, args, confidence)
        self.facts.add(fact)
        return fact
    
    def add_rule(self, name: str, premises: List[str], conclusion: str, confidence: float = 1.0):
        """Add an inference rule."""
        rule = Rule(name, premises, conclusion, confidence)
        self.rules.append(rule)
        return rule
    
    def _parse_pattern(self, pattern: str) -> Tuple[str, List[str]]:
        """Parse a pattern like 'predicate(X, Y)' into predicate and args."""
        match = re.match(r'(\w+)\(([^)]*)\)', pattern)
        if match:
            predicate = match.group(1)
            args = [a.strip() for a in match.group(2).split(',') if a.strip()]
            return predicate, args
        return pattern, []
    
    def _match_pattern(self, pattern: str, fact: Fact, bindings: Dict[str, str]) -> Optional[Dict[str, str]]:
        """Try to match a pattern against a fact with given bindings."""
        predicate, pattern_args = self._parse_pattern(pattern)
        
        if predicate != fact.predicate:
            return None
        
        if len(pattern_args) != len(fact.arguments):
            return None
        
        new_bindings = bindings.copy()
        
        for p_arg, f_arg in zip(pattern_args, fact.arguments):
            if p_arg.isupper():  # Variable
                if p_arg in new_bindings:
                    if new_bindings[p_arg] != f_arg:
                        return None
                else:
                    new_bindings[p_arg] = f_arg
            else:  # Constant
                if p_arg != f_arg:
                    return None
        
        return new_bindings
    
    def _instantiate_pattern(self, pattern: str, bindings: Dict[str, str]) -> Tuple[str, Tuple[str, ...]]:
        """Instantiate a pattern with bindings."""
        predicate, args = self._parse_pattern(pattern)
        new_args = tuple(bindings.get(a, a) for a in args)
        return predicate, new_args
    
    def _find_all_bindings(self, premises: List[str], bindings: Dict[str, str]) -> List[Dict[str, str]]:
        """Find all valid bindings for premises."""
        if not premises:
            return [bindings]
        
        results = []
        pattern = premises[0]
        remaining = premises[1:]
        
        for fact in self.facts:
            new_bindings = self._match_pattern(pattern, fact, bindings)
            if new_bindings is not None:
                sub_results = self._find_all_bindings(remaining, new_bindings)
                results.extend(sub_results)
        
        return results
    
    def forward_chain(self, max_iterations: int = 10) -> List[Fact]:
        """Run forward chaining inference."""
        new_facts = []
        
        for iteration in range(max_iterations):
            facts_added = False
            
            for rule in self.rules:
                all_bindings = self._find_all_bindings(rule.premises, {})
                
                for bindings in all_bindings:
                    pred, args = self._instantiate_pattern(rule.conclusion, bindings)
                    new_fact = Fact(
                        pred, args,
                        confidence=rule.confidence,
                        source=f"inferred:{rule.name}"
                    )
                    
                    if new_fact not in self.facts:
                        self.facts.add(new_fact)
                        new_facts.append(new_fact)
                        facts_added = True
                        
                        self.inference_trace.append({
                            "rule": rule.name,
                            "bindings": bindings,
                            "derived": str(new_fact),
                            "iteration": iteration
                        })
            
            if not facts_added:
                break
        
        return new_facts
    
    def query(self, pattern: str) -> List[Dict[str, str]]:
        """Query the knowledge base."""
        results = []
        for fact in self.facts:
            bindings = self._match_pattern(pattern, fact, {})
            if bindings is not None:
                results.append({"fact": str(fact), "bindings": bindings, "confidence": fact.confidence})
        return results


class MultiHopReasoner:
    """Multi-hop reasoning over knowledge graphs."""
    
    def __init__(self):
        self.entities: Dict[str, Dict[str, Any]] = {}
        self.relations: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
    
    def add_entity(self, entity_id: str, properties: Dict[str, Any]):
        """Add an entity with properties."""
        self.entities[entity_id] = properties
    
    def add_relation(self, subject: str, relation: str, obj: str):
        """Add a relation between entities."""
        self.relations[relation].append((subject, obj))
    
    def single_hop(self, entity: str, relation: str) -> List[str]:
        """Single hop: find entities connected by relation."""
        results = []
        for subj, obj in self.relations.get(relation, []):
            if subj == entity:
                results.append(obj)
            elif obj == entity and relation in ["sibling", "colleague", "friend"]:
                results.append(subj)
        return results
    
    def multi_hop(self, start: str, path: List[str]) -> List[str]:
        """Multi-hop reasoning: follow a path of relations."""
        current = [start]
        trace = [{"hop": 0, "entities": current}]
        
        for i, relation in enumerate(path):
            next_entities = []
            for entity in current:
                next_entities.extend(self.single_hop(entity, relation))
            current = list(set(next_entities))
            trace.append({"hop": i + 1, "relation": relation, "entities": current})
        
        return current
    
    def find_path(self, start: str, end: str, max_hops: int = 3) -> Optional[List[str]]:
        """Find a reasoning path between two entities (BFS)."""
        from collections import deque
        
        queue = deque([(start, [])])
        visited = {start}
        
        while queue:
            current, path = queue.popleft()
            
            if current == end:
                return path
            
            if len(path) >= max_hops:
                continue
            
            for relation, pairs in self.relations.items():
                for subj, obj in pairs:
                    if subj == current and obj not in visited:
                        visited.add(obj)
                        queue.append((obj, path + [relation]))
                    elif obj == current and subj not in visited:
                        visited.add(subj)
                        queue.append((subj, path + [f"inverse_{relation}"]))
        
        return None


class NeuroSymbolicHybrid:
    """
    Hybrid neuro-symbolic reasoning system.
    Combines neural embeddings with symbolic rules.
    """
    
    def __init__(self, embedding_dim: int = 64):
        self.embedding_dim = embedding_dim
        self.symbolic = SymbolicReasoner()
        self.multi_hop = MultiHopReasoner()
        self.embeddings: Dict[str, List[float]] = {}
        self.learned_rules: List[Dict[str, Any]] = []
    
    def embed_entity(self, entity: str) -> List[float]:
        """Get or create embedding for entity."""
        if entity not in self.embeddings:
            import random
            self.embeddings[entity] = [random.gauss(0, 0.1) for _ in range(self.embedding_dim)]
        return self.embeddings[entity]
    
    def similarity(self, e1: str, e2: str) -> float:
        """Compute cosine similarity between entities."""
        v1 = self.embed_entity(e1)
        v2 = self.embed_entity(e2)
        
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = sum(a * a for a in v1) ** 0.5
        norm2 = sum(a * a for a in v2) ** 0.5
        
        return dot / (norm1 * norm2 + 1e-8)
    
    def neural_link_prediction(self, subject: str, relation: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """Predict missing links using embeddings."""
        candidates = []
        
        for entity in self.embeddings:
            if entity != subject:
                score = self.similarity(subject, entity)
                # Boost if relation exists in symbolic KB
                if any(subject == s and entity == o for s, o in self.multi_hop.relations.get(relation, [])):
                    score += 0.5
                candidates.append((entity, score))
        
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[:top_k]
    
    def reason(self, query: str, use_neural: bool = True) -> Dict[str, Any]:
        """
        Hybrid reasoning: combine symbolic and neural approaches.
        """
        # Symbolic reasoning first
        symbolic_results = self.symbolic.query(query)
        
        # Neural enhancement
        neural_results = []
        if use_neural:
            pred, args = self.symbolic._parse_pattern(query)
            if args and args[0].isupper():
                # Open query - find candidates
                for entity in list(self.embeddings.keys())[:10]:
                    self.symbolic.add_fact(pred, entity, confidence=0.5)
                
                candidates = self.neural_link_prediction(pred, "related")
                neural_results = [{"entity": e, "confidence": c} for e, c in candidates]
        
        return {
            "query": query,
            "symbolic_results": symbolic_results,
            "neural_candidates": neural_results,
            "combined_count": len(symbolic_results) + len(neural_results)
        }
    
    def learn_rule_from_examples(self, examples: List[Tuple[str, str, str]]) -> Optional[Rule]:
        """Learn a rule from positive examples (simplified)."""
        if len(examples) < 2:
            return None
        
        # Find common patterns (very simplified)
        relations = [e[1] for e in examples]
        if len(set(relations)) == 1:
            rule = Rule(
                name=f"learned_{relations[0]}",
                premises=[f"{relations[0]}(X, Y)"],
                conclusion=f"related(X, Y)",
                confidence=0.8
            )
            self.learned_rules.append({"rule": rule, "examples": len(examples)})
            self.symbolic.add_rule(rule.name, rule.premises, rule.conclusion, rule.confidence)
            return rule
        
        return None


def demo_advanced_reasoning():
    """Demo the advanced reasoning system."""
    print("=== Advanced Reasoning Demo ===")
    
    # Symbolic reasoning
    print("\n1. Symbolic Reasoning:")
    sym = SymbolicReasoner()
    
    # Family relations
    sym.add_fact("parent", "alice", "bob")
    sym.add_fact("parent", "bob", "charlie")
    sym.add_fact("parent", "bob", "diana")
    
    # Rules
    sym.add_rule("grandparent", ["parent(X, Y)", "parent(Y, Z)"], "grandparent(X, Z)")
    sym.add_rule("sibling", ["parent(P, X)", "parent(P, Y)"], "sibling(X, Y)")
    
    new_facts = sym.forward_chain()
    print(f"   Derived {len(new_facts)} new facts:")
    for f in new_facts[:5]:
        print(f"   - {f}")
    
    # Multi-hop reasoning
    print("\n2. Multi-Hop Reasoning:")
    mh = MultiHopReasoner()
    
    mh.add_relation("einstein", "born_in", "germany")
    mh.add_relation("germany", "part_of", "europe")
    mh.add_relation("europe", "continent_of", "earth")
    
    result = mh.multi_hop("einstein", ["born_in", "part_of", "continent_of"])
    print(f"   Einstein -> born_in -> part_of -> continent_of = {result}")
    
    path = mh.find_path("einstein", "earth")
    print(f"   Path from Einstein to Earth: {path}")
    
    # Neuro-symbolic
    print("\n3. Neuro-Symbolic Hybrid:")
    ns = NeuroSymbolicHybrid()
    
    # Add some entities
    for entity in ["alice", "bob", "charlie", "diana", "einstein", "newton"]:
        ns.embed_entity(entity)
        ns.multi_hop.add_entity(entity, {"type": "person"})
    
    ns.symbolic = sym
    
    predictions = ns.neural_link_prediction("alice", "related", top_k=3)
    print(f"   Neural link predictions for alice: {predictions}")
    
    return {
        "symbolic_facts": len(sym.facts),
        "derived_facts": len(new_facts),
        "multi_hop_result": result,
        "neural_predictions": len(predictions)
    }


def run_reasoning_experiment() -> Dict[str, Any]:
    """Run reasoning experiment for verification."""
    return demo_advanced_reasoning()
