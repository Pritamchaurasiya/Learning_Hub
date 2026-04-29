"""
Genetic Algorithm (GA) Engine - Neuroevolution (Phase 115).
Evolutionary structural optimization via Mutation, Crossover, and Survival of the Fittest.
"""
import random
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class Genome:
    """Represents a candidate solution (e.g., neural network weights)."""
    def __init__(self, size: int):
        # We start with random genes bounded in [-1, 1]
        self.genes = [random.uniform(-1, 1) for _ in range(size)]
        self.fitness = -float('inf')

    def mutate(self, mutation_rate: float, mutation_strength: float):
        """Randomly alters genes to introduce new genetic diversity."""
        for i in range(len(self.genes)):
            if random.random() < mutation_rate:
                # Add Gaussian noise
                self.genes[i] += random.gauss(0, mutation_strength)


class GeneticAlgorithmEngine:
    """
    Simulates Neuroevolution (evolving a population of Genomes).
    1. Evaluate fitness of population
    2. Select the fittest parents
    3. Crossover (Breed) parents to create offspring
    4. Mutate offspring
    5. Replace population
    """
    def __init__(self, pop_size: int = 50, genome_size: int = 20):
        self.pop_size = pop_size
        self.genome_size = genome_size
        self.population = [Genome(genome_size) for _ in range(pop_size)]
        
        # Hyperparameters
        self.mutation_rate = 0.1
        self.mutation_strength = 0.5
        self.elite_count = max(1, int(pop_size * 0.1)) # Keep top 10%

    def _evaluate_fitness(self, genome: Genome) -> float:
        """
        Simulated Environment Evaluation.
        Target goal: All genes should perfectly equal 5.0 (An arbitrary complex target).
        Fitness = -Error
        """
        target = 5.0
        error = sum((g - target)**2 for g in genome.genes)
        return -error

    def _crossover(self, parent1: Genome, parent2: Genome) -> Genome:
        """Simulates biological crossover (recombination of chromosomes)."""
        offspring = Genome(self.genome_size)
        
        # Uniform crossover: 50/50 chance of taking gene from either parent
        for i in range(self.genome_size):
            if random.random() < 0.5:
                offspring.genes[i] = parent1.genes[i]
            else:
                offspring.genes[i] = parent2.genes[i]
                
        return offspring

    def simulate_evolution(self, generations: int = 100) -> Dict[str, Any]:
        """
        Evolves the population over multiple generations to find an optimal solution.
        """
        best_fitness_history = []
        avg_fitness_history = []
        
        # Initial Evaluation
        for genome in self.population:
            genome.fitness = self._evaluate_fitness(genome)
            
        initial_best = max(g.fitness for g in self.population)

        for generation in range(generations):
            # 1. Sort by fitness (descending, because higher fitness is better)
            self.population.sort(key=lambda x: x.fitness, reverse=True)
            
            best_fitness = self.population[0].fitness
            avg_fitness = sum(g.fitness for g in self.population) / self.pop_size
            
            best_fitness_history.append(best_fitness)
            avg_fitness_history.append(avg_fitness)
            
            new_population = []
            
            # 2. Elitism: Directly carry over the absolute best performers
            for i in range(self.elite_count):
                elite_clone = Genome(self.genome_size)
                elite_clone.genes = list(self.population[i].genes)
                elite_clone.fitness = self.population[i].fitness
                new_population.append(elite_clone)
                
            # 3. Selection, Crossover, and Mutation for the rest
            while len(new_population) < self.pop_size:
                # Tournament Selection: Pick best of 3 random genomes
                tournament_size = 3
                candidates_p1 = random.choices(self.population, k=tournament_size)
                parent1 = max(candidates_p1, key=lambda x: x.fitness)
                
                candidates_p2 = random.choices(self.population, k=tournament_size)
                parent2 = max(candidates_p2, key=lambda x: x.fitness)
                
                # Breed
                offspring = self._crossover(parent1, parent2)
                
                # Mutate
                offspring.mutate(self.mutation_rate, self.mutation_strength)
                
                new_population.append(offspring)
                
            self.population = new_population
            
            # 4. Evaluate new population's fitness
            for genome in self.population:
                 genome.fitness = self._evaluate_fitness(genome)
                 
        # Final sort
        self.population.sort(key=lambda x: x.fitness, reverse=True)
        final_best = self.population[0].fitness
        
        return {
            "generations": generations,
            "population_size": self.pop_size,
            "genome_size": self.genome_size,
            "initial_best_fitness": round(initial_best, 4),
            "final_best_fitness": round(final_best, 4),
            "phenotypic_divergence": round(final_best - initial_best, 4),
            "mechanics": "Stochastic Natural Selection via Tournament Selection, Uniform Recombination, and Gaussian Mutation."
        }
