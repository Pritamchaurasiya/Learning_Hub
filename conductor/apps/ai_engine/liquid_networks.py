"""
Liquid Time-Constant (LTC) Networks (Phase 93).
Continuous-time recurrent neural networks with state-dependent time constants.
"""
import math
import random
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-20, min(20, x))))


class LiquidNeuron:
    """
    A single neuron in a Liquid Time-Constant Network.
    Its time constant tau(x) and steady state x_inf change fluidly 
    based on the input it receives.
    """
    def __init__(self, tau_base: float = 1.0):
        self.tau_base = tau_base # Base time constant
        self.x = 0.0 # Current hidden state
        
    def step(self, I_in: float, I_rec: float, dt: float):
        """
        Euler integration step for the LTC neuron.
        dx/dt = -(x - x_leak)/tau(x) + Sum( f(x_j) * W_ji )
        For an LTC, incoming inputs acts as conductances, pulling state toward reversal potentials.
        """
        # Simplified LTC dynamics:
        # Time constant fluidly adapts to total incoming current
        total_current = I_in + I_rec
        
        # The core "Liquid" property: high input -> fast response (small tau), low input -> long memory (large tau)
        tau_fluid = self.tau_base / (1.0 + abs(total_current))
        
        # State equation
        dx = (-(self.x - 0.0) / tau_fluid + total_current) * dt
        self.x += dx


class LiquidNetworkEngine:
    """
    Phase 93: Liquid Time-Constant Networks.
    A continuous-time Recurrent Neural Network whose internal dynamics scale
    based on the input, allowing it to adapt to out-of-distribution time series.
    """
    
    def __init__(self, in_features: int, units: int, out_features: int):
        self.in_features = in_features
        self.units = units
        self.out_features = out_features
        
        # Initialize neurons with random base time constants
        self.neurons = [LiquidNeuron(tau_base=random.uniform(0.5, 5.0)) for _ in range(units)]
        
        # Input weights
        self.W_in = [[random.gauss(0, 0.1) for _ in range(in_features)] for _ in range(units)]
        
        # Recurrent weights
        self.W_rec = [[random.gauss(0, 0.1) for _ in range(units)] for _ in range(units)]
        
        # Output weights
        self.W_out = [[random.gauss(0, 0.1) for _ in range(units)] for _ in range(out_features)]
        
    def reset_state(self):
        """Wipes the hidden states for a new sequence."""
        for neuron in self.neurons:
            neuron.x = 0.0
            
    def process_sequence(self, sequence: List[List[float]], dt: float = 0.1) -> List[List[float]]:
        """
        Processes a whole sequence fluidly.
        sequence shape: (Time_steps, in_features)
        Returns: output sequence (Time_steps, out_features)
        """
        outputs = []
        
        for t_step, x_in in enumerate(sequence):
            # Compute input current to each unit
            I_in = [sum(self.W_in[i][j] * x_in[j] for j in range(self.in_features)) for i in range(self.units)]
            
            # Compute recurrent current from existing states (using sigmoid activation)
            current_states = [neuron.x for neuron in self.neurons]
            activated_states = [sigmoid(s) for s in current_states]
            
            I_rec = [sum(self.W_rec[i][j] * activated_states[j] for j in range(self.units)) for i in range(self.units)]
            
            # Integrate continuous dynamics fluidly structure for dt time
            # For demonstration, we assume inputs are held constant for duration dt 
            # and do 5 micro-steps of Euler integration to simulate continuous flow.
            micro_steps = 5
            micro_dt = dt / micro_steps
            
            for _ in range(micro_steps):
                for i in range(self.units):
                    # In true LTC, recurrent states update together. 
                    # We are approximating for simplicity.
                    self.neurons[i].step(I_in[i], I_rec[i], micro_dt)
                    
            # Compute final output at this macro time step
            new_activated = [sigmoid(neuron.x) for neuron in self.neurons]
            y_t = [sum(self.W_out[k][i] * new_activated[i] for i in range(self.units)) for k in range(self.out_features)]
            outputs.append(y_t)
            
        return outputs
