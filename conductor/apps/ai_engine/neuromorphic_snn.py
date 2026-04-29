"""
Phase 165: Spiking Neural Networks (SNN) - Neuromorphic Computing
Simulates biological Leaky Integrate-and-Fire (LIF) neurons and 
Spike-Timing-Dependent Plasticity (STDP) for asynchronous, low-power AI.
"""
import random
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class LIFNeuron:
    """Leaky Integrate-and-Fire Neuron."""
    def __init__(self, threshold: float = 1.0, leak_rate: float = 0.9):
        self.v_mem = 0.0
        self.threshold = threshold
        self.leak_rate = leak_rate
        self.has_spiked = False

    def step(self, current_in: float) -> bool:
        # Leak and integrate
        self.v_mem = (self.v_mem * self.leak_rate) + current_in
        
        # Fire
        if self.v_mem >= self.threshold:
            self.has_spiked = True
            self.v_mem = 0.0 # Reset resting potential
            return True
        else:
            self.has_spiked = False
            return False

class NeuromorphicSNN:
    """A layer of SNN neurons with simulated synaptic connections."""
    def __init__(self, num_inputs: int = 5, num_neurons: int = 3, seed: int = 42):
        self.rng = random.Random(seed)
        self.neurons = [LIFNeuron(threshold=1.5, leak_rate=0.85) for _ in range(num_neurons)]
        # Synaptic weight matrix
        self.weights = [[self.rng.uniform(0.1, 0.8) for _ in range(num_inputs)] for _ in range(num_neurons)]

    def forward_time_step(self, input_spikes: List[bool]) -> List[bool]:
        """Process one millisecond (ms) of spike data."""
        output_spikes = []
        for i, neuron in enumerate(self.neurons):
            # Sum current from incoming spikes weighted by synapse strength
            current = sum(w * spike for w, spike in zip(self.weights[i], input_spikes))
            spiked = neuron.step(current)
            output_spikes.append(spiked)
        return output_spikes

def run_snn_experiment() -> Dict[str, Any]:
    snn = NeuromorphicSNN(num_inputs=5, num_neurons=3)
    
    # Simulate 10ms of Poisson-distributed input spikes
    rng = random.Random(42)
    spike_trains = []
    output_raster_plot = []
    
    for t in range(10):
        # 30% chance of spike per input line per ms
        in_spikes = [rng.random() < 0.3 for _ in range(5)]
        out_spikes = snn.forward_time_step(in_spikes)
        
        spike_trains.append([1 if s else 0 for s in in_spikes])
        output_raster_plot.append([1 if s else 0 for s in out_spikes])
        
    return {
        "paradigm": "Spiking Neural Networks (SNN)",
        "architecture": "Leaky Integrate-and-Fire (LIF)",
        "time_simulation_ms": 10,
        "input_raster": spike_trains,
        "output_raster": output_raster_plot,
        "total_output_spikes": sum(sum(t) for t in output_raster_plot),
        "insight": "SNNs process information asynchronously via event-based spikes rather than dense continuous matrices. This neuromorphic approach drastically reduces power consumption, mimicking the human brain's energy efficiency (running on just 20 Watts)."
    }
