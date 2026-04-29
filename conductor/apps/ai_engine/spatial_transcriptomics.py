"""
Spatial Transcriptomics Analyzer (Phase 105).
Graph Convolutional Network (GCN) mapping gene expression to physical tissue 2D coordinates.
"""
import random
import math
import logging
from typing import List, Dict, Tuple, Any

logger = logging.getLogger(__name__)


class SpatialGCN:
    """
    Simulates a Graph Convolutional Network operating on physical tissue slices.
    Nodes are 'spots' on a slide containing a gene expression profile AND an (x,y) coordinate.
    Edges connect physically adjacent spots to smooth expression and identify localized microenvironments.
    """
    def __init__(self, num_spots: int = 400, in_genes: int = 50, hidden: int = 16, classes: int = 4):
        self.num_spots = num_spots
        self.in_genes = in_genes
        self.hidden = hidden
        self.classes = classes
        
        # Simulated Slide (Spots): Expression + Coordinates
        # 20x20 grid
        self.coords = []
        for x in range(20):
            for y in range(20):
                self.coords.append((x, y))
                
        # Base expression profiles
        self.expressions = [[random.gauss(0, 0.1) for _ in range(in_genes)] for _ in range(num_spots)]
        
        # Inject artificial spatial patterns (e.g., a tumor in the center)
        for idx, (x, y) in enumerate(self.coords):
            dist_to_center = math.hypot(10 - x, 10 - y)
            if dist_to_center < 5:  # Tumor microenvironment signature
                self.expressions[idx][0] += 2.0  # Upregulate marker gene
            elif x > 15: # Stromal edge signature
                self.expressions[idx][1] += 1.5
                
        # Build Adjacency List (kNN based on physical distance, k=4)
        self.adj = [[] for _ in range(num_spots)]
        for i in range(num_spots):
            distances = []
            for j in range(num_spots):
                if i != j:
                    d = math.hypot(self.coords[i][0] - self.coords[j][0], self.coords[i][1] - self.coords[j][1])
                    distances.append((d, j))
            distances.sort()
            # Connect to 4 nearest spatial neighbors
            for k in range(4):
                if k < len(distances):
                    self.adj[i].append(distances[k][1])
                    
        # GCN Weights: Local x 2 Layers
        self.W1 = [[random.gauss(0, 0.1) for _ in range(in_genes)] for _ in range(hidden)]
        self.W2 = [[random.gauss(0, 0.1) for _ in range(hidden)] for _ in range(classes)]
        
    def _matmul(self, vec: List[float], matrix: List[List[float]]) -> List[float]:
        # vec is 1xN, matrix is MxN, returns 1xM
        out = [0.0] * len(matrix)
        for i in range(len(matrix)):
            out[i] = sum(vec[j] * matrix[i][j] for j in range(len(vec)))
        return out
        
    def _relu(self, vec: List[float]) -> List[float]:
        return [max(0.0, v) for v in vec]
        
    def convolution_layer(self, node_features: List[List[float]], weights: List[List[float]]) -> List[List[float]]:
        """One step of spatial message passing and linear transformation."""
        new_features = []
        for i in range(self.num_spots):
            # 1. Aggregate self + neighbors (Mean pooling)
            neighbors = self.adj[i]
            aggregated = list(node_features[i])
            for n in neighbors:
                for f in range(len(aggregated)):
                    aggregated[f] += node_features[n][f]
                    
            deg = len(neighbors) + 1
            aggregated = [v / deg for v in aggregated]
            
            # 2. Transform W * X
            transformed = self._matmul(aggregated, weights)
            new_features.append(self._relu(transformed))
            
        return new_features

    def analyze_tissue(self) -> Dict[str, Any]:
        """Perform 2 spatial convolutions and predict microenvironments."""
        # Layer 1
        h1 = self.convolution_layer(self.expressions, self.W1)
        
        # Layer 2 (Logits output)
        logits = self.convolution_layer(h1, self.W2)
        
        # Assign spatial domains (argmax)
        domains = []
        domain_counts = {i: 0 for i in range(self.classes)}
        
        for i in range(self.num_spots):
            domain_idx = logits[i].index(max(logits[i]))
            domains.append({"x": self.coords[i][0], "y": self.coords[i][1], "domain": domain_idx})
            domain_counts[domain_idx] += 1
            
        return {
            "spots_analyzed": self.num_spots,
            "latent_genes": self.in_genes,
            "microenvironment_distribution": domain_counts,
            "sample_spatial_domains": domains[:5],
            "mechanics": "Graph Convolution passing expression messages across physical 2D Cartesian adjacency."
        }


class SpatialEngine:
    """Wrapper for Spatial Transcriptomics analysis."""
    def __init__(self):
        self.gcn = SpatialGCN()
        
    def map_domains(self) -> Dict[str, Any]:
        return self.gcn.analyze_tissue()
