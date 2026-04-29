"""
Evolutionary Algorithm Engine

Optimizes complex problems using Darwinian principles:
1. Genetic Algorithms (GA).
2. Evolution Strategies.
3. Multi-Objective Optimization (NSGA-II).
"""

import logging
import random
from typing import List, Callable, Tuple, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Individual:
    chromosome: List[float]
    fitness: float = 0.0
    objectives: List[float] = None  # For Multi-Objective
    rank: int = 0
    crowding_distance: float = 0.0

    def __post_init__(self):
        if self.objectives is None:
            self.objectives = []

class GeneticAlgorithm:
    """
    Standard Genetic Algorithm implementation.
    """
    
    def __init__(
        self, 
        pop_size: int = 50, 
        gene_length: int = 10,
        mutation_rate: float = 0.1,
        crossover_rate: float = 0.8
    ):
        self.pop_size = pop_size
        self.gene_length = gene_length
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.population: List[Individual] = []

    def initialize_population(self):
        """Random initial population."""
        self.population = [
            Individual(chromosome=[random.random() for _ in range(self.gene_length)])
            for _ in range(self.pop_size)
        ]

    def evaluate_fitness(self, fitness_fn: Callable[[List[float]], float]):
        """Apply fitness function to all individuals."""
        for ind in self.population:
            ind.fitness = fitness_fn(ind.chromosome)

    def select_parents(self) -> Tuple[Individual, Individual]:
        """Tournament selection."""
        def tournament(k: int = 3) -> Individual:
            candidates = random.sample(self.population, k)
            return max(candidates, key=lambda x: x.fitness)
        return tournament(), tournament()

    def crossover(self, p1: Individual, p2: Individual) -> Individual:
        """Single-point crossover."""
        if random.random() > self.crossover_rate:
            return Individual(chromosome=p1.chromosome.copy())
        if self.gene_length <= 2:
            return Individual(chromosome=p1.chromosome.copy())
        point = random.randint(1, self.gene_length - 1)
        child_genes = p1.chromosome[:point] + p2.chromosome[point:]
        return Individual(chromosome=child_genes)

    def mutate(self, ind: Individual):
        """Gaussian mutation."""
        for i in range(len(ind.chromosome)):
            if random.random() < self.mutation_rate:
                ind.chromosome[i] += random.gauss(0, 0.1)
                ind.chromosome[i] = max(0, min(1, ind.chromosome[i])) # Clamp

    def evolve_generation(self, fitness_fn: Callable):
        """Run one generation."""
        self.evaluate_fitness(fitness_fn)
        new_pop = []
        
        # Elitism: Keep best
        best = max(self.population, key=lambda x: x.fitness)
        new_pop.append(Individual(chromosome=best.chromosome.copy(), fitness=best.fitness))
        
        while len(new_pop) < self.pop_size:
            p1, p2 = self.select_parents()
            child = self.crossover(p1, p2)
            self.mutate(child)
            new_pop.append(child)
            
        self.population = new_pop

    def run(self, fitness_fn: Callable, generations: int = 100) -> Individual:
        """Full optimization loop."""
        self.initialize_population()
        for gen in range(generations):
            self.evolve_generation(fitness_fn)
            best = max(self.population, key=lambda x: x.fitness)
            if gen % 20 == 0:
                logger.info(f"Gen {gen}: Best Fitness = {best.fitness:.4f}")
        return max(self.population, key=lambda x: x.fitness)


class MultiObjectiveGA(GeneticAlgorithm):
    """
    NSGA-II Inspired Multi-Objective Optimization.
    Optimizes for multiple conflicting objectives (e.g. Revenue vs User Retention).
    """
    
    def evaluate_objectives(self, objective_fns: List[Callable[[List[float]], float]]):
        """Evaluate multiple objectives."""
        for ind in self.population:
            ind.objectives = [fn(ind.chromosome) for fn in objective_fns]

    def fast_non_dominated_sort(self, population: List[Individual]) -> List[List[Individual]]:
        """Sorts population into Pareto fronts."""
        fronts = [[]]
        for p in population:
            p.domination_count = 0
            p.dominated_solutions = []
            for q in population:
                if self._dominates(p, q):
                    p.dominated_solutions.append(q)
                elif self._dominates(q, p):
                    p.domination_count += 1
            if p.domination_count == 0:
                p.rank = 0
                fronts[0].append(p)
        
        i = 0
        while len(fronts[i]) > 0:
            next_front = []
            for p in fronts[i]:
                for q in p.dominated_solutions:
                    q.domination_count -= 1
                    if q.domination_count == 0:
                        q.rank = i + 1
                        next_front.append(q)
            i += 1
            fronts.append(next_front)
            
        return fronts[:-1]

    def _dominates(self, p: Individual, q: Individual) -> bool:
        """Returns True if p dominates q."""
        # p dominates q if p is no worse in all objectives and better in at least one
        better_in_one = False
        for obj_p, obj_q in zip(p.objectives, q.objectives):
            if obj_p < obj_q: # Assuming maximization, wait. Usually fitness is max. 
                # If maximizing, p > q is good.
                # Let's assume standard maximization for all objectives.
                return False 
            if obj_p > obj_q:
                better_in_one = True
        return better_in_one

    def run_multi_objective(self, objective_fns: List[Callable], generations: int = 50) -> List[Individual]:
        """Runs Multi-Objective Optimization."""
        self.initialize_population()
        for gen in range(generations):
            self.evaluate_objectives(objective_fns)
            fronts = self.fast_non_dominated_sort(self.population)
            
            # Simple reproduction for demo (skip full NSGA-II crowding distance implementation for brevity)
            # Just keep the best fronts
            new_pop = []
            for front in fronts:
                if len(new_pop) + len(front) <= self.pop_size:
                    new_pop.extend(front)
                else:
                    # Fill remaining with random sample from this front
                    needed = self.pop_size - len(new_pop)
                    new_pop.extend(random.sample(front, needed))
                    break
            
            # Crossover/Mutation on new parents
            while len(new_pop) < self.pop_size: # Should be full, but just in case
                new_pop.append(self.population[0]) # Fallback
            
            self.population = new_pop
            # Create next gen offspring
            offspring = []
            while len(offspring) < self.pop_size:
                 # Simplified selection logic
                 p1, p2 = random.sample(self.population, 2)
                 child = self.crossover(p1, p2)
                 self.mutate(child)
                 offspring.append(child)
                 
            self.population = offspring # Elitism logic is simplified here
            
        self.evaluate_objectives(objective_fns)
        return self.population # Returns final population (Pareto approximation)
