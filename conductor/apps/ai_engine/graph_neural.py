"""
Graph Neural Networks (GNN)

Message-passing framework for relational data:
1. Node feature aggregation from neighbors.
2. Edge-conditioned convolutions.
3. Graph-level readout.
"""

import logging
import random
import math
from typing import List, Dict, Any, Set, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class GraphNode:
    id: int
    features: List[float]
    neighbors: List[int]


@dataclass
class Graph:
    nodes: Dict[int, GraphNode]
    edges: List[Tuple[int, int]]  # (src, dst)


class MessagePassingLayer:
    """
    Generic message passing layer.
    """
    def __init__(self, in_features: int, out_features: int):
        self.in_features = in_features
        self.out_features = out_features
        # Learnable parameters
        self.W_msg = [[random.gauss(0, 0.1) for _ in range(in_features)] for _ in range(out_features)]
        self.W_upd = [[random.gauss(0, 0.1) for _ in range(in_features + out_features)] for _ in range(out_features)]

    def message(self, src_features: List[float]) -> List[float]:
        """Compute message from source node."""
        msg = []
        for i in range(self.out_features):
            val = sum(self.W_msg[i][j] * src_features[j] for j in range(min(len(src_features), self.in_features)))
            msg.append(val)
        return msg

    def aggregate(self, messages: List[List[float]]) -> List[float]:
        """Aggregate messages (mean pooling)."""
        if not messages:
            return [0.0] * self.out_features
        agg = [0.0] * self.out_features
        for msg in messages:
            for i, m in enumerate(msg):
                agg[i] += m
        return [a / len(messages) for a in agg]

    def update(self, node_features: List[float], aggregated: List[float]) -> List[float]:
        """Update node features."""
        combined = node_features[:self.in_features] + aggregated
        new_features = []
        for i in range(self.out_features):
            val = sum(self.W_upd[i][j] * combined[j] for j in range(min(len(combined), self.in_features + self.out_features)))
            new_features.append(math.tanh(val))  # Activation
        return new_features


class GraphConvNetwork:
    """
    Multi-layer Graph Convolutional Network.
    """
    def __init__(self, layer_dims: List[int]):
        self.layers = []
        for i in range(len(layer_dims) - 1):
            self.layers.append(MessagePassingLayer(layer_dims[i], layer_dims[i+1]))

    def forward(self, graph: Graph) -> Dict[int, List[float]]:
        """
        Forward pass through all layers.
        Returns updated node features.
        """
        # Initialize node features
        node_features = {nid: node.features.copy() for nid, node in graph.nodes.items()}
        
        for layer in self.layers:
            new_features = {}
            for nid, node in graph.nodes.items():
                # Gather messages from neighbors
                messages = [layer.message(node_features[neighbor]) for neighbor in node.neighbors]
                # Aggregate
                aggregated = layer.aggregate(messages)
                # Update
                new_features[nid] = layer.update(node_features[nid], aggregated)
            node_features = new_features
        
        return node_features

    def graph_readout(self, node_features: Dict[int, List[float]], method: str = 'mean') -> List[float]:
        """
        Graph-level representation from node features.
        """
        if not node_features:
            return []
        
        feature_dim = len(list(node_features.values())[0])
        
        if method == 'mean':
            pooled = [0.0] * feature_dim
            for features in node_features.values():
                for i, f in enumerate(features):
                    pooled[i] += f
            return [p / len(node_features) for p in pooled]
        
        elif method == 'sum':
            pooled = [0.0] * feature_dim
            for features in node_features.values():
                for i, f in enumerate(features):
                    pooled[i] += f
            return pooled
        
        elif method == 'max':
            pooled = [float('-inf')] * feature_dim
            for features in node_features.values():
                for i, f in enumerate(features):
                    pooled[i] = max(pooled[i], f)
            return pooled
        
        return []
