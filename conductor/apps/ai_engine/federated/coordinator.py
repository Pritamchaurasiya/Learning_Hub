import structlog
import uuid
import numpy as np
from typing import List, Dict

logger = structlog.get_logger(__name__)

class FederatedCoordinator:
    """
    Coordinates Federated Learning by aggregating model weights from client devices
    without accessing their local training data.
    """

    def __init__(self, model_id: str):
        self.model_id = model_id
        self.round_id = uuid.uuid4()
        self.pending_updates: List[Dict] = []
        self.global_weights = {} # Simulation of initial weights
        self.min_clients = 3

    def register_update(self, client_id: str, weights: Dict[str, np.array]):
        """
        Receives model gradients/weights from a client edge device.
        """
        logger.info(f"📥 Received FL update from client {client_id} for model {self.model_id}")
        self.pending_updates.append({
            "client_id": client_id,
            "weights": weights
        })
        
        if len(self.pending_updates) >= self.min_clients:
            self.aggregate_round()

    def aggregate_round(self):
        """
        Performs Federated Averaging (FedAvg) to create the new global model.
        """
        logger.info(f"🔄 Aggregating round {self.round_id} with {len(self.pending_updates)} clients...")
        
        # Simplified FedAvg simulation
        first_client = self.pending_updates[0]['weights']
        avg_weights = {k: np.zeros_like(v) for k, v in first_client.items()}
        
        count = len(self.pending_updates)
        for update in self.pending_updates:
            client_weights = update['weights']
            for k in avg_weights:
                avg_weights[k] += client_weights[k]
        
        # Divide by count to get average
        for k in avg_weights:
            avg_weights[k] = avg_weights[k] / count
            
        self.global_weights = avg_weights
        self.pending_updates = [] # Clear for next round
        self.round_id = uuid.uuid4()
        
        logger.info("✅ Global Model Updated. Broadcasting to Edge Nodes.")
        # Broadcast logic would go here
