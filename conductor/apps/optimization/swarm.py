"""
Swarm Intelligence Engine

Collective optimization algorithms:
1. Particle Swarm Optimization (PSO).
2. Ant Colony Optimization (ACO).
"""

import logging
import random
import math
from typing import List, Callable, Tuple, Dict
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Particle:
    position: List[float]
    velocity: List[float]
    personal_best: List[float]
    personal_best_fitness: float = float('-inf')


class ParticleSwarmOptimizer:
    """
    PSO: Birds flocking to find global optimum.
    """
    
    def __init__(
        self, 
        swarm_size: int = 30, 
        dimensions: int = 10,
        inertia: float = 0.7,
        cognitive: float = 1.5,
        social: float = 1.5
    ):
        self.swarm_size = swarm_size
        self.dimensions = dimensions
        self.inertia = inertia
        self.cognitive = cognitive
        self.social = social
        self.particles: List[Particle] = []
        self.global_best: List[float] = []
        self.global_best_fitness = float('-inf')

    def initialize_swarm(self):
        self.particles = []
        for _ in range(self.swarm_size):
            pos = [random.uniform(-5, 5) for _ in range(self.dimensions)]
            vel = [random.uniform(-1, 1) for _ in range(self.dimensions)]
            p = Particle(position=pos, velocity=vel, personal_best=pos.copy())
            self.particles.append(p)
        self.global_best = self.particles[0].position.copy()

    def update_velocities(self):
        for p in self.particles:
            for i in range(self.dimensions):
                r1, r2 = random.random(), random.random()
                cognitive_component = self.cognitive * r1 * (p.personal_best[i] - p.position[i])
                social_component = self.social * r2 * (self.global_best[i] - p.position[i])
                p.velocity[i] = self.inertia * p.velocity[i] + cognitive_component + social_component

    def update_positions(self):
        for p in self.particles:
            for i in range(self.dimensions):
                p.position[i] += p.velocity[i]
                p.position[i] = max(-10, min(10, p.position[i])) # Bounds

    def evaluate(self, fitness_fn: Callable):
        for p in self.particles:
            fit = fitness_fn(p.position)
            if fit > p.personal_best_fitness:
                p.personal_best = p.position.copy()
                p.personal_best_fitness = fit
            if fit > self.global_best_fitness:
                self.global_best = p.position.copy()
                self.global_best_fitness = fit

    def optimize(self, fitness_fn: Callable, iterations: int = 100) -> Tuple[List[float], float]:
        self.initialize_swarm()
        for it in range(iterations):
            self.evaluate(fitness_fn)
            self.update_velocities()
            self.update_positions()
            if it % 20 == 0:
                logger.info(f"PSO Iter {it}: Best = {self.global_best_fitness:.4f}")
        return self.global_best, self.global_best_fitness


class AntColonyOptimizer:
    """
    ACO: Ants finding shortest path using pheromones.
    """
    
    def __init__(self, n_ants: int = 20, evaporation: float = 0.5, alpha: float = 1.0, beta: float = 2.0):
        self.n_ants = n_ants
        self.evaporation = evaporation
        self.alpha = alpha
        self.beta = beta

    def solve_tsp(self, distance_matrix: List[List[float]]) -> Tuple[List[int], float]:
        """
        Solve Travelling Salesman Problem.
        """
        n = len(distance_matrix)
        pheromone = [[1.0] * n for _ in range(n)]
        
        best_tour = list(range(n))
        best_length = self._tour_length(best_tour, distance_matrix)
        
        for iteration in range(50):
            all_tours = []
            for ant in range(self.n_ants):
                tour = self._construct_tour(pheromone, distance_matrix, n)
                length = self._tour_length(tour, distance_matrix)
                all_tours.append((tour, length))
                if length < best_length:
                    best_tour = tour
                    best_length = length
                    
            self._update_pheromones(pheromone, all_tours)
            
        return best_tour, best_length

    def _construct_tour(self, pheromone, distances, n) -> List[int]:
        visited = {0}
        tour = [0]
        while len(tour) < n:
            current = tour[-1]
            probs = []
            candidates = [j for j in range(n) if j not in visited]
            for j in candidates:
                tau = pheromone[current][j] ** self.alpha
                eta = (1.0 / (distances[current][j] + 0.1)) ** self.beta
                probs.append(tau * eta)
            total = sum(probs) or 1
            probs = [p / total for p in probs]
            next_city = random.choices(candidates, weights=probs, k=1)[0]
            tour.append(next_city)
            visited.add(next_city)
        return tour

    def _tour_length(self, tour, distances) -> float:
        return sum(distances[tour[i]][tour[(i+1) % len(tour)]] for i in range(len(tour)))

    def _update_pheromones(self, pheromone, all_tours):
        n = len(pheromone)
        for i in range(n):
            for j in range(n):
                pheromone[i][j] *= (1 - self.evaporation)
        for tour, length in all_tours:
            deposit = 1.0 / length
            for i in range(len(tour)):
                pheromone[tour[i]][tour[(i+1) % len(tour)]] += deposit
