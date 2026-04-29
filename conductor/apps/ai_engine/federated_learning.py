import math
import random
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class FederatedClient:
    """
    Phase 68: Edge Device / Local Client simulator.
    
    Represents a student's personal laptop or phone.
    Data never leaves this client. Only model weights are shared.
    """
    def __init__(self, client_id: str, local_data: List[Dict]):
        self.client_id = client_id
        self.local_data = local_data # List of {'x': [features], 'y': target_val}
        
    def train_locally(self, global_weights: List[float], learning_rate: float = 0.01, epochs: int = 1) -> List[float]:
        """
        Simulate a local SGD training loop over the client's private data.
        Returns the updated local weights (gradient delta).
        We use a simple linear regression model for the simulation.
        """
        local_w = list(global_weights)
        dim = len(local_w)
        
        for _ in range(epochs):
            for record in self.local_data:
                x = record['x']
                y_true = record['y']
                
                # f(x) = w * x
                y_pred = sum(w * f for w, f in zip(local_w, x))
                
                # Loss = (y_pred - y_true)^2
                # dL/dw_i = 2 * (y_pred - y_true) * x_i
                error = y_pred - y_true
                
                # SGD Update
                for i in range(dim):
                    local_w[i] -= learning_rate * error * x[i]
                    
        return local_w


class FedAvgServer:
    """
    Phase 68: Federated Averaging (FedAvg) Aggregator.
    
    Coordinates the decentralized training.
    1. Broadcast global weights to all clients.
    2. Wait for local training to finish.
    3. Aggregate (average) the resulting weights to form the new global model.
    """
    def __init__(self, num_features: int, seed_str: str):
        self.num_features = num_features
        seed = hash(seed_str) % (2**31)
        rng = random.Random(seed)
        
        # Initial Global Weights ~ N(0, 0.1)
        self.global_weights = [rng.gauss(0, 0.1) for _ in range(num_features)]
        
    def _aggregate(self, client_weights: List[List[float]], client_sizes: List[int]) -> List[float]:
        """
        FedAvg: Weighted average of local model weights based on dataset size.
        """
        total_samples = sum(client_sizes)
        if total_samples == 0:
            return self.global_weights
            
        aggregated_w = [0.0] * self.num_features
        
        for weights, n_samples in zip(client_weights, client_sizes):
            weight_factor = n_samples / total_samples
            for i in range(self.num_features):
                aggregated_w[i] += weights[i] * weight_factor
                
        return aggregated_w
        
    def run_federated_round(self, clients: List[FederatedClient], local_epochs: int = 2) -> Dict:
        """
        Execute one complete round of Federated Communication.
        """
        client_updates = []
        data_sizes = []
        
        # 1. Edge Devices Train Locally
        for client in clients:
            if not client.local_data:
                continue
            
            # Broadcast global weights to client -> Train -> Get updated weights
            updated_w = client.train_locally(self.global_weights, epochs=local_epochs)
            
            client_updates.append(updated_w)
            data_sizes.append(len(client.local_data))
            
        # 2. Server Aggregation
        new_global_weights = self._aggregate(client_updates, data_sizes)
        
        # Calculate Delta (How much the global model shifted)
        shift = math.sqrt(sum((new - old)**2 for new, old in zip(new_global_weights, self.global_weights)))
        
        # Update server state
        self.global_weights = new_global_weights
        
        return {
            "participating_clients": len(client_updates),
            "total_federated_samples_trained": sum(data_sizes),
            "global_weight_shift_magnitude": round(shift, 4),
            "new_global_weights": [round(w, 4) for w in self.global_weights]
        }
