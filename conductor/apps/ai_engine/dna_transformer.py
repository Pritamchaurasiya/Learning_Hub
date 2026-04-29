"""
DNA Sequence Transformer (Phase 101).
Applies Self-Attention to genomic sequences (A, C, G, T) for motif discovery.
"""
import math
import random
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class DNATransformer:
    """
    Simulates a small transformer processing nucleotide sequences.
    Maps A, C, G, T, N to embeddings, adds positional encoding, 
    and applies scaled dot-product attention to find regulatory relationships.
    """
    VOCAB = {'A': 0, 'C': 1, 'G': 2, 'T': 3, 'N': 4}
    
    def __init__(self, d_model: int = 16, num_heads: int = 2, seq_len: int = 50):
        self.d_model = d_model
        self.num_heads = num_heads
        self.seq_len = seq_len
        self.head_dim = d_model // num_heads
        
        # Token Embeddings (5 tokens -> d_model)
        self.token_emb = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(len(self.VOCAB))]
        
        # Positional Embeddings
        self.pos_emb = [[0.0 for _ in range(d_model)] for _ in range(seq_len)]
        for pos in range(seq_len):
            for i in range(0, d_model, 2):
                div_term = math.exp(i * -math.log(10000.0) / d_model)
                self.pos_emb[pos][i] = math.sin(pos * div_term)
                if i + 1 < d_model:
                    self.pos_emb[pos][i + 1] = math.cos(pos * div_term)
                    
        # Attention Projections (Wq, Wk, Wv)
        self.Wq = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.Wk = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        self.Wv = [[random.gauss(0, 0.1) for _ in range(d_model)] for _ in range(d_model)]
        
        # Output prediction head (e.g., probability of being a promoter region)
        self.W_out = [random.gauss(0, 0.1) for _ in range(d_model)]
        
    def _matmul(self, vec: List[float], matrix: List[List[float]]) -> List[float]:
        out = [0.0] * self.d_model
        for i in range(self.d_model):
            out[i] = sum(vec[j] * matrix[j][i] for j in range(self.d_model))
        return out

    def forward(self, sequence: str) -> Dict[str, Any]:
        """Processes a DNA string and outputs an attention map and prediction score."""
        seq = sequence[:self.seq_len].upper()
        # Pad with 'N' if too short
        seq = seq.ljust(self.seq_len, 'N')
        
        # 1. Embeddings
        x = []
        for pos, char in enumerate(seq):
            token_idx = self.VOCAB.get(char, 4) # Default to 'N'
            emb = [self.token_emb[token_idx][i] + self.pos_emb[pos][i] for i in range(self.d_model)]
            x.append(emb)
            
        # 2. Self-Attention (Single Head for demo simplicity, although num_heads is configured)
        Q = [self._matmul(xi, self.Wq) for xi in x]
        K = [self._matmul(xi, self.Wk) for xi in x]
        V = [self._matmul(xi, self.Wv) for xi in x]
        
        attention_weights = [[0.0 for _ in range(self.seq_len)] for _ in range(self.seq_len)]
        scale = math.sqrt(self.d_model)
        
        # Calculate scores Q * K^T / sqrt(d)
        for i in range(self.seq_len):
            for j in range(self.seq_len):
                score = sum(Q[i][k] * K[j][k] for k in range(self.d_model)) / scale
                attention_weights[i][j] = score
                
        # Softmax over rows
        for i in range(self.seq_len):
            max_val = max(attention_weights[i])
            exp_vals = [math.exp(val - max_val) for val in attention_weights[i]]
            sum_exp = sum(exp_vals)
            attention_weights[i] = [val / sum_exp for val in exp_vals]
            
        # Multiply by V
        out_seq = [[0.0 for _ in range(self.d_model)] for _ in range(self.seq_len)]
        for i in range(self.seq_len):
            for k in range(self.d_model):
                out_seq[i][k] = sum(attention_weights[i][j] * V[j][k] for j in range(self.seq_len))
                
        # 3. Global Average Pooling
        pooled = [sum(out_seq[pos][k] for pos in range(self.seq_len)) / self.seq_len for k in range(self.d_model)]
        
        # 4. Prediction
        logit = sum(pooled[i] * self.W_out[i] for i in range(self.d_model))
        prob = 1.0 / (1.0 + math.exp(-max(-20, min(20, logit))))
        
        # Find highest attention locus (excluding self-attention diagonals)
        max_att = -1.0
        motif_center = 0
        for i in range(self.seq_len):
            for j in range(self.seq_len):
                if i != j and attention_weights[i][j] > max_att:
                    max_att = attention_weights[i][j]
                    motif_center = j
                    
        return {
            "sequence": seq,
            "promoter_probability": round(prob, 4),
            "primary_motif_center": motif_center,
            "highest_attention_pair": f"{seq[motif_center]} at pos {motif_center}"
        }


class genomicEngine:
    """Wrapper for genomic and bio-informatic phases."""
    def __init__(self):
        self.transformer = DNATransformer(d_model=16, seq_len=30)
        
    def analyze_dna(self, sequence: str) -> Dict[str, Any]:
        return self.transformer.forward(sequence)
