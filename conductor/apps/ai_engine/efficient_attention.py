"""
Efficient Attention Mechanisms

Flash/Linear attention variants:
1. Chunked attention for memory efficiency.
2. Linear complexity kernels.
3. Memory-efficient backprop.
"""

import logging
import random
import math
from typing import List, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class StandardAttention:
    """Standard O(n²) attention for comparison."""
    def __init__(self, d_model: int, n_heads: int = 4):
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        
        self.W_q = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.W_k = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.W_v = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.W_o = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]

    def _linear(self, W: List[List[float]], x: List[float]) -> List[float]:
        return [sum(W[i][j] * x[j] for j in range(len(x))) for i in range(len(W))]

    def forward(self, x_seq: List[List[float]]) -> List[List[float]]:
        seq_len = len(x_seq)
        
        # Compute Q, K, V
        Q = [self._linear(self.W_q, x) for x in x_seq]
        K = [self._linear(self.W_k, x) for x in x_seq]
        V = [self._linear(self.W_v, x) for x in x_seq]
        
        # Attention scores
        outputs = []
        for i in range(seq_len):
            scores = []
            for j in range(seq_len):
                s = sum(Q[i][k] * K[j][k] for k in range(self.d_model))
                scores.append(s / math.sqrt(self.d_model))
            
            # Softmax
            max_s = max(scores)
            exp_scores = [math.exp(s - max_s) for s in scores]
            total = sum(exp_scores)
            attn = [e / total for e in exp_scores]
            
            # Weighted sum
            out = [0.0] * self.d_model
            for j in range(seq_len):
                for k in range(self.d_model):
                    out[k] += attn[j] * V[j][k]
            
            outputs.append(self._linear(self.W_o, out))
        
        return outputs


class ChunkedAttention:
    """
    Memory-efficient chunked attention.
    Processes attention in chunks to reduce peak memory.
    """
    def __init__(self, d_model: int, chunk_size: int = 32):
        self.d_model = d_model
        self.chunk_size = chunk_size
        
        self.W_q = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.W_k = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.W_v = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]

    def _linear(self, W: List[List[float]], x: List[float]) -> List[float]:
        return [sum(W[i][j] * x[j] for j in range(len(x))) for i in range(len(W))]

    def forward(self, x_seq: List[List[float]]) -> List[List[float]]:
        seq_len = len(x_seq)
        
        Q = [self._linear(self.W_q, x) for x in x_seq]
        K = [self._linear(self.W_k, x) for x in x_seq]
        V = [self._linear(self.W_v, x) for x in x_seq]
        
        outputs = []
        
        # Process in chunks
        for q_start in range(0, seq_len, self.chunk_size):
            q_end = min(q_start + self.chunk_size, seq_len)
            
            for i in range(q_start, q_end):
                # Accumulate attention across key chunks
                weighted_sum = [0.0] * self.d_model
                total_weight = 0.0
                max_score = float('-inf')
                
                for k_start in range(0, seq_len, self.chunk_size):
                    k_end = min(k_start + self.chunk_size, seq_len)
                    
                    # Compute scores for this chunk
                    chunk_scores = []
                    for j in range(k_start, k_end):
                        s = sum(Q[i][k] * K[j][k] for k in range(self.d_model))
                        chunk_scores.append(s / math.sqrt(self.d_model))
                    
                    # Track max for numerical stability
                    chunk_max = max(chunk_scores)
                    max_score = max(max_score, chunk_max)
                
                # Second pass with stable softmax
                for k_start in range(0, seq_len, self.chunk_size):
                    k_end = min(k_start + self.chunk_size, seq_len)
                    
                    for j in range(k_start, k_end):
                        s = sum(Q[i][k] * K[j][k] for k in range(self.d_model)) / math.sqrt(self.d_model)
                        w = math.exp(s - max_score)
                        total_weight += w
                        for k in range(self.d_model):
                            weighted_sum[k] += w * V[j][k]
                
                out = [ws / total_weight for ws in weighted_sum]
                outputs.append(out)
        
        return outputs


class LinearAttention:
    """
    Linear complexity attention using kernel approximation.
    O(n) instead of O(n²).
    """
    def __init__(self, d_model: int, n_features: int = 64):
        self.d_model = d_model
        self.n_features = n_features
        
        self.W_q = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.W_k = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.W_v = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        
        # Random features for kernel approximation
        self.omega = [[random.gauss(0, 1) for _ in range(d_model)] for _ in range(n_features)]

    def _linear(self, W: List[List[float]], x: List[float]) -> List[float]:
        return [sum(W[i][j] * x[j] for j in range(len(x))) for i in range(len(W))]

    def _feature_map(self, x: List[float]) -> List[float]:
        """Random Fourier Features for kernel approximation."""
        features = []
        for i in range(self.n_features):
            proj = sum(self.omega[i][j] * x[j] for j in range(len(x)))
            features.append(math.cos(proj))
            features.append(math.sin(proj))
        return features

    def forward(self, x_seq: List[List[float]]) -> List[List[float]]:
        seq_len = len(x_seq)
        
        Q = [self._linear(self.W_q, x) for x in x_seq]
        K = [self._linear(self.W_k, x) for x in x_seq]
        V = [self._linear(self.W_v, x) for x in x_seq]
        
        # Apply feature map
        Q_feat = [self._feature_map(q) for q in Q]
        K_feat = [self._feature_map(k) for k in K]
        
        feat_dim = len(Q_feat[0])
        
        # Compute KV product (can be done incrementally for causal)
        KV = [[0.0] * self.d_model for _ in range(feat_dim)]
        K_sum = [0.0] * feat_dim
        
        for j in range(seq_len):
            for f in range(feat_dim):
                K_sum[f] += K_feat[j][f]
                for d in range(self.d_model):
                    KV[f][d] += K_feat[j][f] * V[j][d]
        
        # Compute outputs
        outputs = []
        for i in range(seq_len):
            num = [0.0] * self.d_model
            denom = 0.0
            
            for f in range(feat_dim):
                denom += Q_feat[i][f] * K_sum[f]
                for d in range(self.d_model):
                    num[d] += Q_feat[i][f] * KV[f][d]
            
            out = [n / (denom + 1e-8) for n in num]
            outputs.append(out)
        
        return outputs
