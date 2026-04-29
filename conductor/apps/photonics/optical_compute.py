"""
Photonic Computing Simulator

Simulates optical computing components:
1. Optical Matrix-Vector Multiplication.
2. Mach-Zehnder Interferometers.
3. Photon propagation.
"""

import logging
import math
import cmath
from typing import List, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PhotonState:
    """
    Represents a single photon's state.
    amplitude: Complex amplitude.
    phase: Phase angle in radians.
    """
    amplitude: complex
    phase: float


class MachZehnderInterferometer:
    """
    Simulates an MZI optical element.
    Two paths interfere based on phase difference.
    """
    
    @classmethod
    def propagate(cls, input_amplitude: complex, phase_shift: float) -> Tuple[complex, complex]:
        """
        Split input, apply phase to one arm, recombine.
        Returns (output_0, output_1) port amplitudes.
        """
        # 50/50 beam splitter
        split_factor = 1 / math.sqrt(2)
        arm1 = input_amplitude * split_factor
        arm2 = input_amplitude * split_factor
        
        # Apply phase to arm2
        arm2 *= cmath.exp(1j * phase_shift)
        
        # Recombine
        out0 = split_factor * (arm1 + arm2)
        out1 = split_factor * (arm1 - arm2)
        
        return out0, out1


class OpticalMatrixMultiplier:
    """
    Performs matrix-vector multiplication using optical interference.
    This simulates photonic tensor cores.
    """
    
    @classmethod
    def multiply(cls, matrix: List[List[float]], vector: List[float]) -> List[float]:
        """
        Optical MVM: Uses phase-encoding principle (simplified simulation).
        """
        # Encode vector as optical amplitudes
        optical_vector = [complex(v, 0) for v in vector]
        
        result = []
        for row in matrix:
            # Each row is a set of MZI phase shifts
            accumulated = complex(0, 0)
            for i, weight in enumerate(row):
                # Phase encode weight
                phase = weight * math.pi # Map [-1,1] to [-pi, pi]
                out0, out1 = MachZehnderInterferometer.propagate(optical_vector[i] if i < len(optical_vector) else 0j, phase)
                accumulated += out0
            # Detect (measure intensity)
            intensity = abs(accumulated) ** 2
            result.append(intensity)
            
        return result


class PhotonicNeuralLayer:
    """
    Optical implementation of a neural network layer.
    """
    
    def __init__(self, weights: List[List[float]]):
        self.weights = weights

    def forward(self, inputs: List[float]) -> List[float]:
        """
        Optical forward pass.
        """
        linear = OpticalMatrixMultiplier.multiply(self.weights, inputs)
        # Nonlinearity via optical saturable absorber (mock)
        activated = [math.tanh(x) for x in linear]
        return activated
