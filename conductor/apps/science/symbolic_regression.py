"""
Symbolic Regression Engine (Research Grade)

Discovers mathematical equations from data:
1. Tree-based expression representation.
2. Genetic Programming with REAL crossover & mutation.
3. Pareto front for complexity vs accuracy.
"""

import logging
import random
import math
import copy
from typing import List, Callable, Any, Tuple, Optional
from dataclasses import dataclass, field
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class ExprNode(ABC):
    @abstractmethod
    def evaluate(self, x: float) -> float:
        pass
    
    @abstractmethod
    def __str__(self) -> str:
        pass
    
    @abstractmethod
    def complexity(self) -> int:
        pass
    
    @abstractmethod
    def copy(self) -> 'ExprNode':
        pass
    
    def get_all_nodes(self) -> List['ExprNode']:
        """Returns list of all nodes in subtree (for crossover selection)."""
        return [self]


class ConstNode(ExprNode):
    def __init__(self, value: float):
        self.value = value
    
    def evaluate(self, x: float) -> float:
        return self.value
    
    def __str__(self) -> str:
        return f"{self.value:.3f}"
    
    def complexity(self) -> int:
        return 1
    
    def copy(self) -> 'ExprNode':
        return ConstNode(self.value)


class VarNode(ExprNode):
    def evaluate(self, x: float) -> float:
        return x
    
    def __str__(self) -> str:
        return "x"
    
    def complexity(self) -> int:
        return 1
    
    def copy(self) -> 'ExprNode':
        return VarNode()


class BinaryOpNode(ExprNode):
    def __init__(self, op: str, left: ExprNode, right: ExprNode):
        self.op = op
        self.left = left
        self.right = right
    
    def evaluate(self, x: float) -> float:
        l = self.left.evaluate(x)
        r = self.right.evaluate(x)
        if self.op == '+': return l + r
        if self.op == '-': return l - r
        if self.op == '*': return l * r
        if self.op == '/': return l / r if abs(r) > 1e-10 else 1e10
        if self.op == '**': return l ** min(r, 5) if l > 0 else 0  # Power with safety
        return 0
    
    def __str__(self) -> str:
        return f"({self.left} {self.op} {self.right})"
    
    def complexity(self) -> int:
        return 1 + self.left.complexity() + self.right.complexity()
    
    def copy(self) -> 'ExprNode':
        return BinaryOpNode(self.op, self.left.copy(), self.right.copy())
    
    def get_all_nodes(self) -> List['ExprNode']:
        return [self] + self.left.get_all_nodes() + self.right.get_all_nodes()


class UnaryOpNode(ExprNode):
    def __init__(self, op: str, child: ExprNode):
        self.op = op
        self.child = child
    
    def evaluate(self, x: float) -> float:
        c = self.child.evaluate(x)
        if self.op == 'sin': return math.sin(c)
        if self.op == 'cos': return math.cos(c)
        if self.op == 'exp': return min(math.exp(min(c, 20)), 1e10)
        if self.op == 'log': return math.log(abs(c) + 1e-10)
        if self.op == 'sqrt': return math.sqrt(abs(c))
        if self.op == 'abs': return abs(c)
        return c
    
    def __str__(self) -> str:
        return f"{self.op}({self.child})"
    
    def complexity(self) -> int:
        return 1 + self.child.complexity()
    
    def copy(self) -> 'ExprNode':
        return UnaryOpNode(self.op, self.child.copy())
    
    def get_all_nodes(self) -> List['ExprNode']:
        return [self] + self.child.get_all_nodes()


@dataclass
class Individual:
    tree: ExprNode
    fitness: float = 0.0
    complexity: int = 0


class SymbolicRegressor:
    """
    Genetic Programming for Symbolic Regression.
    Now with REAL crossover and mutation operations.
    """
    
    BINARY_OPS = ['+', '-', '*', '/']
    UNARY_OPS = ['sin', 'cos', 'exp', 'sqrt', 'abs']
    
    def __init__(
        self, 
        pop_size: int = 100, 
        max_depth: int = 5,
        mutation_rate: float = 0.15,
        crossover_rate: float = 0.7,
        tournament_size: int = 5
    ):
        self.pop_size = pop_size
        self.max_depth = max_depth
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.tournament_size = tournament_size
        self.population: List[Individual] = []

    def _random_tree(self, depth: int = 0) -> ExprNode:
        """Generate random expression tree."""
        if depth >= self.max_depth or (depth > 1 and random.random() < 0.3):
            # Terminal node
            if random.random() < 0.6:
                return VarNode()
            else:
                return ConstNode(random.uniform(-5, 5))
        
        # Non-terminal
        if random.random() < 0.7:
            op = random.choice(self.BINARY_OPS)
            return BinaryOpNode(op, self._random_tree(depth+1), self._random_tree(depth+1))
        else:
            op = random.choice(self.UNARY_OPS)
            return UnaryOpNode(op, self._random_tree(depth+1))

    def _fitness(self, tree: ExprNode, X: List[float], y: List[float]) -> float:
        """Mean Squared Error (lower is better, returned as negative for maximization)."""
        mse = 0.0
        for xi, yi in zip(X, y):
            try:
                pred = tree.evaluate(xi)
                if math.isnan(pred) or math.isinf(pred):
                    return -1e15
                mse += (pred - yi) ** 2
            except Exception:
                return -1e15
        return -mse / len(X)

    def _tournament_select(self) -> Individual:
        """Tournament selection."""
        candidates = random.sample(self.population, min(self.tournament_size, len(self.population)))
        return max(candidates, key=lambda ind: ind.fitness)

    def _crossover(self, parent1: ExprNode, parent2: ExprNode) -> ExprNode:
        """Subtree crossover: swap random subtrees between parents."""
        child = parent1.copy()
        
        # Get all nodes from both
        child_nodes = child.get_all_nodes()
        parent2_nodes = parent2.get_all_nodes()
        
        if len(child_nodes) < 2 or len(parent2_nodes) < 1:
            return child
        
        # Select random subtree from parent2
        donor_subtree = random.choice(parent2_nodes).copy()
        
        # Replace random node in child (skip root for simplicity)
        if len(child_nodes) > 1:
            # Find a non-root node to replace
            for node in child_nodes:
                if isinstance(node, BinaryOpNode):
                    if random.random() < 0.5:
                        node.left = donor_subtree
                    else:
                        node.right = donor_subtree
                    break
                elif isinstance(node, UnaryOpNode):
                    node.child = donor_subtree
                    break
        
        return child

    def _mutate(self, tree: ExprNode) -> ExprNode:
        """Point mutation: randomly modify a node."""
        mutated = tree.copy()
        nodes = mutated.get_all_nodes()
        
        if not nodes:
            return mutated
        
        target = random.choice(nodes)
        
        if isinstance(target, ConstNode):
            # Mutate constant value
            target.value += random.gauss(0, 1.0)
        elif isinstance(target, BinaryOpNode):
            # Change operator
            target.op = random.choice(self.BINARY_OPS)
        elif isinstance(target, UnaryOpNode):
            target.op = random.choice(self.UNARY_OPS)
        
        return mutated

    def _calculate_pareto_front(self, X: List[float], y: List[float]) -> List[Individual]:
        """Find non-dominated solutions (accuracy vs complexity trade-off)."""
        pareto = []
        for ind in self.population:
            dominated = False
            for other in self.population:
                # other dominates ind if better in both objectives
                if other.fitness > ind.fitness and other.complexity < ind.complexity:
                    dominated = True
                    break
            if not dominated:
                pareto.append(ind)
        return pareto

    def fit(self, X: List[float], y: List[float], generations: int = 100) -> Tuple[ExprNode, List[Individual]]:
        """
        Evolve population to find best fitting expression.
        Returns: (best_tree, pareto_front)
        """
        # Initialize population
        self.population = []
        for _ in range(self.pop_size):
            tree = self._random_tree()
            ind = Individual(tree=tree, complexity=tree.complexity())
            ind.fitness = self._fitness(tree, X, y)
            self.population.append(ind)
        
        best_ever = max(self.population, key=lambda x: x.fitness)
        
        for gen in range(generations):
            # Evaluate fitness
            for ind in self.population:
                ind.fitness = self._fitness(ind.tree, X, y)
                ind.complexity = ind.tree.complexity()
            
            # Track best
            current_best = max(self.population, key=lambda x: x.fitness)
            if current_best.fitness > best_ever.fitness:
                best_ever = Individual(
                    tree=current_best.tree.copy(),
                    fitness=current_best.fitness,
                    complexity=current_best.complexity
                )
            
            # Create next generation
            new_pop = []
            
            # Elitism: keep best
            new_pop.append(Individual(
                tree=best_ever.tree.copy(),
                fitness=best_ever.fitness,
                complexity=best_ever.complexity
            ))
            
            while len(new_pop) < self.pop_size:
                parent1 = self._tournament_select()
                parent2 = self._tournament_select()
                
                # Crossover
                if random.random() < self.crossover_rate:
                    child_tree = self._crossover(parent1.tree, parent2.tree)
                else:
                    child_tree = parent1.tree.copy()
                
                # Mutation
                if random.random() < self.mutation_rate:
                    child_tree = self._mutate(child_tree)
                
                new_pop.append(Individual(tree=child_tree))
            
            self.population = new_pop
            
            if gen % 20 == 0:
                logger.info(f"Gen {gen}: Best fitness = {best_ever.fitness:.6f}, Expr = {best_ever.tree}")
        
        # Final evaluation
        for ind in self.population:
            ind.fitness = self._fitness(ind.tree, X, y)
            ind.complexity = ind.tree.complexity()
        
        pareto_front = self._calculate_pareto_front(X, y)
        
        return best_ever.tree, pareto_front


def demo_symbolic_regression():
    """Demo: Discover y = x^2 + 2x + 1 from data."""
    import numpy as np
    
    # Generate training data
    X = np.linspace(-5, 5, 100).tolist()
    y = [xi**2 + 2*xi + 1 for xi in X]
    
    # Run symbolic regression
    regressor = SymbolicRegressor(pop_size=200, max_depth=4, crossover_rate=0.8)
    best_tree, pareto = regressor.fit(X, y, generations=50)
    
    print(f"\nDiscovered Equation: {best_tree}")
    print(f"Complexity: {best_tree.complexity()}")
    print(f"Pareto Front Size: {len(pareto)}")
    
    # Test
    test_x = 3.0
    expected = test_x**2 + 2*test_x + 1
    predicted = best_tree.evaluate(test_x)
    print(f"Test: x={test_x}, Expected={expected}, Predicted={predicted:.4f}")


if __name__ == "__main__":
    demo_symbolic_regression()
