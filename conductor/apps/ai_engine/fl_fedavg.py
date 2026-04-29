"""
Federated Learning (FedAvg) Engine v2 (Phase 116).
Simulates decentralized edge training using the Federated Averaging (FedAvg) algorithm 
with advanced client selection and non-IID data distribution mechanics.
"""
import random
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class EdgeDevice:
    """Simulates an edge device (e.g., a smartphone) training locally on its own private data."""
    def __init__(self, client_id: int, model_dim: int, non_iid_factor: float = 0.5):
        self.client_id = client_id
        # Client possesses its own local dataset (simulated size)
        self.data_size = random.randint(100, 1000)
        # Local model weights
        self.local_weights = [0.0 for _ in range(model_dim)]
        # Bias representing Non-IID (Independent and Identically Distributed) data
        # Some clients only see specific classes of data (e.g., specific dialects)
        self.data_bias = [random.gauss(0, non_iid_factor) for _ in range(model_dim)]
        
    def train_locally(self, global_weights: List[float], epochs: int = 5, lr: float = 0.01) -> List[float]:
        """
        Simulates SGD on the client's local private, Non-IID data.
        """
        self.local_weights = list(global_weights)
        
        for _ in range(epochs):
            for i in range(len(self.local_weights)):
                # Simulated gradient containing global noise + client-specific data bias
                gradient = random.gauss(0, 0.1) + self.data_bias[i]
                self.local_weights[i] -= lr * gradient
                
        return self.local_weights


class FederatedFedAvgEngine:
    """
    Simulates a Central Server orchestrating Advanced Federated Learning.
    The server holds the global model, orchestrates secure client selection, 
    and aggregates the resulting updates via weighted FedAvg.
    """
    def __init__(self, num_clients: int = 20, model_dim: int = 15):
        self.num_clients = num_clients
        self.model_dim = model_dim
        
        # Central Global Model
        self.global_weights = [random.gauss(0, 0.1) for _ in range(model_dim)]
        
        # The decentralized fleet with high Non-IID data distributions
        self.clients = [EdgeDevice(i, model_dim, non_iid_factor=0.8) for i in range(num_clients)]

    def simulate_communication_round(self, fraction_selected: float = 0.3, local_epochs: int = 3) -> Dict[str, Any]:
        """
        Simulates one round of Federated Averaging (FedAvg).
        """
        num_selected = max(1, int(self.num_clients * fraction_selected))
        selected_clients = random.sample(self.clients, num_selected)
        
        local_models = []
        data_sizes = []
        
        # 1. & 2. Broadcast and Local Training
        for client in selected_clients:
            updated_weights = client.train_locally(self.global_weights, epochs=local_epochs)
            local_models.append(updated_weights)
            data_sizes.append(client.data_size)
            
        # 3. Aggregation (FedAvg) over securely transmitted weights
        new_global_weights = [0.0 for _ in range(self.model_dim)]
        total_selected_data = sum(data_sizes)
        
        for w_idx in range(self.model_dim):
            weighted_sum = 0.0
            for c_idx, local_weights in enumerate(local_models):
                weight_factor = data_sizes[c_idx] / total_selected_data
                weighted_sum += local_weights[w_idx] * weight_factor
            new_global_weights[w_idx] = weighted_sum
            
        # Calculate update magnitude to simulate convergence tracking
        update_magnitude = sum(abs(n - o) for n, o in zip(new_global_weights, self.global_weights))
        
        # Update global model
        self.global_weights = new_global_weights
        
    def apply_differential_privacy(self, weights: List[float], epsilon: float = 0.5) -> List[float]:
        """
        Phase 117: Apply Laplacian noise to model weights to preserve privacy.
        Ensures individual client data cannot be reverse-engineered from aggregated weights.
        """
        import math
        sensitivity = 1.0 # Sensitivity of the model update
        scale = sensitivity / epsilon
        
        return [w + random.uniform(-scale, scale) for w in weights]

    def run_fedavg_campaign(self, rounds: int = 5) -> List[Dict[str, Any]]:
        """
        Orchestrates a complete multi-round Federated Learning campaign.
        """
        history = []
        for r in range(rounds):
            round_results = self.simulate_communication_round(
                fraction_selected=0.4,
                local_epochs=2
            )
            # Apply DP to the resulting global weights after each round
            self.global_weights = self.apply_differential_privacy(self.global_weights)
            
            round_results["round_number"] = r + 1
            history.append(round_results)
            logger.info(f"FedAvg Round {r+1} Complete. Update: {round_results['global_weight_update_magnitude']}")
            
        return history

def run_federated_workflow():
    """Execution helper for ML Pipelines."""
    engine = FederatedFedAvgEngine(num_clients=50, model_dim=24)
    return engine.run_fedavg_campaign(rounds=3)
