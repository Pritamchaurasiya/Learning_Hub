"""
Neuromorphic Computing Engine (Spiking Neural Networks)

Simulates brain-like computing:
1. Leaky Integrate-and-Fire (LIF) Neurons.
2. Event-based Spike processing.
3. Synaptic Plasticity (STDP).
"""

import logging
import random
from typing import Dict, List, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Spike:
    timestamp: int
    neuron_id: str


class LIFNeuron:
    """
    Leaky Integrate-and-Fire Neuron.
    """
    def __init__(self, id: str, threshold: float = 1.0, decay: float = 0.9):
        self.id = id
        self.potential = 0.0
        self.threshold = threshold
        self.decay = decay
        self.last_spike_time = -1

    def step(self, input_current: float, time: int) -> bool:
        """
        Update membrane potential. Returns True if spiked.
        """
        # Leak
        self.potential *= self.decay
        
        # Integrate
        self.potential += input_current
        
        # Fire
        if self.potential >= self.threshold:
            self.potential = 0.0 # Reset
            self.last_spike_time = time
            return True
        return False


class NeuromorphicNetwork:
    """
    Network of Spiking Neurons.
    """
    def __init__(self):
        self.neurons: Dict[str, LIFNeuron] = {}
        self.synapses: Dict[str, List[Tuple[str, float]]] = {} # pre_id -> [(post_id, weight)]
        
    def add_neuron(self, id: str):
        self.neurons[id] = LIFNeuron(id)
        
    def add_synapse(self, pre_id: str, post_id: str, weight: float):
        if pre_id not in self.synapses:
            self.synapses[pre_id] = []
        self.synapses[pre_id].append((post_id, weight))

    def run_tick(self, inputs: Dict[str, float], time: int) -> List[Spike]:
        """
        Simulate one time step.
        """
        spikes = []
        
        # 1. Process inputs and determine spikes
        active_neurons = set(inputs.keys())
        
        # Simple synchronous update (mock)
        current_inputs = inputs.copy()
        
        for nid, neuron in self.neurons.items():
            input_i = current_inputs.get(nid, 0.0)
            did_spike = neuron.step(input_i, time)
            
            if did_spike:
                spikes.append(Spike(time, nid))
                # Propagate to post-synaptic neurons for NEXT tick (simplified to immediate for demo)
                for post_id, weight in self.synapses.get(nid, []):
                    if post_id not in current_inputs:
                        current_inputs[post_id] = 0.0
                    current_inputs[post_id] += weight
                    
        # Apply STDP (Spike-Timing-Dependent Plasticity) Mock
        # Strengthen connections if Pre spikes just before Post
        self._apply_stdp(spikes, time)
        
        return spikes

    def _apply_stdp(self, spikes: List[Spike], time: int):
        """
        Adjust weights based on spike timing.
        """
        # Simplified: Just log learning event
        if len(spikes) > 1:
            logger.debug(f"STDP Learning: {len(spikes)} neurons spiked at {time}")
