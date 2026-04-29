"""
Quantum Machine Learning (QML) Simulator (Phase 88).
Simulating Variational Quantum Eigensolvers (VQE) and Parameterized Quantum Circuits (PQC).
Note: This is a classical software simulation of a quantum process for educational purposes.
"""
import math
import random
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)


# --- Complex Number Math Utils for Simulation ---
class ComplexUnit:
    def __init__(self, real: float, imag: float):
        self.real = real
        self.imag = imag
        
    def __mul__(self, other: 'ComplexUnit') -> 'ComplexUnit':
        return ComplexUnit(
            self.real * other.real - self.imag * other.imag,
            self.real * other.imag + self.imag * other.real
        )
        
    def __add__(self, other: 'ComplexUnit') -> 'ComplexUnit':
        return ComplexUnit(self.real + other.real, self.imag + other.imag)
        
    def magnitude_squared(self) -> float:
        return self.real**2 + self.imag**2


class Qubit:
    """Represents a single quantum bit in superposition: a|0> + b|1>"""
    def __init__(self, alpha: ComplexUnit = ComplexUnit(1, 0), beta: ComplexUnit = ComplexUnit(0, 0)):
        # Normalize
        mag = alpha.magnitude_squared() + beta.magnitude_squared()
        self.alpha = ComplexUnit(alpha.real / math.sqrt(mag), alpha.imag / math.sqrt(mag))
        self.beta = ComplexUnit(beta.real / math.sqrt(mag), beta.imag / math.sqrt(mag))

    def measure(self) -> int:
        """Collapse the wave function and return 0 or 1"""
        prob_0 = self.alpha.magnitude_squared()
        return 0 if random.random() < prob_0 else 1


class QuantumSimulator:
    """
    Phase 88: Variational Quantum Simulator.
    Simulates a Parameterized Quantum Circuit (PQC) acting on a set of qubits.
    """
    
    def __init__(self, num_qubits: int):
        self.num_qubits = num_qubits
        
    def _apply_ry_gate(self, qubit: Qubit, theta: float) -> Qubit:
        """Applies a Rotation-Y gate by angle theta"""
        half_theta = theta / 2.0
        cos_t = math.cos(half_theta)
        sin_t = math.sin(half_theta)
        
        new_alpha = ComplexUnit(
            qubit.alpha.real * cos_t - qubit.beta.real * sin_t,
            qubit.alpha.imag * cos_t - qubit.beta.imag * sin_t
        )
        new_beta = ComplexUnit(
            qubit.alpha.real * sin_t + qubit.beta.real * cos_t,
            qubit.alpha.imag * sin_t + qubit.beta.imag * cos_t
        )
        return Qubit(new_alpha, new_beta)

    def run_variational_circuit(self, inputs: List[float], weights: List[float]) -> float:
        """
        Runs a PQC.
        inputs: Data mapped to rotation angles (Data Encoding).
        weights: Learnable parameters of the circuit.
        Returns: Expectation value (analogous to classical neural net output).
        """
        if len(inputs) != self.num_qubits or len(weights) != self.num_qubits:
            raise ValueError("Input and Weight arrays must match number of qubits.")
            
        qubits = [Qubit() for _ in range(self.num_qubits)] # Initialize to |0>
        
        # 1. Data Encoding (Feature Map)
        for i in range(self.num_qubits):
            # Encode data via Rx/Ry rotation 
            qubits[i] = self._apply_ry_gate(qubits[i], inputs[i])
            
        # 2. Parameterized Ansatz (Learnable Quantum Layers)
        for i in range(self.num_qubits):
            qubits[i] = self._apply_ry_gate(qubits[i], weights[i])
            
        # 3. Measurement (Expectation value calculation over many "shots")
        # In simulator, we can just calculate expected value directly from amplitudes.
        # Let's measure Pauli-Z on all qubits: expectation is sum of (P(0) - P(1))
        expectation = 0.0
        for q in qubits:
            prob_0 = q.alpha.magnitude_squared()
            prob_1 = q.beta.magnitude_squared()
            expectation += (prob_0 - prob_1) # Pauli-Z expectation
            
        return expectation / self.num_qubits


class QuantumMLModel:
    """
    Phase 88: Quantum Machine Learning Model (VQE architecture).
    Uses a classical optimizer to train a Parameterized Quantum Circuit.
    """
    
    def __init__(self, num_qubits: int):
        self.simulator = QuantumSimulator(num_qubits)
        self.weights = [random.uniform(0, 2 * math.pi) for _ in range(num_qubits)]
        
    def forward(self, features: List[float]) -> float:
        # Scale features to angle range [0, pi]
        scaled_features = [max(0.0, min(math.pi, f * math.pi)) for f in features]
        return self.simulator.run_variational_circuit(scaled_features, self.weights)
        
    def train_step(self, features: List[float], label: float, lr: float = 0.1) -> float:
        """
        Performs one step of parameter shift rule / gradient descent.
        """
        # Parameter Shift Rule to calculate gradient of quantum circuit
        # grad(theta) = 0.5 * (f(theta + pi/2) - f(theta - pi/2))
        shift = math.pi / 2.0
        
        loss_val = 0.0
        gradients = [0.0] * len(self.weights)
        
        # Base forward pass
        pred = self.forward(features)
        loss_val = (pred - label) ** 2
        
        for i in range(len(self.weights)):
            # Forward shift
            weights_fwd = list(self.weights)
            weights_fwd[i] += shift
            pred_fwd = self.simulator.run_variational_circuit(features, weights_fwd)
            
            # Backward shift
            weights_bwd = list(self.weights)
            weights_bwd[i] -= shift
            pred_bwd = self.simulator.run_variational_circuit(features, weights_bwd)
            
            # Gradient of output w.r.t parameter i
            grad_out = 0.5 * (pred_fwd - pred_bwd)
            
            # Chain rule: d(Loss)/d(weight) = 2 * (pred - label) * grad_out
            gradients[i] = 2.0 * (pred - label) * grad_out
            
        # Update weights
        for i in range(len(self.weights)):
            self.weights[i] -= lr * gradients[i]
            
        return loss_val
