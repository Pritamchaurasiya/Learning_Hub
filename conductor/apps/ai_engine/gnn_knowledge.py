import math
import random
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class GCNLayer:
    """
    Phase 67: Graph Convolutional Network (GCN) Layer.
    
    Implements the standard Graph Convolution operation:
    H^{(l+1)} = ReLU( D^{-1/2} A D^{-1/2} H^{(l)} W^{(l)} )
    
    Where:
    - A is the Adjacency matrix (with self-loops added: A + I).
    - D is the Degree matrix.
    - H is the node feature matrix.
    - W is the learnable weight matrix.
    """
    def __init__(self, in_features: int, out_features: int, seed_str: str):
        self.in_features = in_features
        self.out_features = out_features
        
        seed = hash(seed_str) % (2**31)
        rng = random.Random(seed)
        scale = math.sqrt(2.0 / (in_features + out_features))
        
        self.weight = [[rng.gauss(0, scale) for _ in range(out_features)] for _ in range(in_features)]
        self.bias = [0.0] * out_features
        
    def _matrix_multiply(self, A: List[List[float]], B: List[List[float]]) -> List[List[float]]:
        """Multiplies matrix A (N x M) with matrix B (M x P) -> Result (N x P)"""
        N = len(A)
        M = len(A[0])
        P = len(B[0])
        result = [[0.0] * P for _ in range(N)]
        for i in range(N):
            for j in range(P):
                sum_val = 0.0
                for k in range(M):
                    sum_val += A[i][k] * B[k][j]
                result[i][j] = sum_val
        return result
        
    def forward(self, adj: List[List[float]], h: List[List[float]]) -> List[List[float]]:
        """
        Args:
            adj: Normalized Adjacency Matrix (N x N)
            h: Node Features (N x in_features)
        Returns:
            Updated Node Features (N x out_features)
        """
        N = len(h)
        # 1. Feature Transformation: H_transformed = H * W  (N x out_features)
        h_transformed = self._matrix_multiply(h, self.weight)
        
        # Add biases
        for i in range(N):
            for j in range(self.out_features):
                h_transformed[i][j] += self.bias[j]
                
        # 2. Neighborhood Aggregation: H_new = Adj * H_transformed  (N x out_features)
        h_new = self._matrix_multiply(adj, h_transformed)
        
        # 3. Non-linearity: ReLU
        for i in range(N):
            for j in range(self.out_features):
                h_new[i][j] = max(0.0, h_new[i][j])
                
        return h_new


class KnowledgeGraphTracer:
    """
    Phase 67: GNN for Educational Knowledge Tracing.
    
    Models the relationships between Students, Courses, and Topics as a Graph.
    If Student A passes "Algebra" (which is linked to "Math"), the GCN "message passes" 
    this signal through the graph so that we can predict Student A will likely 
    succeed in "Calculus" (also linked to "Math") because the "Math" node acts as a bridge.
    """
    
    def __init__(self, num_nodes: int, feature_dim: int = 4, hidden_dim: int = 8, out_dim: int = 2):
        self.num_nodes = num_nodes
        self.gcn1 = GCNLayer(feature_dim, hidden_dim, "gcn_layer_1")
        self.gcn2 = GCNLayer(hidden_dim, out_dim, "gcn_layer_2")
        
    def _normalize_adjacency(self, adj: List[List[float]]) -> List[List[float]]:
        """
        Computes D^{-1/2} (A + I) D^{-1/2}
        This ensures sum pooling doesn't explode features for high-degree nodes.
        """
        N = len(adj)
        # 1. Add self loops (A = A + I)
        A_hat = [row[:] for row in adj]
        for i in range(N):
            A_hat[i][i] += 1.0
            
        # 2. Calculate Degree matrix D
        # D_ii = sum(A_hat[i])
        degrees = [sum(row) for row in A_hat]
        
        # 3. Normalize
        Norm_A = [[0.0] * N for _ in range(N)]
        for i in range(N):
            for j in range(N):
                if A_hat[i][j] > 0:
                    d_i_inv_sqrt = 1.0 / math.sqrt(degrees[i]) if degrees[i] > 0 else 0.0
                    d_j_inv_sqrt = 1.0 / math.sqrt(degrees[j]) if degrees[j] > 0 else 0.0
                    Norm_A[i][j] = A_hat[i][j] * d_i_inv_sqrt * d_j_inv_sqrt
                    
        return Norm_A
        
    def predict_graph_state(self, adj_matrix: List[List[float]], node_features: List[List[float]]) -> Dict:
        """
        Passes node features through 2 layers of Graph Convolution.
        Returns the updated embeddings that have absorbed their neighbor's contexts.
        """
        if len(adj_matrix) != self.num_nodes or len(node_features) != self.num_nodes:
            raise ValueError("Adjacency and Feature matrices must match num_nodes.")
            
        # 1. Compute D^{-1/2} A D^{-1/2}
        norm_adj = self._normalize_adjacency(adj_matrix)
        
        # 2. Layer 1 Message Passing
        # h1 nodes now contain information about their immediate neighbors (1-hop)
        h1 = self.gcn1.forward(norm_adj, node_features)
        
        # 3. Layer 2 Message Passing
        # h2 nodes now contain information about their neighbors' neighbors (2-hop)
        h2 = self.gcn2.forward(norm_adj, h1)
        
        # h2 represents the final aligned graph embeddings
        return {
            "num_nodes": self.num_nodes,
            "message_passing_hops": 2,
            "final_embeddings": [[round(v, 4) for v in row] for row in h2]
        }
