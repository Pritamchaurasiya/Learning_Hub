"""
Drug-Target Interaction (DTI) Graph (Phase 104).
Heterogeneous bipartite Graph Neural Network for pharmaceutical repurposing.
"""
import random
import math
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class BipartiteGNN:
    """
    Simulates a Heterogeneous Graph Neural Network with two node types:
    Molecules (Drugs) and Proteins (Targets).
    Predicts missing edges (interactions/binding affinity) between them.
    """
    def __init__(self, num_drugs: int = 100, num_proteins: int = 50, emb_dim: int = 16):
        self.num_drugs = num_drugs
        self.num_proteins = num_proteins
        self.emb_dim = emb_dim
        
        # Node Embeddings
        self.drug_emb = [[random.gauss(0, 0.1) for _ in range(emb_dim)] for _ in range(num_drugs)]
        self.protein_emb = [[random.gauss(0, 0.1) for _ in range(emb_dim)] for _ in range(num_proteins)]
        
        # Transformation matrices for message passing
        self.W_drug_to_prot = [[random.gauss(0, 0.1) for _ in range(emb_dim)] for _ in range(emb_dim)]
        self.W_prot_to_drug = [[random.gauss(0, 0.1) for _ in range(emb_dim)] for _ in range(emb_dim)]
        
        # Edge prediction head: Bilinear W
        self.W_bilinear = [[random.gauss(0, 0.1) for _ in range(emb_dim)] for _ in range(emb_dim)]
        
    def _matmul(self, vec: List[float], matrix: List[List[float]]) -> List[float]:
        out = [0.0] * self.emb_dim
        for i in range(self.emb_dim):
            out[i] = sum(vec[j] * matrix[j][i] for j in range(self.emb_dim))
        return out
        
    def _relu(self, vec: List[float]) -> List[float]:
        return [max(0.0, v) for v in vec]

    def message_pass(self, known_interactions_adj: List[List[int]]):
        """
        One round of heterogeneous message passing.
        known_interactions_adj: size (num_drugs, num_proteins), values {0, 1}
        """
        new_drug_emb = [[0.0 for _ in range(self.emb_dim)] for _ in range(self.num_drugs)]
        new_prot_emb = [[0.0 for _ in range(self.emb_dim)] for _ in range(self.num_proteins)]
        
        # 1. Proteins aggregate from Drugs
        for p in range(self.num_proteins):
            neighborhood = []
            for d in range(self.num_drugs):
                if known_interactions_adj[d][p] == 1:
                    neighborhood.append(self.drug_emb[d])
                    
            if neighborhood:
                # Mean aggregation + Transform
                avg_msg = [sum(n[k] for n in neighborhood) / len(neighborhood) for k in range(self.emb_dim)]
                transformed = self._matmul(avg_msg, self.W_drug_to_prot)
                new_prot_emb[p] = self._relu([self.protein_emb[p][k] + transformed[k] for k in range(self.emb_dim)])
            else:
                new_prot_emb[p] = self.protein_emb[p]
                
        # 2. Drugs aggregate from Proteins
        for d in range(self.num_drugs):
            neighborhood = []
            for p in range(self.num_proteins):
                if known_interactions_adj[d][p] == 1:
                    neighborhood.append(self.protein_emb[p])
                    
            if neighborhood:
                avg_msg = [sum(n[k] for n in neighborhood) / len(neighborhood) for k in range(self.emb_dim)]
                transformed = self._matmul(avg_msg, self.W_prot_to_drug)
                new_drug_emb[d] = self._relu([self.drug_emb[d][k] + transformed[k] for k in range(self.emb_dim)])
            else:
                new_drug_emb[d] = self.drug_emb[d]
                
        # Update embeddings
        self.drug_emb = new_drug_emb
        self.protein_emb = new_prot_emb

    def predict_binding_affinity(self, drug_idx: int, prot_idx: int) -> float:
        """
        Bilinear prediction reading out edge probability.
        Probability = sigmoid( drug ^T W prot )
        """
        d_vec = self.drug_emb[drug_idx]
        p_vec = self.protein_emb[prot_idx]
        
        # d_vec ^T * W_bilinear
        temp = self._matmul(d_vec, self.W_bilinear)
        
        # temp * p_vec
        logit = sum(temp[k] * p_vec[k] for k in range(self.emb_dim))
        
        return 1.0 / (1.0 + math.exp(-max(-20, min(20, logit))))


class DTIEngine:
    """Drug-Target Interaction Graph."""
    def __init__(self, num_drugs: int = 100, num_proteins: int = 50):
        self.num_drugs = num_drugs
        self.num_proteins = num_proteins
        self.gnn = BipartiteGNN(num_drugs, num_proteins)
        
        # Random bipartite adjacency matrix (5% sparsity)
        self.adj = [[1 if random.random() < 0.05 else 0 for _ in range(num_proteins)] for _ in range(num_drugs)]
        
    def find_repurposing_candidates(self, drug_id: int, top_k: int = 3) -> Dict[str, Any]:
        """Runs message passing and predicts novel off-label targets for a drug."""
        if not (0 <= drug_id < self.num_drugs):
            raise ValueError("Invalid drug ID.")
            
        # Graph convolution
        self.gnn.message_pass(self.adj)
        
        # Predict all un-linked proteins
        predictions = []
        for p in range(self.num_proteins):
            if self.adj[drug_id][p] == 0:  # Only predict NEW interactions
                prob = self.gnn.predict_binding_affinity(drug_id, p)
                predictions.append({"target_protein_id": p, "binding_probability": round(prob, 4)})
                
        # Sort by highest probability
        predictions.sort(key=lambda x: x["binding_probability"], reverse=True)
        top_candidates = predictions[:top_k]
        
        return {
            "query_drug_id": drug_id,
            "known_targets_count": sum(self.adj[drug_id]),
            "novel_target_predictions": top_candidates,
            "mechanics": "Heterogeneous Bipartite Graph Convolution with Bilinear Edge Prediction."
        }
