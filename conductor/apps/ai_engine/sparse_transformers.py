"""
Sparse Transformers

Memory-efficient attention patterns:
1. Strided attention patterns.
2. Block-sparse attention.
3. Longformer-style sliding window.
"""

import logging
import random
import math
from typing import List, Tuple, Optional, Set
from dataclasses import dataclass

logger = logging.getLogger(__name__)


from abc import ABC, abstractmethod

class AttentionPattern(ABC):
    """Base class for sparse attention patterns."""
    
    @abstractmethod
    def get_mask(self, seq_len: int) -> List[List[bool]]:
        """Return attention mask (True = attend, False = skip)."""
        pass


class StridedAttention(AttentionPattern):
    """Strided attention: attend to every k-th position."""
    def __init__(self, stride: int = 4):
        self.stride = stride

    def get_mask(self, seq_len: int) -> List[List[bool]]:
        mask = [[False] * seq_len for _ in range(seq_len)]
        
        for i in range(seq_len):
            for j in range(seq_len):
                # Attend if same stride group or local
                if i % self.stride == j % self.stride or abs(i - j) <= 1:
                    mask[i][j] = True
        
        return mask


class BlockSparseAttention(AttentionPattern):
    """Block-sparse attention pattern."""
    def __init__(self, block_size: int = 8):
        self.block_size = block_size

    def get_mask(self, seq_len: int) -> List[List[bool]]:
        mask = [[False] * seq_len for _ in range(seq_len)]
        
        for i in range(seq_len):
            block_i = i // self.block_size
            for j in range(seq_len):
                block_j = j // self.block_size
                # Attend within same block or adjacent blocks
                if abs(block_i - block_j) <= 1:
                    mask[i][j] = True
        
        return mask


class SlidingWindowAttention(AttentionPattern):
    """Longformer-style sliding window + global tokens."""
    def __init__(self, window_size: int = 32, global_tokens: int = 4):
        self.window_size = window_size
        self.global_tokens = global_tokens

    def get_mask(self, seq_len: int) -> List[List[bool]]:
        mask = [[False] * seq_len for _ in range(seq_len)]
        half_window = self.window_size // 2
        
        for i in range(seq_len):
            for j in range(seq_len):
                # Global tokens attend/attended to everywhere
                # OR sliding window matches
                if i < self.global_tokens or j < self.global_tokens or abs(i - j) <= half_window:
                    mask[i][j] = True
        
        return mask


class SparseTransformerLayer:
    """Transformer layer with sparse attention."""
    def __init__(self, d_model: int, n_heads: int = 4, pattern: Optional[AttentionPattern] = None):
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        self.pattern = pattern or SlidingWindowAttention()
        
        # Query, Key, Value projections
        self.w_q = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.w_k = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.w_v = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.w_o = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]

    def _linear(self, w_mat: List[List[float]], x: List[float]) -> List[float]:
        return [sum(w_mat[i][j] * x[j] for j in range(len(x))) for i in range(len(w_mat))]

    def forward(self, x_seq: List[List[float]]) -> List[List[float]]:
        seq_len = len(x_seq)
        mask = self.pattern.get_mask(seq_len)
        
        q_mat = [self._linear(self.w_q, x) for x in x_seq]
        k_mat = [self._linear(self.w_k, x) for x in x_seq]
        v_mat = [self._linear(self.w_v, x) for x in x_seq]
        
        outputs = []
        for i in range(seq_len):
            # Sparse attention
            scores = []
            active_indices = []
            
            for j in range(seq_len):
                if mask[i][j]:
                    s = sum(q_mat[i][k] * k_mat[j][k] for k in range(self.d_model))
                    scores.append(s / math.sqrt(self.d_model))
                    active_indices.append(j)
            
            if not scores:
                outputs.append(x_seq[i])
                continue
            
            # Softmax over active positions
            max_s = max(scores)
            exp_scores = [math.exp(s - max_s) for s in scores]
            total = sum(exp_scores)
            attn = [e / total for e in exp_scores]
            
            # Weighted sum
            out = [0.0] * self.d_model
            for idx, j in enumerate(active_indices):
                for k in range(self.d_model):
                    out[k] += attn[idx] * v_mat[j][k]
            
            outputs.append(self._linear(self.w_o, out))
        
        return outputs
