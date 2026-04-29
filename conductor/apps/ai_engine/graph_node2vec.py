"""
Graph Representation Learning (Node2Vec) Engine (Phase 120).
Embeds graph nodes into dense vector spaces via biased random walks.
"""
import random
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class Node2VecEngine:
    """
    Simulates Node2Vec algorithm.
    1. Runs biased random walks over a graph (combining BFS/DFS behavior via p and q).
    2. These walks generate "sentences" of nodes.
    3. Runs a Skip-Gram model (like Word2Vec) over these sentences to learn node embeddings.
    """
    def __init__(self, num_nodes: int = 50, embed_dim: int = 16):
        self.num_nodes = num_nodes
        self.embed_dim = embed_dim
        
        # p (Return parameter): Higher p discourages returning to the previous node
        self.p = 1.0
        # q (In-out parameter): Higher q behaves like BFS (local). Lower q behaves like DFS (exploration).
        self.q = 0.5
        
        # Simulate an adjacency matrix (Graph)
        self.adj_matrix = [[0 for _ in range(num_nodes)] for _ in range(num_nodes)]
        for i in range(num_nodes):
            for j in range(num_nodes):
                if i != j and random.random() < 0.1: # 10% connection probability
                    self.adj_matrix[i][j] = 1
                    self.adj_matrix[j][i] = 1
                    
        # Node embeddings
        self.embeddings = [[random.gauss(0, 0.1) for _ in range(embed_dim)] for _ in range(num_nodes)]
        
        self.learning_rate = 0.05

    def _biased_random_walk(self, start_node: int, walk_length: int = 10) -> List[int]:
        """Runs a 2nd-order biased random walk starting from a node."""
        walk = [start_node]
        current_node = start_node
        prev_node = None # No previous node initially
        
        for _ in range(walk_length - 1):
            neighbors = [j for j, connected in enumerate(self.adj_matrix[current_node]) if connected]
            if not neighbors:
                break
                
            probabilities = []
            
            # Calculate unnormalized transition probabilities
            for nbr in neighbors:
                if prev_node is None:
                    unnorm_prob = 1.0 # First step, standard random walk
                elif nbr == prev_node:
                    unnorm_prob = 1.0 / self.p # Returning
                elif self.adj_matrix[nbr][prev_node] == 1:
                    unnorm_prob = 1.0 # BFS-like (triangles)
                else:
                    unnorm_prob = 1.0 / self.q # DFS-like (outward exploring)
                    
                probabilities.append(unnorm_prob)
                
            # Normalize
            total_prob = sum(probabilities)
            probabilities = [prob / total_prob for prob in probabilities]
            
            # Select next node
            r = random.random()
            cumulative = 0.0
            next_node = neighbors[-1]
            for nbr, prob in zip(neighbors, probabilities):
                cumulative += prob
                if r <= cumulative:
                    next_node = nbr
                    break
                    
            walk.append(next_node)
            prev_node = current_node
            current_node = next_node
            
        return walk

    def _dot(self, v1: List[float], v2: List[float]) -> float:
        return sum(x * y for x, y in zip(v1, v2))

    def _sigmoid(self, x: float) -> float:
        try:
            return 1.0 / (1.0 + math.exp(-x))
        except OverflowError:
            return 0.0 if x < 0 else 1.0

    def generate_embeddings(self, walks_per_node: int = 5, window_size: int = 5) -> Dict[str, Any]:
        """
        1. Generate corpus of walks.
        2. Simulate Skip-Gram with Negative Sampling (SGNS) update on embeddings.
        """
        all_walks = []
        # 1. Generate Biased Random Walks
        for _ in range(walks_per_node):
            nodes = list(range(self.num_nodes))
            random.shuffle(nodes)
            for node in nodes:
                walk = self._biased_random_walk(start_node=node, walk_length=15)
                if len(walk) > 2:
                    all_walks.append(walk)
                    
        total_loss = 0.0
        pairs_processed = 0
        
        # 2. Skip-Gram with Negative Sampling Simulation
        for walk in all_walks:
            for i, target_node in enumerate(walk):
                # Context window surrounding the target word (node)
                start = max(0, i - window_size)
                end = min(len(walk), i + window_size + 1)
                context_nodes = [walk[j] for j in range(start, end) if j != i]
                
                for context_node in context_nodes:
                    # Positive pair (appears in context window)
                    dot_pos = self._dot(self.embeddings[target_node], self.embeddings[context_node])
                    prob_pos = self._sigmoid(dot_pos)
                    loss_pos = -math.log(prob_pos + 1e-8)
                    
                    # Update (Gradient Ascent on Log Likelihood)
                    grad_pos = 1.0 - prob_pos
                    
                    # Negative pair (random random node)
                    negative_node = random.randint(0, self.num_nodes - 1)
                    dot_neg = self._dot(self.embeddings[target_node], self.embeddings[negative_node])
                    prob_neg = self._sigmoid(dot_neg)
                    loss_neg = -math.log(1.0 - prob_neg + 1e-8)
                    
                    grad_neg = -prob_neg
                    
                    total_loss += (loss_pos + loss_neg)
                    pairs_processed += 1
                    
                    # Apply SGD to representations
                    for d in range(self.embed_dim):
                        # Simulating separate target and context embedding matrices by updating in-place
                        self.embeddings[target_node][d] += self.learning_rate * (grad_pos * self.embeddings[context_node][d] + grad_neg * self.embeddings[negative_node][d])
                        self.embeddings[context_node][d] += self.learning_rate * (grad_pos * self.embeddings[target_node][d])
                        self.embeddings[negative_node][d] += self.learning_rate * (grad_neg * self.embeddings[target_node][d])
                        
        avg_loss = total_loss / max(1, pairs_processed)
        
        return {
            "total_nodes_in_graph": self.num_nodes,
            "embedding_dimensions": self.embed_dim,
            "total_walks_generated": len(all_walks),
            "skipgram_pairs_processed": pairs_processed,
            "average_skipgram_loss": round(avg_loss, 4),
            "mechanics": "Graph Representation via Node2Vec. Homophily and Structural Equivalence captured by p/q biased random walks combined with Skip-Gram with Negative Sampling."
        }
