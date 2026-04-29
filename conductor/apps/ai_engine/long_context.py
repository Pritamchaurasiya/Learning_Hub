"""
Long Context Processing

Extended context window:
1. RoPE scaling.
2. Sliding window.
3. Compression.
"""

import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class ContextChunk:
    tokens: List[int]
    offset: int
    score: float


class RoPEScaling:
    """Rotary Position Embedding scaling."""
    def __init__(self, base: int = 4096, factor: float = 4.0):
        self.base = base
        self.factor = factor

    def scale(self, pos: int) -> float:
        return pos / self.factor

    def get_embeddings(self, positions: List[int], dim: int = 64) -> List[List[float]]:
        freqs = [1.0 / (10000 ** (i / dim)) for i in range(0, dim, 2)]
        embeddings = []
        for pos in positions:
            scaled = self.scale(pos)
            emb = []
            for freq in freqs:
                emb.extend([math.cos(scaled * freq), math.sin(scaled * freq)])
            embeddings.append(emb)
        return embeddings


class SlidingWindow:
    """Sliding window attention."""
    def __init__(self, size: int = 4096, stride: int = 2048):
        self.size = size
        self.stride = stride

    def get_windows(self, length: int) -> List[Tuple[int, int]]:
        windows = []
        start = 0
        while start < length:
            end = min(start + self.size, length)
            windows.append((start, end))
            start += self.stride
        return windows


class ContextCompressor:
    """Compress long context."""
    def __init__(self, target: int = 4096):
        self.target = target

    def compress(self, tokens: List[int]) -> List[int]:
        if len(tokens) <= self.target:
            return tokens
        # Keep first and last, sample middle
        first = tokens[:self.target // 4]
        last = tokens[-self.target // 4:]
        mid_start = self.target // 4
        mid_end = len(tokens) - self.target // 4
        step = max(1, (mid_end - mid_start) // (self.target // 2))
        middle = tokens[mid_start:mid_end:step][:self.target // 2]
        return first + middle + last


class LongContextProcessor:
    """Long context system."""
    def __init__(self, max_len: int = 32768):
        self.rope = RoPEScaling()
        self.window = SlidingWindow()
        self.compressor = ContextCompressor()
        self.max_len = max_len

    def process(self, tokens: List[int]) -> Dict:
        if len(tokens) > self.max_len:
            tokens = self.compressor.compress(tokens[:self.max_len])
        return {
            'tokens': tokens,
            'length': len(tokens),
            'windows': self.window.get_windows(len(tokens))
        }
