"""
Swarm Intelligence Module (Phase 24).
Bio-inspired optimization: PSO (Particle Swarm) and ACO (Ant Colony).
"""
import logging
import random
import math
from typing import List, Dict, Any, Callable, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class Particle:
    """A particle in PSO."""
    position: List[float]
    velocity: List[float]
    best_position: List[float] = field(default_factory=list)
    best_fitness: float = float('inf')

    def __post_init__(self):
        if not self.best_position:
            self.best_position = self.position.copy()


class ParticleSwarmOptimizer:
    """
    Particle Swarm Optimization (PSO).
    Simulates social behavior of birds/fish to find optimal solutions.
    """
    
    def __init__(
        self, 
        n_particles: int = 30,
        n_dims: int = 2,
        bounds: Tuple[float, float] = (-10, 10),
        w: float = 0.7,      # Inertia weight
        c1: float = 1.5,     # Cognitive (personal best) coefficient
        c2: float = 1.5      # Social (global best) coefficient
    ):
        self.n_particles = n_particles
        self.n_dims = n_dims
        self.bounds = bounds
        self.w = w
        self.c1 = c1
        self.c2 = c2
        
        # Initialize swarm
        self.particles: List[Particle] = []
        self.global_best_position: List[float] = [0.0] * n_dims
        self.global_best_fitness: float = float('inf')
        
        self._initialize_swarm()
    
    def _initialize_swarm(self):
        """Initialize particles with random positions and velocities."""
        for _ in range(self.n_particles):
            pos = [random.uniform(*self.bounds) for _ in range(self.n_dims)]
            vel = [random.uniform(-1, 1) for _ in range(self.n_dims)]
            self.particles.append(Particle(position=pos, velocity=vel))
    
    def optimize(
        self, 
        fitness_fn: Callable[[List[float]], float],
        n_iterations: int = 100
    ) -> Dict[str, Any]:
        """
        Run PSO optimization.
        
        Args:
            fitness_fn: Function to minimize (lower is better)
            n_iterations: Number of iterations
            
        Returns:
            Best position and fitness
        """
        convergence = []
        
        for iteration in range(n_iterations):
            for particle in self.particles:
                # Evaluate fitness
                fitness = fitness_fn(particle.position)
                
                # Update personal best
                if fitness < particle.best_fitness:
                    particle.best_fitness = fitness
                    particle.best_position = particle.position.copy()
                
                # Update global best
                if fitness < self.global_best_fitness:
                    self.global_best_fitness = fitness
                    self.global_best_position = particle.position.copy()
            
            # Update velocities and positions
            for particle in self.particles:
                for d in range(self.n_dims):
                    r1, r2 = random.random(), random.random()
                    
                    # Velocity update
                    cognitive = self.c1 * r1 * (particle.best_position[d] - particle.position[d])
                    social = self.c2 * r2 * (self.global_best_position[d] - particle.position[d])
                    particle.velocity[d] = self.w * particle.velocity[d] + cognitive + social
                    
                    # Position update
                    particle.position[d] += particle.velocity[d]
                    
                    # Clamp to bounds
                    particle.position[d] = max(self.bounds[0], min(self.bounds[1], particle.position[d]))
            
            convergence.append(self.global_best_fitness)
        
        return {
            'best_position': self.global_best_position,
            'best_fitness': self.global_best_fitness,
            'convergence': convergence,
            'iterations': n_iterations
        }


@dataclass
class Ant:
    """An ant in ACO."""
    path: List[int] = field(default_factory=list)
    cost: float = float('inf')


class AntColonyOptimizer:
    """
    Ant Colony Optimization (ACO).
    Simulates ant foraging behavior for pathfinding/TSP problems.
    """
    
    def __init__(
        self,
        n_ants: int = 20,
        alpha: float = 1.0,    # Pheromone importance
        beta: float = 2.0,     # Heuristic importance
        evaporation: float = 0.5,
        q: float = 100.0       # Pheromone deposit factor
    ):
        self.n_ants = n_ants
        self.alpha = alpha
        self.beta = beta
        self.evaporation = evaporation
        self.q = q
        
        self.pheromones: List[List[float]] = []
        self.distances: List[List[float]] = []
        self.n_nodes: int = 0
    
    def _initialize_pheromones(self, n_nodes: int):
        """Initialize pheromone matrix."""
        self.n_nodes = n_nodes
        initial_pheromone = 1.0 / n_nodes
        self.pheromones = [[initial_pheromone for _ in range(n_nodes)] for _ in range(n_nodes)]
    
    def _calculate_probabilities(self, current: int, visited: set) -> List[float]:
        """Calculate transition probabilities to unvisited nodes."""
        probs = []
        total = 0.0
        
        for j in range(self.n_nodes):
            if j in visited:
                probs.append(0.0)
            else:
                pheromone = self.pheromones[current][j] ** self.alpha
                heuristic = (1.0 / max(self.distances[current][j], 0.001)) ** self.beta
                prob = pheromone * heuristic
                probs.append(prob)
                total += prob
        
        # Normalize
        if total > 0:
            probs = [p / total for p in probs]
        
        return probs
    
    def _select_next(self, probs: List[float]) -> int:
        """Roulette wheel selection."""
        r = random.random()
        cumsum = 0.0
        for i, p in enumerate(probs):
            cumsum += p
            if r <= cumsum:
                return i
        return len(probs) - 1
    
    def _calculate_path_cost(self, path: List[int]) -> float:
        """Calculate total path distance."""
        cost = 0.0
        for i in range(len(path) - 1):
            cost += self.distances[path[i]][path[i + 1]]
        # Return to start (for TSP)
        cost += self.distances[path[-1]][path[0]]
        return cost
    
    def _update_pheromones(self, ants: List[Ant]):
        """Evaporate and deposit pheromones."""
        # Evaporation
        for i in range(self.n_nodes):
            for j in range(self.n_nodes):
                self.pheromones[i][j] *= (1 - self.evaporation)
        
        # Deposit
        for ant in ants:
            deposit = self.q / ant.cost
            for i in range(len(ant.path) - 1):
                self.pheromones[ant.path[i]][ant.path[i + 1]] += deposit
                self.pheromones[ant.path[i + 1]][ant.path[i]] += deposit
    
    def optimize(
        self,
        distance_matrix: List[List[float]],
        n_iterations: int = 50
    ) -> Dict[str, Any]:
        """
        Run ACO to find shortest path (TSP).
        
        Args:
            distance_matrix: NxN matrix of distances
            n_iterations: Number of iterations
            
        Returns:
            Best path and cost
        """
        self.distances = distance_matrix
        n_nodes = len(distance_matrix)
        self._initialize_pheromones(n_nodes)
        
        best_path: List[int] = []
        best_cost = float('inf')
        convergence = []
        
        for _ in range(n_iterations):
            ants: List[Ant] = []
            
            for _ in range(self.n_ants):
                # Build path for each ant
                start = random.randint(0, n_nodes - 1)
                path = [start]
                visited = {start}
                
                while len(path) < n_nodes:
                    current = path[-1]
                    probs = self._calculate_probabilities(current, visited)
                    next_node = self._select_next(probs)
                    path.append(next_node)
                    visited.add(next_node)
                
                cost = self._calculate_path_cost(path)
                ants.append(Ant(path=path, cost=cost))
                
                if cost < best_cost:
                    best_cost = cost
                    best_path = path.copy()
            
            self._update_pheromones(ants)
            convergence.append(best_cost)
        
        return {
            'best_path': best_path,
            'best_cost': best_cost,
            'convergence': convergence,
            'iterations': n_iterations
        }


def optimize_resource_allocation(
    resources: List[float],
    demands: List[float]
) -> Dict[str, Any]:
    """
    Use PSO to optimize resource allocation.
    
    Args:
        resources: Available resource amounts
        demands: Required demands
        
    Returns:
        Optimal allocation
    """
    n_dims = len(demands)
    
    def fitness(allocation: List[float]) -> float:
        # Minimize total mismatch
        total = sum(resources)
        used = sum(allocation)
        
        # Penalty for over-allocation
        over_penalty = max(0, used - total) * 10
        
        # Penalty for unmet demands
        unmet = sum(max(0, d - a) for d, a in zip(demands, allocation))
        
        return over_penalty + unmet
    
    pso = ParticleSwarmOptimizer(n_particles=30, n_dims=n_dims, bounds=(0, max(demands) * 1.5))
    result = pso.optimize(fitness, n_iterations=100)
    
    return {
        'allocation': result['best_position'],
        'fitness': result['best_fitness'],
        'resources': resources,
        'demands': demands
    }


def solve_tsp(cities: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    Solve Traveling Salesman Problem using ACO.
    
    Args:
        cities: List of (x, y) coordinates
        
    Returns:
        Optimal tour and distance
    """
    n = len(cities)
    
    # Build distance matrix
    distances = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                dx = cities[i][0] - cities[j][0]
                dy = cities[i][1] - cities[j][1]
                distances[i][j] = math.sqrt(dx * dx + dy * dy)
    
    aco = AntColonyOptimizer(n_ants=20)
    result = aco.optimize(distances, n_iterations=50)
    
    return {
        'tour': result['best_path'],
        'total_distance': result['best_cost'],
        'cities': cities
    }


def demo_swarm():
    """Demo swarm intelligence algorithms."""
    print("=== PSO: Minimize Sphere Function ===")
    
    def sphere(x: List[float]) -> float:
        return sum(xi ** 2 for xi in x)
    
    pso = ParticleSwarmOptimizer(n_particles=30, n_dims=5, bounds=(-10, 10))
    result = pso.optimize(sphere, n_iterations=100)
    print(f"Best Position: {[f'{x:.4f}' for x in result['best_position']]}")
    print(f"Best Fitness: {result['best_fitness']:.6f}")
    
    print("\n=== ACO: TSP with 5 Cities ===")
    cities = [(0, 0), (1, 5), (5, 2), (3, 3), (6, 1)]
    tsp_result = solve_tsp(cities)
    print(f"Best Tour: {tsp_result['tour']}")
    print(f"Total Distance: {tsp_result['total_distance']:.2f}")
    
    return result, tsp_result
