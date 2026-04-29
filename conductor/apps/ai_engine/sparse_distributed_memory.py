"""
Sparse Distributed Memory (Phase 94).
Ultra-high-dimensional associative memory model designed by Pentti Kanerva.
"""
import random
import math
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def hamming_distance(a: List[int], b: List[int]) -> int:
    """Computes the Hamming distance between two binary arrays."""
    return sum(1 for x, y in zip(a, b) if x != y)


class SparseDistributedMemory:
    """
    Kanerva's Sparse Distributed Memory (SDM).
    Uses a massive, high-dimensional binary address space where only a tiny fraction
    of possible addresses actually contain hardware "hard locations" (counters).
    Writing/reading happens within a Hamming radius of an address.
    """
    def __init__(self, address_dim: int, word_dim: int, num_hard_locations: int, activation_radius: int):
        self.address_dim = address_dim
        self.word_dim = word_dim
        self.num_hard_locations = num_hard_locations
        self.activation_radius = activation_radius
        
        # Initialize hard locations randomly in the binary space
        self.hard_addresses = [
            [random.choice([0, 1]) for _ in range(address_dim)] 
            for _ in range(num_hard_locations)
        ]
        
        # Word counters for each hard location: (num_hard_locations x word_dim)
        # Initiated to 0. Positive values mean '1', negative values mean '0'
        self.counters = [[0] * word_dim for _ in range(num_hard_locations)]
        
    def _find_active_locations(self, address: List[int]) -> List[int]:
        """Returns the indices of hard locations within the activation radius."""
        if len(address) != self.address_dim:
            raise ValueError("Address dimension mismatch.")
            
        active_indices = []
        for i, hard_addr in enumerate(self.hard_addresses):
            if hamming_distance(address, hard_addr) <= self.activation_radius:
                active_indices.append(i)
        return active_indices

    def write(self, address: List[int], data_word: List[int]):
        """
        Write a binary word into the memory distributed across 
        all active locations near the address.
        """
        if len(data_word) != self.word_dim:
            raise ValueError("Word dimension mismatch.")
            
        active_indices = self._find_active_locations(address)
        
        # If no hard locations are near, pick the absolute closest one to prevent complete failure
        if not active_indices:
            distances = [hamming_distance(address, h) for h in self.hard_addresses]
            min_dist = min(distances)
            active_indices = [i for i, d in enumerate(distances) if d == min_dist]
            
        for idx in active_indices:
            for bit_i in range(self.word_dim):
                # If bit is 1, increment counter. If bit is 0, decrement counter.
                if data_word[bit_i] == 1:
                    self.counters[idx][bit_i] += 1
                else:
                    self.counters[idx][bit_i] -= 1

    def read(self, address: List[int]) -> List[int]:
        """
        Read from memory by summing counters of all active locations near the address 
        and thresholding.
        """
        active_indices = self._find_active_locations(address)
        
        if not active_indices:
            # Fallback to nearest
            distances = [hamming_distance(address, h) for h in self.hard_addresses]
            min_dist = min(distances)
            active_indices = [i for i, d in enumerate(distances) if d == min_dist]
            
        # Sum counters across all active hard locations
        summed_counters = [0] * self.word_dim
        for idx in active_indices:
            for bit_i in range(self.word_dim):
                summed_counters[bit_i] += self.counters[idx][bit_i]
                
        # Threshold: if sum > 0 -> 1, otherwise 0
        read_word = [1 if c > 0 else 0 for c in summed_counters]
        return read_word


class SDMEngine:
    """
    Phase 94: Sparse Distributed Memory abstraction.
    Useful for storing robust, noise-resilient binary patterns for AI tracking.
    """
    def __init__(self, address_size: int = 256, word_size: int = 128, hard_locations: int = 1000):
        # We set an activation radius proportional to address size.
        # Kanerva mathematics suggest a radius that activates roughly sqrt(N) to log(N) locations
        # For small demo sizes, we use an empirical ratio 30-40% of dimensions.
        activation_radius = int(address_size * 0.35) 
        self.sdm = SparseDistributedMemory(address_size, word_size, hard_locations, activation_radius)
        
    def store_pattern(self, address: List[int], data: List[int]):
        self.sdm.write(address, data)
        
    def retrieve_pattern(self, address_cue: List[int]) -> List[int]:
        return self.sdm.read(address_cue)
