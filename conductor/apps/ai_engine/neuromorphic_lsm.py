"""
Liquid State Machine (LSM) Engine (Phase 111).
Neuromorphic engineering: Reservoir Computing with Spiking Neural Networks (SNN).
"""
import random
import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class LeakyIntegrateAndFireNeuron:
    """Simulates a biological Spiking Neuron (LIF model)."""
    def __init__(self, threshold: float = 1.0, decay: float = 0.9):
        self.voltage = 0.0
        self.threshold = threshold
        self.decay = decay
        self.has_spiked = False

    def update(self, current_input: float) -> bool:
        # Leak (decay)
        self.voltage *= self.decay
        
        # Integrate
        self.voltage += current_input
        
        # Fire
        if self.voltage >= self.threshold:
            self.has_spiked = True
            self.voltage = 0.0  # Reset after spike
        else:
            self.has_spiked = False
            
        return self.has_spiked


class LSMEngine:
    """
    Simulates a Liquid State Machine.
    1. Input signals are fed to a sparse, randomly connected "Liquid" (Reservoir) of spiking neurons.
    2. The complex dynamics of the liquid cast the temporal input into a high-dimensional spatial representation.
    3. A simple linear readout layer learns to interpret the current state of the liquid.
    """
    def __init__(self, input_dim: int = 5, reservoir_size: int = 50, output_dim: int = 2):
        self.input_dim = input_dim
        self.reservoir_size = reservoir_size
        self.output_dim = output_dim
        
        # Initialize the reservoir of Spiking Neurons
        self.neurons = [LeakyIntegrateAndFireNeuron(threshold=1.5, decay=0.8) for _ in range(reservoir_size)]
        
        # Sparse, fixed random connections WITHIN the reservoir (The "Liquid")
        # W_res[i][j] is connection from neuron j to neuron i
        self.W_res = [[0.0 for _ in range(reservoir_size)] for _ in range(reservoir_size)]
        for i in range(reservoir_size):
            for j in range(reservoir_size):
                if i != j and random.random() < 0.2: # 20% sparsity
                    # Mix of excitatory and inhibitory connections
                    self.W_res[i][j] = random.gauss(0, 0.5) 
                    
        # Fixed random connections from Input to Reservoir
        self.W_in = [[random.gauss(0, 1.0) for _ in range(input_dim)] for _ in range(reservoir_size)]
        
        # Learnable Readout Layer (The ONLY part that gets trained)
        self.W_out = [[random.gauss(0, 0.1) for _ in range(reservoir_size)] for _ in range(output_dim)]
        self.learning_rate = 0.01

    def _dot(self, v1: List[float], v2: List[float]) -> float:
        return sum(x * y for x, y in zip(v1, v2))

    def process_temporal_signal(self, sequence: List[List[float]], train: bool = True) -> Dict[str, Any]:
        """
        Simulates feeding a time-series sequence into the Liquid and training the readout.
        """
        seq_length = len(sequence)
        assert len(sequence[0]) == self.input_dim
        
        readout_outputs = []
        total_spikes_in_liquid = 0
        total_loss = 0.0
        
        # Simulate time steps
        for t in range(seq_length):
            current_input = sequence[t]
            current_spikes = [1.0 if n.has_spiked else 0.0 for n in self.neurons] # Spikes from time t-1
            
            # Update each neuron in the reservoir
            new_spikes = []
            for i in range(self.reservoir_size):
                # 1. Input stimulus
                stimulus = self._dot(self.W_in[i], current_input)
                
                # 2. Recurrent stimulus from the liquid's echo (lateral connections)
                echo = self._dot(self.W_res[i], current_spikes)
                
                # 3. Update Neuron
                spiked = self.neurons[i].update(stimulus + echo)
                new_spikes.append(1.0 if spiked else 0.0)
                
                if spiked:
                    total_spikes_in_liquid += 1
                    
            # The "State" of the liquid at time t is the vector of which neurons spiked
            liquid_state = new_spikes 
            
            # Readout Layer calculates output from the current liquid state
            output = [self._dot(row, liquid_state) for row in self.W_out]
            readout_outputs.append(output)
            
            # Simulate Training the Readout Layer (e.g., trying to predict a target wave)
            if train:
                # Mock target: Simply trying to compute a running sum of input feature 0
                target_val = sum(sequence[k][0] for k in range(max(0, t-3), t+1))
                target = [target_val, -target_val] 
                
                # Gradient descent on the Readout layer (Linear Regression essentially)
                for out_idx in range(self.output_dim):
                    error = output[out_idx] - target[out_idx]
                    total_loss += error**2
                    
                    for res_idx in range(self.reservoir_size):
                        # delta_w = -lr * error * input
                        self.W_out[out_idx][res_idx] -= self.learning_rate * error * liquid_state[res_idx]
                        
        avg_loss = total_loss / (seq_length * self.output_dim)
        
        return {
            "sequence_length": seq_length,
            "liquid_reservoir_size": self.reservoir_size,
            "total_reservoir_spikes": total_spikes_in_liquid,
            "average_spiking_rate": round(total_spikes_in_liquid / (seq_length * self.reservoir_size), 4),
            "readout_training_loss_mse": round(avg_loss, 4),
            "mechanics": "Reservoir Computing using a recurrent, untutored Spiking Neural Network liquid with a trained linear readout layer."
        }
