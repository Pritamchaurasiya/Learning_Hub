"""
Hierarchical Temporal Memory (HTM) Engine (Phase 112).
Numenta's Neocortex-inspired framework using Sparse Distributed Representations (SDR).
"""
import random
import logging
from typing import Dict, Any, List, Set

logger = logging.getLogger(__name__)


class MiniColumn:
    """Represents a cortical minicolumn containing multiple pyramidal cells."""
    def __init__(self, num_cells: int = 4):
        self.num_cells = num_cells
        # In HTM, each cell in a column has distal dendrites connecting to cells in OTHER columns
        # For this simulation, we'll abstract the connections at the column level for Sequence Memory
        self.active_cell_index = None
        self.predictive_cell_index = None

class HTMEngine:
    """
    Simulates a single layer of Hierarchical Temporal Memory.
    Focuses on the Spatial Pooler (generating SDRs) and Temporal Memory (Sequence Learning).
    """
    def __init__(self, input_bits: int = 400, num_columns: int = 2048, cells_per_column: int = 32):
        self.input_bits = input_bits
        self.num_columns = num_columns
        self.cells_per_column = cells_per_column
        
        # Spatial Pooler: Maps input bits to columns via proximal dendrites
        # Represented physically as a set of potential connections
        # W_sp[column][input_bit] -> permanence value (0.0 to 1.0)
        self.permanence_threshold = 0.5
        self.W_sp = []
        for _ in range(num_columns):
            # Connect column to ~50% of input bits randomly
            connections = [random.uniform(0.1, 0.9) if random.random() < 0.5 else 0.0 for _ in range(input_bits)]
            self.W_sp.append(connections)
            
        # Target sparsity for the SDR (e.g., 2% of columns active = ~40 columns)
        self.active_column_countTarget = int(self.num_columns * 0.02)
        
        # Temporal Memory (Transition matrix linking active columns over time to form predictions)
        # simplified: column_i -> column_j weight
        self.W_tm = [[0.0 for _ in range(num_columns)] for _ in range(num_columns)]
        
        self.prev_active_columns: List[int] = []

    def _spatial_pooling(self, input_vector: List[int]) -> List[int]:
        """
        Converts dense/raw input into a Sparse Distributed Representation (SDR).
        """
        column_overlaps = []
        for i in range(self.num_columns):
            overlap = 0
            for j in range(self.input_bits):
                # If input is active AND connection permanence is above threshold
                if input_vector[j] == 1 and self.W_sp[i][j] > self.permanence_threshold:
                    overlap += 1
            column_overlaps.append((overlap, i))
            
        # Global Inhibition: Only the top N columns with highest overlap fire
        column_overlaps.sort(reverse=True, key=lambda x: x[0])
        
        active_columns = [col_idx for overlap, col_idx in column_overlaps[:self.active_column_countTarget] if overlap > 0]
        
        # Hebbian Learning: Strengthen active connections, weaken inactive ones for the winning columns
        for col_idx in active_columns:
            for j in range(self.input_bits):
                if input_vector[j] == 1:
                    if self.W_sp[col_idx][j] > 0: # Only adjust potential synapses
                        self.W_sp[col_idx][j] = min(1.0, self.W_sp[col_idx][j] + 0.1)
                else:
                    if self.W_sp[col_idx][j] > 0:
                        self.W_sp[col_idx][j] = max(0.0, self.W_sp[col_idx][j] - 0.02)
                        
        return active_columns

    def process_sequence(self, num_steps: int = 10) -> Dict[str, Any]:
        """
        Simulates feeding a continuous stream of data into the HTM to learn sequences
        and generate anomaly scores.
        """
        anomaly_scores = []
        sdr_sparsities = []
        
        for step in range(num_steps):
            # 1. Simulate sensory input (e.g., A moving pattern)
            # 400 bits, maybe 20 are ON
            raw_input = [0] * self.input_bits
            start_idx = (step * 5) % self.input_bits
            for i in range(start_idx, min(start_idx + 20, self.input_bits)):
                raw_input[i] = 1
                
            # 2. Spatial Pooling (Generate SDR)
            active_cols = self._spatial_pooling(raw_input)
            
            sdr_sparsities.append(len(active_cols) / self.num_columns)
            
            # 3. Anomaly Detection
            # Compare what HTM *predicted* to happen (based on Temporal Memory) 
            # with what *actually* happened (current active columns)
            
            predicted_cols = set()
            for prev_col in self.prev_active_columns:
                for target_col in range(self.num_columns):
                    if self.W_tm[prev_col][target_col] > 0.5: # Prediction threshold
                        predicted_cols.add(target_col)
                        
            active_set = set(active_cols)
            
            # Anomaly Score = 1.0 - (Intersection / Active)
            # 0.0 means perfect prediction, 1.0 means complete surprise
            if len(active_set) > 0:
                correct_predictions = len(active_set.intersection(predicted_cols))
                anomaly_score = 1.0 - (correct_predictions / len(active_set))
            else:
                anomaly_score = 0.0
                
            anomaly_scores.append(anomaly_score)
            
            # 4. Temporal Memory Learning (Sequence Learning)
            # Form connections from previous active columns to current active columns
            if self.prev_active_columns:
                for past_col in self.prev_active_columns:
                    for curr_col in active_cols:
                        # Strengthen temporal synapse
                        self.W_tm[past_col][curr_col] = min(1.0, self.W_tm[past_col][curr_col] + 0.15)
                        
                    # Decay unused synapses from past_col
                    for target_col in range(self.num_columns):
                        if target_col not in active_cols:
                             self.W_tm[past_col][target_col] = max(0.0, self.W_tm[past_col][target_col] - 0.05)
            
            self.prev_active_columns = active_cols
            
        avg_anomaly = sum(anomaly_scores) / num_steps
        avg_sparsity = sum(sdr_sparsities) / num_steps
        
        return {
            "sequence_steps": num_steps,
            "average_sdr_sparsity": round(avg_sparsity, 4),
            "initial_anomaly_score": round(anomaly_scores[0], 4),
            "final_anomaly_score": round(anomaly_scores[-1], 4),
            "average_anomaly_score": round(avg_anomaly, 4),
            "mechanics": "Neocortical simulation using Spatial Pooling to generate Sparse Distributed Representations (SDR) and Temporal Memory for unsupervised sequence anomaly detection."
        }
