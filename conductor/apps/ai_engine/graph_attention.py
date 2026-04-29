"""
Graph Attention Networks (GAT) Module (Phase 86).
Implementing self-attention over Graph Neural Networks for weighted relationship modeling.
"""
import math
import random
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def relu(x: float) -> float:
    return max(0.0, x)


def leaky_relu(x: float, alpha=0.2) -> float:
    return x if x > 0 else alpha * x


class GATLayer:
    """
    A single Graph Attention Layer.
    Computes attention coefficients between connected nodes and aggregates features.
    """
    
    def __init__(self, in_features: int, out_features: int, dropout: float = 0.0, alpha: float = 0.2):
        self.in_features = in_features
        self.out_features = out_features
        self.dropout = dropout
        self.alpha = alpha
        
        # Weight matrix for linear transformation of node features -> (out_features x in_features)
        self.W = [[random.gauss(0, 0.1) for _ in range(in_features)] for _ in range(out_features)]
        
        # Attention mechanism vector -> 2 * out_features
        self.a = [random.gauss(0, 0.1) for _ in range(2 * out_features)]
        
    def _linear_transform(self, h: List[float]) -> List[float]:
        """h_i' = W * h_i"""
        h_prime = [0.0] * self.out_features
        for i in range(self.out_features):
            for j in range(self.in_features):
                h_prime[i] += self.W[i][j] * h[j]
        return h_prime
        
    def _attention_coefficient(self, h_i_prime: List[float], h_j_prime: List[float]) -> float:
        """e_ij = LeakyReLU( a^T [Wh_i || Wh_j] )"""
        concat_features = h_i_prime + h_j_prime
        score = sum(self.a[k] * concat_features[k] for k in range(len(self.a)))
        return leaky_relu(score, self.alpha)
        
    def forward(self, node_features: List[List[float]], adj_matrix: List[List[int]]) -> List[List[float]]:
        """
        Forward pass for the GAT Layer.
        node_features: (N x in_features)
        adj_matrix: (N x N) binary adjacency (1 if connected, 0 otherwise)
        Returns updated node features: (N x out_features)
        """
        N = len(node_features)
        
        # Step 1: Linear transformation for all nodes
        h_prime = [self._linear_transform(h) for h in node_features]
        
        # Step 2 & 3: Compute attention coefficients and aggregate
        h_new = []
        attention_weights = [[0.0 for _ in range(N)] for _ in range(N)]
        
        for i in range(N):
            # Compute unnormalized attention scores e_ij for all neighbors j
            e_i = []
            neighbors = []
            for j in range(N):
                if adj_matrix[i][j] == 1 or i == j:  # Include self-loop
                    score = self._attention_coefficient(h_prime[i], h_prime[j])
                    e_i.append(score)
                    neighbors.append(j)
                    
            # Softmax over neighbors
            max_e = max(e_i) if e_i else 0
            exp_e = [math.exp(e - max_e) for e in e_i]
            sum_exp_e = sum(exp_e)
            alpha_i = [exp / sum_exp_e for exp in exp_e]
            
            for idx, j in enumerate(neighbors):
                attention_weights[i][j] = alpha_i[idx]
                
            # Aggregate: h_i'' = ELU( sum_{j in N(i)} alpha_ij * Wh_j )
            h_i_new = [0.0] * self.out_features
            for idx, j in enumerate(neighbors):
                a_ij = alpha_i[idx]
                if self.dropout > 0 and random.random() < self.dropout:
                    continue  # Dropout on attention weights
                
                for f in range(self.out_features):
                    h_i_new[f] += a_ij * h_prime[j][f]
                    
            # Apply ELU non-linearity (simplified to ReLU for demo)
            h_i_new = [relu(val) for val in h_i_new]
            h_new.append(h_i_new)
            
        self.last_attention_weights = attention_weights
        return h_new


class GraphAttentionEngine:
    """
    Phase 86: Graph Attention Networks Engine.
    Orchestrates GAT layers for tasks like Node Classification or Knowledge Tracing.
    """
    
    def __init__(self, in_features: int, hidden_features: int, out_features: int, n_heads: int = 1):
        # We'll support Multi-Head Attention by instantiating multiple GATLayers
        self.n_heads = n_heads
        self.attention_heads = [GATLayer(in_features, hidden_features) for _ in range(n_heads)]
        self.out_layer = GATLayer(hidden_features * n_heads, out_features)
        
    def forward(self, node_features: List[List[float]], adj_matrix: List[List[int]]) -> List[List[float]]:
        # Multi-Head Attention (concatenation)
        head_outputs = []
        for head in self.attention_heads:
            h_out = head.forward(node_features, adj_matrix)
            head_outputs.append(h_out)
            
        # Concatenate outputs from all heads for each node
        N = len(node_features)
        concat_hidden = []
        for i in range(N):
            node_i_concat = []
            for h in range(self.n_heads):
                node_i_concat.extend(head_outputs[h][i])
            concat_hidden.append(node_i_concat)
            
        # Output layer
        final_out = self.out_layer.forward(concat_hidden, adj_matrix)
        return final_out
