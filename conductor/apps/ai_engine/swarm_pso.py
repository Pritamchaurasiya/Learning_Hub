"""
Particle Swarm Optimization (PSO) Engine (Phase 114).
Population-based continuous optimization simulating social behavior of birds/fish.
"""
import random
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class Particle:
    """A single particle in the swarm searching the multidimensional space."""
    def __init__(self, num_dimensions: int, bounds: tuple):
        self.position = [random.uniform(bounds[0], bounds[1]) for _ in range(num_dimensions)]
        self.velocity = [random.uniform(-1, 1) for _ in range(num_dimensions)]
        
        # P-Best (Personal Best)
        self.pbest_position = list(self.position)
        self.pbest_value = float('inf')


class PSOEngine:
    """
    Simulates Particle Swarm Optimization.
    Particles move through the search space, pulled towards their own best known 
    position (Cognitive) and the swarm's global best known position (Social).
    """
    def __init__(self, num_particles: int = 30, dimensions: int = 10):
        self.num_particles = num_particles
        self.dimensions = dimensions
        self.bounds = (-10.0, 10.0)
        
        self.swarm = [Particle(dimensions, self.bounds) for _ in range(num_particles)]
        
        # G-Best (Global Best)
        self.gbest_position = [0.0 for _ in range(dimensions)]
        self.gbest_value = float('inf')
        
        # Inertia weight (maintains current velocity)
        self.w = 0.7
        # Cognitive constant (P-best attraction)
        self.c1 = 1.5
        # Social constant (G-best attraction)
        self.c2 = 1.5

    def _evaluate_fitness(self, position: List[float]) -> float:
        """
        Simulated Objective Function: Rastrigin function (highly multi-modal).
        f(x) = 10*n + sum(x_i^2 - 10*cos(2*pi*x_i))
        Global minimum is 0 at x = [0, 0, ..., 0]
        """
        import math
        fitness = 10.0 * self.dimensions
        for x in position:
            fitness += (x**2 - 10.0 * math.cos(2 * math.pi * x))
        return fitness

    def simulate_swarm(self, iterations: int = 100) -> Dict[str, Any]:
        """
        Simulates the swarm converging on the optimal solution.
        """
        initial_best_val = float('inf')
        
        for iteration in range(iterations):
            for particle in self.swarm:
                # 1. Evaluate fitness
                fitness = self._evaluate_fitness(particle.position)
                
                # 2. Update Personal Best (Cognitive)
                if fitness < particle.pbest_value:
                    particle.pbest_value = fitness
                    particle.pbest_position = list(particle.position)
                    
                # 3. Update Global Best (Social)
                if fitness < self.gbest_value:
                    self.gbest_value = fitness
                    self.gbest_position = list(particle.position)
                    
            if iteration == 0:
                 initial_best_val = self.gbest_value
                 
            # 4. Update Velocities and Positions
            for particle in self.swarm:
                for d in range(self.dimensions):
                    # Stochastic weights
                    r1 = random.random()
                    r2 = random.random()
                    
                    # Velocity update formula:
                    # v(t+1) = w*v(t) + c1*r1*(pbest - x(t)) + c2*r2*(gbest - x(t))
                    cognitive_component = self.c1 * r1 * (particle.pbest_position[d] - particle.position[d])
                    social_component = self.c2 * r2 * (self.gbest_position[d] - particle.position[d])
                    
                    particle.velocity[d] = self.w * particle.velocity[d] + cognitive_component + social_component
                    
                    # Position update
                    particle.position[d] += particle.velocity[d]
                    
                    # Enforce bounds
                    if particle.position[d] > self.bounds[1]:
                        particle.position[d] = self.bounds[1]
                        particle.velocity[d] *= -0.5 # Bounce back
                    elif particle.position[d] < self.bounds[0]:
                        particle.position[d] = self.bounds[0]
                        particle.velocity[d] *= -0.5
                        
        return {
            "iterations": iterations,
            "swarm_size": self.num_particles,
            "dimensions": self.dimensions,
            "initial_found_minimum": round(initial_best_val, 4),
            "final_global_best_minimum": round(self.gbest_value, 4),
            "improvement_percentage": round(((initial_best_val - self.gbest_value) / initial_best_val) * 100, 2),
            "mechanics": "Continuous socio-cognitive optimization. Agents update velocities towards personal and global bests in highly non-convex spaces."
        }
