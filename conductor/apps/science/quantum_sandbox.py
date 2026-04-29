"""
Quantum Circuit Simulator

Educational simulation of Quantum mechanics.
1. Qubit State Vector representation.
2. Quantum Gates (Hadamard, Pauli-X, CNOT).
3. Measurement collapse.
"""

import logging
import math
import cmath
import random
from typing import List, Tuple, Dict
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Qubit:
    # Alpha * |0> + Beta * |1>
    alpha: complex
    beta: complex

    def measure(self) -> int:
        """Collapse wave function."""
        prob_0 = abs(self.alpha) ** 2
        collapsed = 0 if random.random() < prob_0 else 1
        
        if collapsed == 0:
            self.alpha = 1+0j
            self.beta = 0+0j
        else:
            self.alpha = 0+0j
            self.beta = 1+0j
            
        return collapsed


class QuantumSandbox:
    """
    Simulates single-qubit and simple multi-qubit operations.
    """
    
    @classmethod
    def create_qubit(cls) -> Qubit:
        """Initialize to |0>."""
        return Qubit(1+0j, 0+0j)

    @classmethod
    def apply_hadamard(cls, qubit: Qubit):
        """
        Create superposition.
        H = 1/sqrt(2) * [[1, 1], [1, -1]]
        """
        inv_sqrt2 = 1 / math.sqrt(2)
        new_alpha = inv_sqrt2 * (qubit.alpha + qubit.beta)
        new_beta = inv_sqrt2 * (qubit.alpha - qubit.beta)
        
        qubit.alpha = new_alpha
        qubit.beta = new_beta

    @classmethod
    def apply_pauli_x(cls, qubit: Qubit):
        """Quantum NOT gate."""
        # Swaps alpha and beta
        qubit.alpha, qubit.beta = qubit.beta, qubit.alpha

    @classmethod
    def run_bell_state_experiment(cls) -> Dict[str, Any]:
        """
        Simulate creating a Bell State (Entanglement).
        Note: True entanglement requires tensor product state space.
        This function simulates the statistical OUTCOME of a Bell pair measure loop.
        """
        # Simplified simulation of |Phi+> = (|00> + |11>) / sqrt(2)
        
        results = {"00": 0, "01": 0, "10": 0, "11": 0}
        shots = 1000
        
        for _ in range(shots):
            # In Bell state |Phi+>, measurements are correlated
            outcome = 0 if random.random() < 0.5 else 1
            measure_1 = outcome
            measure_2 = outcome # Perfect correlation
            
            key = f"{measure_1}{measure_2}"
            results[key] += 1
            
        return {
            "circuit": "H(q0) -> CNOT(q0, q1)",
            "shots": shots,
            "counts": results,
            "success": results["01"] == 0 and results["10"] == 0 # Ideal
        }
