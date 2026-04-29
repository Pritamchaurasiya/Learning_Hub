"""
Spiking Neural Networks (SNN) Module (Phase 91).
Simulates Leaky Integrate-and-Fire (LIF) neurons and Spike-Timing-Dependent Plasticity (STDP).
"""
import random
import math
import logging
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)


class LIFNeuron:
    """
    Leaky Integrate-and-Fire (LIF) Neuron Model.
    Accumulates voltage over time. If voltage exceeds threshold, it fires a spike.
    Otherwise, voltage leaks (decays) towards resting potential.
    """
    
    def __init__(self, tau_m: float = 20.0, v_rest: float = -65.0, v_reset: float = -65.0, v_thresh: float = -50.0):
        self.tau_m = tau_m       # Membrane time constant
        self.v_rest = v_rest     # Resting potential
        self.v_reset = v_reset   # Reset potential after spike
        self.v_thresh = v_thresh # Spike threshold
        
        self.v = v_rest          # Current membrane voltage
        self.last_spike_time = -1.0
        
    def step(self, current: float, dt: float, current_time: float) -> bool:
        """
        Euler integration step for the LIF neuron.
        dv/dt = -(v - v_rest) / tau_m + current
        """
        # Leak and accumulation
        dv = (-(self.v - self.v_rest) / self.tau_m + current) * dt
        self.v += dv
        
        spike = False
        if self.v >= self.v_thresh:
            spike = True
            self.v = self.v_reset
            self.last_spike_time = current_time
            
        return spike


class SynapseSTDP:
    """
    Synapse with Spike-Timing-Dependent Plasticity (STDP).
    Weights strengthen if pre-synaptic spike precedes post-synaptic spike.
    Weights weaken if post-synaptic spike precedes pre-synaptic spike.
    """
    def __init__(self, weight: float, w_max: float = 1.0, A_plus: float = 0.01, A_minus: float = 0.012, tau_stdp: float = 20.0):
        self.weight = weight
        self.w_max = w_max
        self.A_plus = A_plus
        self.A_minus = A_minus
        self.tau_stdp = tau_stdp
        
    def update_weight(self, t_pre: float, t_post: float):
        """Update synaptic weight based on spike timing difference."""
        if t_pre < 0 or t_post < 0:
            return  # Need both spikes to have occurred
            
        delta_t = t_post - t_pre
        
        if delta_t > 0:
            # Pre before Post -> Long Term Potentiation (LTP)
            dw = self.A_plus * math.exp(-delta_t / self.tau_stdp)
        elif delta_t < 0:
            # Post before Pre -> Long Term Depression (LTD)
            dw = -self.A_minus * math.exp(delta_t / self.tau_stdp) # Note delta_t is negative here
        else:
            dw = 0.0
            
        self.weight = max(0.0, min(self.w_max, self.weight + dw))


class SNNEngine:
    """
    Phase 91: Spiking Neural Network (SNN) Engine using STDP.
    A bio-realistic neural network where information is encoded in spike timing,
    capable of extremely energy-efficient unsupervised learning.
    """
    def __init__(self, n_inputs: int, n_neurons: int):
        self.n_inputs = n_inputs
        self.n_neurons = n_neurons
        
        # Layer of LIF neurons
        self.neurons = [LIFNeuron() for _ in range(n_neurons)]
        
        # All-to-all synaptic connections (inputs -> neurons)
        # Random initial weights
        self.synapses = [[SynapseSTDP(random.uniform(0.1, 0.5)) for _ in range(n_inputs)] for _ in range(n_neurons)]
        
    def simulate(self, input_spike_trains: List[List[float]], duration_ms: float, dt: float = 1.0) -> Dict:
        """
        Simulate the SNN over time.
        input_spike_trains: List of spike times for each input channel.
                            e.g. [[10.0, 25.0], [5.0, 30.0], ...]
        """
        n_steps = int(duration_ms / dt)
        
        # Track output spikes
        output_spikes = {i: [] for i in range(self.n_neurons)}
        
        for step in range(n_steps):
            current_time = step * dt
            
            # Determine which inputs spike at this exact time step
            active_inputs = []
            for i, train in enumerate(input_spike_trains):
                # Check if this input has a spike in the current window [t, t+dt)
                if any(current_time <= t < current_time + dt for t in train):
                    active_inputs.append(i)
                    
            # Update each neuron
            for j, neuron in enumerate(self.neurons):
                # Calculate injected current from active synapses
                input_current = 0.0
                for i in active_inputs:
                    input_current += self.synapses[j][i].weight * 50.0 # Scaling factor for current
                    
                # Integrate and fire
                spiked = neuron.step(input_current, dt, current_time)
                
                if spiked:
                    output_spikes[j].append(current_time)
                    
                    # STDP Weight Update (Post-synaptic spike occurred)
                    for i in range(self.n_inputs):
                        # Find the most recent pre-synaptic spike for this input
                        recent_pre_spikes = [t for t in input_spike_trains[i] if t <= current_time]
                        if recent_pre_spikes:
                            t_pre = max(recent_pre_spikes)
                            self.synapses[j][i].update_weight(t_pre, current_time)
                            
        # Calculate summary metrics
        total_spikes = sum(len(spikes) for spikes in output_spikes.values())
        avg_weight = sum(s.weight for row in self.synapses for s in row) / (self.n_inputs * self.n_neurons)
        
        return {
            "duration_ms": duration_ms,
            "total_output_spikes": total_spikes,
            "average_synaptic_weight": round(avg_weight, 4),
            "output_spike_trains": output_spikes
        }
