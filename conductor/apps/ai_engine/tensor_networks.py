"""
Tensor Networks (Matrix Product States) (Phase 97).
Quantum-inspired linear algebra structures for extreme dimensionality reduction.
"""
import random
import math
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def random_tensor_3d(d1: int, d2: int, d3: int) -> List[List[List[float]]]:
    """Helper to generate a random 3D tensor."""
    return [[[random.gauss(0, 0.1) for _ in range(d3)] for _ in range(d2)] for _ in range(d1)]

def tensor_contraction_1d(T1: List[List[List[float]]], T2: List[List[List[float]]]) -> List[List[List[float]]]:
    """
    Contracts two 3D rank-3 tensors along their joint bond dimension.
    T1 shape: [left_bond, physical1, shared_bond]
    T2 shape: [shared_bond, physical2, right_bond]
    Output shape: [left_bond, physical1 * physical2, right_bond]
    """
    left_b = len(T1)
    phys1 = len(T1[0])
    shared = len(T1[0][0])
    
    phys2 = len(T2[0])
    right_b = len(T2[0][0])
    
    out = [[[0.0 for _ in range(right_b)] for _ in range(phys1 * phys2)] for _ in range(left_b)]
    
    for l in range(left_b):
        for r in range(right_b):
            for p1 in range(phys1):
                for p2 in range(phys2):
                    combined_p = p1 * phys2 + p2
                    
                    # Sum over the shared bond
                    val = 0.0
                    for s in range(shared):
                        val += T1[l][p1][s] * T2[s][p2][r]
                    
                    out[l][combined_p][r] = val
                    
    return out


class MatrixProductState:
    """
    Simulates a Matrix Product State (MPS) or Tensor Train (TT).
    A highly compressed representation of an exponentially large vector
    using a chain of low-rank tensors.
    """
    def __init__(self, num_sites: int, physical_dim: int, bond_dim: int):
        self.num_sites = num_sites
        self.physical_dim = physical_dim
        self.bond_dim = bond_dim
        
        # Initialize a chain of tensors
        # The edges (first and last) have bond dimension 1 on the outside to close the train
        self.tensors = []
        
        for i in range(num_sites):
            left_dim = 1 if i == 0 else bond_dim
            right_dim = 1 if i == num_sites - 1 else bond_dim
            self.tensors.append(random_tensor_3d(left_dim, physical_dim, right_dim))
            
    def compute_amplitude(self, indices: List[int]) -> float:
        """
        Computes the amplitude (value) of the massive uncompressed vector
        at the specific multi-index `indices`.
        Indices must be length `num_sites`, each value in [0, physical_dim-1].
        """
        if len(indices) != self.num_sites:
            raise ValueError("Indices length must match num_sites.")
            
        # Multiply matrices chain: A_1(i_1) * A_2(i_2) * ... * A_N(i_N)
        # Start with the vector from the first site (shape: 1 x bond_dim)
        current_vec = self.tensors[0][0][indices[0]]  # List of size right_dim (which is bond_dim)
        
        for site in range(1, self.num_sites):
            matrix = self.tensors[site]  # shape: [left_dim, physical_dim, right_dim]
            selected_slice = [matrix[l][indices[site]] for l in range(len(matrix))] # shape: [left_dim, right_dim]
            
            # Vector-Matrix multiplication
            next_vec = [0.0] * len(selected_slice[0]) # size: right_dim
            for r in range(len(next_vec)):
                for l in range(len(current_vec)):
                    next_vec[r] += current_vec[l] * selected_slice[l][r]
                    
            current_vec = next_vec
            
        # The final vector should be length 1, so return the scalar
        return current_vec[0]


class TensorNetworkEngine:
    """
    Phase 97: Tensor Network (MPS) Engine.
    Used for massive dimensionality reduction and extracting entanglement/correlation
    structures in data without exponential memory explosion.
    """
    def __init__(self, sites: int = 10, phys_dim: int = 2, bond_dim: int = 4):
        self.mps = MatrixProductState(sites, phys_dim, bond_dim)
        
    def evaluate_configuration(self, config: List[int]) -> float:
        """Evaluates a single state configuration."""
        return self.mps.compute_amplitude(config)
        
    def get_info(self) -> Dict[str, Any]:
        """Returns compression metrics."""
        # Uncompressed size: phys_dim ^ sites
        uncompressed_params = self.mps.physical_dim ** self.mps.num_sites
        
        # Compressed size: roughly (sites-2) * phys * bond^2 + 2 * phys * bond
        compressed_params = sum(len(t) * len(t[0]) * len(t[0][0]) for t in self.mps.tensors)
        
        ratio = uncompressed_params / compressed_params if compressed_params > 0 else 0
        
        return {
            "sites": self.mps.num_sites,
            "physical_dimension": self.mps.physical_dim,
            "bond_dimension": self.mps.bond_dim,
            "uncompressed_parameters": uncompressed_params,
            "compressed_parameters": compressed_params,
            "compression_ratio": round(ratio, 2)
        }
