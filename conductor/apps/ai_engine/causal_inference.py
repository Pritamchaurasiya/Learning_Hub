"""
Causal Inference Module (Phase 31).
Causal discovery, intervention analysis, and counterfactual reasoning.
"""
import logging
import random
import math
from typing import List, Dict, Any, Optional, Set, Tuple, Callable
from dataclasses import dataclass, field
from collections import defaultdict
from itertools import combinations

logger = logging.getLogger(__name__)


@dataclass
class Variable:
    """A causal variable."""
    name: str
    values: List[Any] = field(default_factory=lambda: [0, 1])
    observed: bool = True


@dataclass
class CausalEdge:
    """A directed causal edge."""
    cause: str
    effect: str
    strength: float = 1.0  # Causal strength
    mechanism: Optional[str] = None


class CausalGraph:
    """Directed Acyclic Graph for causal relationships."""
    
    def __init__(self):
        self.variables: Dict[str, Variable] = {}
        self.edges: List[CausalEdge] = []
        self.adjacency: Dict[str, Set[str]] = defaultdict(set)  # parent -> children
        self.parents: Dict[str, Set[str]] = defaultdict(set)  # child -> parents
    
    def add_variable(self, name: str, values: List[Any] = None, observed: bool = True):
        """Add a variable to the graph."""
        self.variables[name] = Variable(name, values or [0, 1], observed)
    
    def add_edge(self, cause: str, effect: str, strength: float = 1.0):
        """Add a causal edge."""
        if cause not in self.variables:
            self.add_variable(cause)
        if effect not in self.variables:
            self.add_variable(effect)
        
        edge = CausalEdge(cause, effect, strength)
        self.edges.append(edge)
        self.adjacency[cause].add(effect)
        self.parents[effect].add(cause)
    
    def get_ancestors(self, var: str) -> Set[str]:
        """Get all ancestors of a variable."""
        ancestors = set()
        queue = list(self.parents[var])
        
        while queue:
            parent = queue.pop(0)
            if parent not in ancestors:
                ancestors.add(parent)
                queue.extend(self.parents[parent])
        
        return ancestors
    
    def get_descendants(self, var: str) -> Set[str]:
        """Get all descendants of a variable."""
        descendants = set()
        queue = list(self.adjacency[var])
        
        while queue:
            child = queue.pop(0)
            if child not in descendants:
                descendants.add(child)
                queue.extend(self.adjacency[child])
        
        return descendants
    
    def is_d_separated(self, x: str, y: str, z: Set[str]) -> bool:
        """Check if X and Y are d-separated given Z (simplified)."""
        # Simplified: if Z blocks all paths, they're d-separated
        paths = self._find_paths(x, y)
        
        for path in paths:
            blocked = any(node in z for node in path[1:-1])
            if not blocked:
                return False
        
        return True
    
    def _find_paths(self, start: str, end: str, visited: Set[str] = None) -> List[List[str]]:
        """Find all paths between two variables."""
        if visited is None:
            visited = set()
        
        if start == end:
            return [[start]]
        
        visited.add(start)
        paths = []
        
        # Check children and parents
        neighbors = self.adjacency[start] | self.parents[start]
        
        for neighbor in neighbors:
            if neighbor not in visited:
                sub_paths = self._find_paths(neighbor, end, visited.copy())
                for path in sub_paths:
                    paths.append([start] + path)
        
        return paths


class CausalDiscovery:
    """Algorithms for discovering causal structure from data."""
    
    def __init__(self, alpha: float = 0.05):
        self.alpha = alpha
    
    def _conditional_independence_test(
        self, 
        data: List[Dict[str, Any]], 
        x: str, 
        y: str, 
        z: Set[str]
    ) -> Tuple[bool, float]:
        """Test conditional independence of X and Y given Z."""
        # Simplified: use correlation as proxy
        x_vals = [d.get(x, 0) for d in data]
        y_vals = [d.get(y, 0) for d in data]
        
        if z:
            # Partial correlation (simplified)
            z_vals = [[d.get(zv, 0) for zv in z] for d in data]
            # Residualize (very simplified)
            x_mean = sum(x_vals) / len(x_vals)
            y_mean = sum(y_vals) / len(y_vals)
            x_vals = [x - x_mean for x in x_vals]
            y_vals = [y - y_mean for y in y_vals]
        
        # Calculate correlation
        n = len(x_vals)
        if n < 3:
            return True, 1.0
        
        mean_x = sum(x_vals) / n
        mean_y = sum(y_vals) / n
        
        cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, y_vals)) / n
        std_x = math.sqrt(sum((x - mean_x) ** 2 for x in x_vals) / n + 1e-8)
        std_y = math.sqrt(sum((y - mean_y) ** 2 for y in y_vals) / n + 1e-8)
        
        corr = cov / (std_x * std_y + 1e-8)
        
        # Convert to p-value (simplified)
        t_stat = abs(corr) * math.sqrt(n - 2) / math.sqrt(1 - corr ** 2 + 1e-8)
        p_value = 2 * (1 - min(0.999, 0.5 + 0.5 * math.tanh(t_stat / 2)))
        
        is_independent = p_value > self.alpha
        return is_independent, p_value
    
    def pc_algorithm(self, data: List[Dict[str, Any]], variables: List[str]) -> CausalGraph:
        """PC algorithm for causal discovery."""
        graph = CausalGraph()
        
        # Add variables
        for var in variables:
            graph.add_variable(var)
        
        # Start with complete undirected graph
        edges = set()
        for v1, v2 in combinations(variables, 2):
            edges.add((v1, v2))
            edges.add((v2, v1))
        
        # Remove edges based on conditional independence
        depth = 0
        max_depth = min(3, len(variables) - 2)
        
        while depth <= max_depth:
            edges_to_remove = set()
            
            for v1, v2 in list(edges):
                if (v2, v1) not in edges:
                    continue
                
                # Find neighbors for conditioning
                neighbors = [v for v in variables if v != v1 and v != v2]
                
                for cond_set in combinations(neighbors, min(depth, len(neighbors))):
                    is_ind, _ = self._conditional_independence_test(data, v1, v2, set(cond_set))
                    if is_ind:
                        edges_to_remove.add((v1, v2))
                        edges_to_remove.add((v2, v1))
                        break
            
            edges -= edges_to_remove
            depth += 1
        
        # Orient edges (simplified: use topological hints)
        oriented = set()
        for v1, v2 in edges:
            if (v2, v1) in edges and (v1, v2) not in oriented:
                # Use variable order as heuristic
                if variables.index(v1) < variables.index(v2):
                    graph.add_edge(v1, v2)
                else:
                    graph.add_edge(v2, v1)
                oriented.add((v1, v2))
                oriented.add((v2, v1))
        
        return graph


class InterventionEngine:
    """Engine for causal interventions (do-calculus)."""
    
    def __init__(self, graph: CausalGraph):
        self.graph = graph
        self.structural_equations: Dict[str, Callable] = {}
    
    def set_mechanism(self, variable: str, mechanism: Callable):
        """Set the structural equation for a variable."""
        self.structural_equations[variable] = mechanism
    
    def do(self, intervention: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply do-intervention: do(X = x).
        Removes incoming edges to intervened variables.
        """
        result = data.copy()
        
        # Set intervened values
        for var, value in intervention.items():
            result[var] = value
        
        # Propagate through graph (topological order)
        order = self._topological_sort()
        
        for var in order:
            if var in intervention:
                continue
            
            if var in self.structural_equations:
                parent_values = {p: result.get(p, 0) for p in self.graph.parents[var]}
                result[var] = self.structural_equations[var](parent_values)
        
        return result
    
    def _topological_sort(self) -> List[str]:
        """Topological sort of variables."""
        in_degree = {v: len(self.graph.parents[v]) for v in self.graph.variables}
        queue = [v for v, d in in_degree.items() if d == 0]
        order = []
        
        while queue:
            var = queue.pop(0)
            order.append(var)
            
            for child in self.graph.adjacency[var]:
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    queue.append(child)
        
        return order
    
    def average_treatment_effect(
        self, 
        treatment: str, 
        outcome: str, 
        data: List[Dict[str, Any]]
    ) -> float:
        """Calculate Average Treatment Effect."""
        # E[Y | do(T=1)] - E[Y | do(T=0)]
        y_treated = []
        y_control = []
        
        for obs in data:
            # Intervention do(T=1)
            result_1 = self.do({treatment: 1}, obs)
            y_treated.append(result_1.get(outcome, 0))
            
            # Intervention do(T=0)
            result_0 = self.do({treatment: 0}, obs)
            y_control.append(result_0.get(outcome, 0))
        
        ate = sum(y_treated) / len(y_treated) - sum(y_control) / len(y_control)
        return ate


class CounterfactualReasoner:
    """Counterfactual reasoning: What would have happened if...?"""
    
    def __init__(self, graph: CausalGraph, intervention_engine: InterventionEngine):
        self.graph = graph
        self.engine = intervention_engine
    
    def counterfactual(
        self, 
        factual: Dict[str, Any], 
        intervention: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Answer counterfactual query:
        Given we observed 'factual', what would have happened if 'intervention'?
        """
        # Step 1: Abduction - infer exogenous variables from factual
        exogenous = self._abduct(factual)
        
        # Step 2: Action - apply intervention
        modified = factual.copy()
        modified.update(intervention)
        
        # Step 3: Prediction - compute counterfactual outcomes
        result = self.engine.do(intervention, modified)
        
        return {
            "factual": factual,
            "intervention": intervention,
            "counterfactual": result,
            "changed": {k: v for k, v in result.items() if factual.get(k) != v}
        }
    
    def _abduct(self, observation: Dict[str, Any]) -> Dict[str, float]:
        """Infer exogenous noise terms."""
        # Simplified: assume additive noise
        noise = {}
        for var in self.graph.variables:
            expected = 0
            for parent in self.graph.parents[var]:
                edge = next((e for e in self.graph.edges if e.cause == parent and e.effect == var), None)
                if edge:
                    expected += observation.get(parent, 0) * edge.strength
            
            noise[f"U_{var}"] = observation.get(var, 0) - expected
        
        return noise


def run_causal_experiment() -> Dict[str, Any]:
    """Run causal inference experiment."""
    print("=== Causal Inference Experiment ===")
    
    # Create causal graph: Smoking -> Cancer, Smoking -> Yellow Fingers
    graph = CausalGraph()
    graph.add_variable("smoking", [0, 1])
    graph.add_variable("cancer", [0, 1])
    graph.add_variable("yellow_fingers", [0, 1])
    graph.add_variable("genetics", [0, 1])
    
    graph.add_edge("smoking", "cancer", strength=0.3)
    graph.add_edge("smoking", "yellow_fingers", strength=0.7)
    graph.add_edge("genetics", "cancer", strength=0.2)
    
    print("\n1. Causal Graph Structure:")
    for edge in graph.edges:
        print(f"   {edge.cause} -> {edge.effect} (strength={edge.strength})")
    
    # Setup intervention engine
    engine = InterventionEngine(graph)
    engine.set_mechanism("cancer", lambda p: 0.3 * p.get("smoking", 0) + 0.2 * p.get("genetics", 0))
    engine.set_mechanism("yellow_fingers", lambda p: 0.7 * p.get("smoking", 0))
    
    # Generate synthetic data
    data = []
    for _ in range(100):
        smoking = random.choice([0, 1])
        genetics = random.choice([0, 1])
        cancer = 1 if random.random() < (0.3 * smoking + 0.2 * genetics) else 0
        yellow_fingers = 1 if random.random() < (0.7 * smoking) else 0
        
        data.append({
            "smoking": smoking,
            "genetics": genetics,
            "cancer": cancer,
            "yellow_fingers": yellow_fingers
        })
    
    # Calculate ATE
    ate = engine.average_treatment_effect("smoking", "cancer", data)
    print(f"\n2. Average Treatment Effect of Smoking on Cancer: {ate:.4f}")
    
    # Causal Discovery
    discovery = CausalDiscovery()
    discovered = discovery.pc_algorithm(data, ["smoking", "genetics", "cancer", "yellow_fingers"])
    
    print(f"\n3. Discovered Graph has {len(discovered.edges)} edges")
    
    # Counterfactual reasoning
    reasoner = CounterfactualReasoner(graph, engine)
    
    factual = {"smoking": 1, "genetics": 0, "cancer": 1, "yellow_fingers": 1}
    cf_result = reasoner.counterfactual(factual, {"smoking": 0})
    
    print(f"\n4. Counterfactual: If person hadn't smoked...")
    print(f"   Changed: {cf_result['changed']}")
    
    return {
        "graph_edges": len(graph.edges),
        "discovered_edges": len(discovered.edges),
        "ate_smoking_cancer": ate,
        "counterfactual_tested": True
    }
