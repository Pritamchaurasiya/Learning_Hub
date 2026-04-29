"""
Ant Colony Optimization (ACO) Engine (Phase 113).
Probabilistic technique for solving computational graph problems utilizing artificial pheromone trails.
"""
import random
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class ACOEngine:
    """
    Simulates Ant Colony Optimization (e.g., for the Traveling Salesperson Problem).
    Ants lay down pheromones on shorter paths, increasing the probability that 
    future ants will choose those paths, leading to emergent optimal routing.
    """
    def __init__(self, num_nodes: int = 20, num_ants: int = 10):
        self.num_nodes = num_nodes
        self.num_ants = num_ants
        
        # Coordinates for nodes (cities)
        self.nodes = [(random.uniform(0, 100), random.uniform(0, 100)) for _ in range(num_nodes)]
        
        # Distance Matrix
        self.distances = [[0.0 for _ in range(num_nodes)] for _ in range(num_nodes)]
        for i in range(num_nodes):
            for j in range(num_nodes):
                if i != j:
                    dx = self.nodes[i][0] - self.nodes[j][0]
                    dy = self.nodes[i][1] - self.nodes[j][1]
                    self.distances[i][j] = math.sqrt(dx**2 + dy**2)
                    
        # Pheromone Matrix (Initialize with small constant)
        self.pheromones = [[0.1 for _ in range(num_nodes)] for _ in range(num_nodes)]
        
        # Hyperparameters
        self.alpha = 1.0  # Importance of pheromone
        self.beta = 2.0   # Importance of heuristic (1/distance)
        self.evaporation_rate = 0.5
        self.q = 100.0    # Pheromone deposit factor

    def _choose_next_node(self, current_node: int, unvisited: List[int]) -> int:
        """Probabilistically chooses the next node based on pheromones and distance."""
        probabilities = []
        total_prob = 0.0
        
        for candidate in unvisited:
            pheromone = self.pheromones[current_node][candidate] ** self.alpha
            # Heuristic: closer is better
            heuristic = (1.0 / self.distances[current_node][candidate]) ** self.beta
            
            prob = pheromone * heuristic
            probabilities.append((candidate, prob))
            total_prob += prob
            
        # Roulette Wheel Selection
        if total_prob == 0:
            return random.choice(unvisited)
            
        r = random.uniform(0, total_prob)
        cumulative = 0.0
        for candidate, prob in probabilities:
            cumulative += prob
            if r <= cumulative:
                return candidate
                
        return unvisited[-1] # Fallback

    def simulate_colony(self, iterations: int = 50) -> Dict[str, Any]:
        """
        Runs the ACO algorithm, finding an emergent optimal path.
        """
        best_tour = None
        best_tour_length = float('inf')
        
        initial_random_tour_length = 0.0
        
        for iteration in range(iterations):
            all_tours = []
            
            # 1. Ants build solutions
            for ant_idx in range(self.num_ants):
                # Start at random node
                current_node = random.randint(0, self.num_nodes - 1)
                tour = [current_node]
                unvisited = list(range(self.num_nodes))
                unvisited.remove(current_node)
                
                tour_length = 0.0
                
                while unvisited:
                    next_node = self._choose_next_node(current_node, unvisited)
                    tour.append(next_node)
                    unvisited.remove(next_node)
                    
                    tour_length += self.distances[current_node][next_node]
                    current_node = next_node
                    
                # Return to start to complete loop (TSP)
                tour_length += self.distances[current_node][tour[0]]
                
                all_tours.append((tour, tour_length))
                
                if tour_length < best_tour_length:
                    best_tour = list(tour)
                    best_tour_length = tour_length
                    
                if iteration == 0 and ant_idx == 0:
                    initial_random_tour_length = tour_length
                    
            # 2. Pheromone Evaporation
            for i in range(self.num_nodes):
                for j in range(self.num_nodes):
                    self.pheromones[i][j] *= (1.0 - self.evaporation_rate)
                    
            # 3. Pheromone Deposit
            for tour, tour_length in all_tours:
                deposit_amount = self.q / tour_length # Better tours drop MORE pheromone
                
                for k in range(self.num_nodes):
                    node_a = tour[k]
                    # Loop back around
                    node_b = tour[(k + 1) % self.num_nodes]
                    
                    # Deposit symmetrically
                    self.pheromones[node_a][node_b] += deposit_amount
                    self.pheromones[node_b][node_a] += deposit_amount
                    
        return {
            "iterations": iterations,
            "colony_size": self.num_ants,
            "nodes_visited": self.num_nodes,
            "initial_found_tour_length": round(initial_random_tour_length, 2),
            "best_emergent_tour_length": round(best_tour_length, 2),
            "improvement_percentage": round(((initial_random_tour_length - best_tour_length) / initial_random_tour_length) * 100, 2),
            "mechanics": "Swarm Intelligence optimization leveraging probabilistic transition rules driven by artificial pheromone trails and heuristic distances."
        }
