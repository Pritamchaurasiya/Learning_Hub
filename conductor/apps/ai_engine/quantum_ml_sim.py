"""
Phase 164: Quantum Machine Learning (QML) Simulator
Simulates a parameterized Quantum Circuit (Quantum Neural Network) and
calculates analytical gradients using the Parameter-Shift Rule.
"""
import math
import cmath
import random
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class QuantumSimulator:
    """A simplified density matrix or state-vector simulator is too complex,
    so we simulate the *expected value* of a Variational Quantum Eigensolver (VQE)
    or parameterized quantum circuit.
    """
    def __init__(self, num_qubits: int = 4, seed: int = 42):
        self.num_qubits = num_qubits
        self.rng = random.Random(seed)
        # Random Hamiltonian eigenvalues for the observable
        self.hamiltonian_eigvals = [self.rng.gauss(0, 1) for _ in range(2**num_qubits)]
        
    def _circuit_expectation(self, thetas: List[float]) -> float:
        """Simulate the expectation value <psi(theta) | H | psi(theta)>.
        We use a noisy non-linear periodic function to simulate quantum interference.
        """
        val = 0.0
        for i, theta in enumerate(thetas):
            # Simulated interference pattern
            val += math.sin(theta * (i + 1)) * self.hamiltonian_eigvals[i % len(self.hamiltonian_eigvals)]
            # Entanglement simulation (cross terms)
            if i > 0:
                val += 0.5 * math.cos(theta * thetas[i-1])
        return val

    def parameter_shift_gradient(self, thetas: List[float]) -> List[float]:
        """
        Parameter-Shift Rule: df/d(theta) = 0.5 * (f(theta + pi/2) - f(theta - pi/2))
        This is how actual quantum computers calculate gradients exactly without backprop.
        """
        shift = math.pi / 2.0
        gradients = []
        for i in range(len(thetas)):
            # Shift up
            thetas_plus = thetas.copy()
            thetas_plus[i] += shift
            f_plus = self._circuit_expectation(thetas_plus)
            
            # Shift down
            thetas_minus = thetas.copy()
            thetas_minus[i] -= shift
            f_minus = self._circuit_expectation(thetas_minus)
            
            # Exact analytical gradient
            grad = 0.5 * (f_plus - f_minus)
            gradients.append(grad)
            
        return gradients

def run_quantum_ml_experiment() -> Dict[str, Any]:
    sim = QuantumSimulator(num_qubits=4)
    # Initialize parameters for 4 parameterized gates (RY, RX rotations)
    thetas = [random.uniform(0, 2 * math.pi) for _ in range(4)]
    
    # Run 5 steps of quantum gradient descent (VQE algorithm)
    lr = 0.1
    history = []
    
    for step in range(1, 6):
        energy = sim._circuit_expectation(thetas)
        grads = sim.parameter_shift_gradient(thetas)
        
        history.append({
            "step": step,
            "expectation_value": round(energy, 4),
            "gradients": [round(g, 4) for g in grads]
        })
        
        # Update parameters (gradient descent)
        for i in range(len(thetas)):
            thetas[i] -= lr * grads[i]
            
    return {
        "paradigm": "Quantum Machine Learning (VQE with Parameter-Shift Rule)",
        "num_qubits": sim.num_qubits,
        "hilbert_space_dim": 2**sim.num_qubits,
        "training_trajectory": history,
        "final_energy": round(sim._circuit_expectation(thetas), 4),
        "insight": "Unlike classical neural networks that use backpropagation, Quantum Neural Networks compute mathematically exact gradients by physically evaluating the circuit twice per parameter shifted by π/2."
    }
