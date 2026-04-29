"""
Phase 145: Transformer Architecture from Scratch (Educational)

A complete, pure-Python implementation of "Attention Is All You Need" (Vaswani 2017).
This is the architecture that powers GPT, BERT, Gemini, T5, and every modern LLM.

Architecture:
  Input Tokens → Positional Encoding → N × [MultiHeadSelfAttention → FFN → LayerNorm + Residual] → Output

Why this matters:
  Understanding Transformers from first principles lets you debug, optimize, and innovate
  on top of the architecture that dominates all of AI.
"""
import math
import random
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def layer_norm(x: List[float], eps: float = 1e-5) -> List[float]:
    """
    Layer Normalization: centers and scales activations.
    LN(x) = (x - μ) / √(σ² + ε) 
    Critical for training stability in deep Transformers.
    """
    mean = sum(x) / len(x)
    var = sum((xi - mean) ** 2 for xi in x) / len(x)
    std = math.sqrt(var + eps)
    return [(xi - mean) / std for xi in x]


def gelu(x: float) -> float:
    """
    Gaussian Error Linear Unit — the activation function used in GPT/BERT.
    GELU(x) = x · Φ(x) ≈ 0.5x(1 + tanh(√(2/π)(x + 0.044715x³)))
    Unlike ReLU, GELU has a smooth, non-zero gradient everywhere.
    """
    return 0.5 * x * (1 + math.tanh(math.sqrt(2.0 / math.pi) * (x + 0.044715 * x ** 3)))


class PositionalEncoding:
    """
    Sinusoidal Position Encoding — tells the Transformer WHERE each token is.
    
    Without this, a Transformer treats "Dog bites man" and "Man bites dog" identically!
    
    PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
    PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
    
    Why sin/cos? They allow the model to attend to relative positions because
    PE(pos+k) can be expressed as a linear function of PE(pos).
    """
    def __init__(self, d_model: int, max_len: int = 512):
        self.d_model = d_model
        self.encodings: List[List[float]] = []
        
        for pos in range(max_len):
            pe = [0.0] * d_model
            for i in range(0, d_model, 2):
                div_term = math.pow(10000.0, (2 * i) / d_model)
                pe[i] = math.sin(pos / div_term)
                if i + 1 < d_model:
                    pe[i + 1] = math.cos(pos / div_term)
            self.encodings.append(pe)
    
    def encode(self, seq_len: int) -> List[List[float]]:
        """Get positional encodings for a sequence."""
        return [self.encodings[i] for i in range(seq_len)]


class MultiHeadSelfAttention:
    """
    Multi-Head Self-Attention — the core mechanism of the Transformer.
    
    Instead of one attention function, we run H independent attention heads in parallel,
    each looking at different aspects of the input (syntax, semantics, position, etc.).
    
    MultiHead(Q,K,V) = Concat(head_1, ..., head_h) W^O
    where head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)
    
    Attention(Q,K,V) = softmax(QK^T / √d_k) V
    """
    def __init__(self, d_model: int, n_heads: int, seed: int = 0):
        assert d_model % n_heads == 0, "d_model must be divisible by n_heads"
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        
        rng = random.Random(seed)
        scale = math.sqrt(2.0 / d_model)
        
        # Projection matrices for Q, K, V (all heads concatenated)
        self.W_q = [[rng.gauss(0, scale) for _ in range(d_model)] for _ in range(d_model)]
        self.W_k = [[rng.gauss(0, scale) for _ in range(d_model)] for _ in range(d_model)]
        self.W_v = [[rng.gauss(0, scale) for _ in range(d_model)] for _ in range(d_model)]
        self.W_o = [[rng.gauss(0, scale) for _ in range(d_model)] for _ in range(d_model)]
    
    def _linear(self, W: List[List[float]], x: List[float]) -> List[float]:
        return [sum(W[i][j] * x[j] for j in range(len(x))) for i in range(len(W))]
    
    def _softmax(self, logits: List[float]) -> List[float]:
        max_val = max(logits) if logits else 0
        exp_vals = [math.exp(x - max_val) for x in logits]
        total = sum(exp_vals)
        return [e / (total + 1e-10) for e in exp_vals]
    
    def forward(self, x_seq: List[List[float]], causal_mask: bool = False) -> List[List[float]]:
        """
        Forward pass through multi-head self-attention.
        
        Args:
            x_seq: Input sequence [seq_len, d_model]
            causal_mask: If True, apply causal mask (for autoregressive generation)
        """
        seq_len = len(x_seq)
        
        # Project to Q, K, V
        Q = [self._linear(self.W_q, x) for x in x_seq]
        K = [self._linear(self.W_k, x) for x in x_seq]
        V = [self._linear(self.W_v, x) for x in x_seq]
        
        # Process each head independently
        all_head_outputs = []
        for h in range(self.n_heads):
            start = h * self.d_head
            end = start + self.d_head
            
            # Extract head-specific Q, K, V
            Q_h = [q[start:end] for q in Q]
            K_h = [k[start:end] for k in K]
            V_h = [v[start:end] for v in V]
            
            # Scaled Dot-Product Attention per head
            head_output = []
            for i in range(seq_len):
                scores = []
                for j in range(seq_len):
                    # QK^T / sqrt(d_k)
                    score = sum(Q_h[i][d] * K_h[j][d] for d in range(self.d_head))
                    score /= math.sqrt(self.d_head)
                    
                    # Causal mask: prevent attending to future positions
                    if causal_mask and j > i:
                        score = -1e9
                    
                    scores.append(score)
                
                # Softmax attention weights
                attn_weights = self._softmax(scores)
                
                # Weighted sum of values
                out = [0.0] * self.d_head
                for j in range(seq_len):
                    for d in range(self.d_head):
                        out[d] += attn_weights[j] * V_h[j][d]
                
                head_output.append(out)
            
            all_head_outputs.append(head_output)
        
        # Concatenate all heads
        concat_output = []
        for i in range(seq_len):
            concatenated = []
            for h in range(self.n_heads):
                concatenated.extend(all_head_outputs[h][i])
            concat_output.append(concatenated)
        
        # Final linear projection W_O
        output = [self._linear(self.W_o, c) for c in concat_output]
        return output


class FeedForwardNetwork:
    """
    Position-wise Feed-Forward Network.
    
    FFN(x) = GELU(x W1 + b1) W2 + b2
    
    The hidden dimension is typically 4x the model dimension.
    This is where the "memorization" capacity of a Transformer lives.
    """
    def __init__(self, d_model: int, d_ff: int, seed: int = 0):
        self.d_model = d_model
        self.d_ff = d_ff
        
        rng = random.Random(seed)
        scale = math.sqrt(2.0 / (d_model + d_ff))
        
        self.W1 = [[rng.gauss(0, scale) for _ in range(d_ff)] for _ in range(d_model)]
        self.b1 = [0.0] * d_ff
        self.W2 = [[rng.gauss(0, scale) for _ in range(d_model)] for _ in range(d_ff)]
        self.b2 = [0.0] * d_model
    
    def forward(self, x: List[float]) -> List[float]:
        # First linear + GELU
        hidden = [0.0] * self.d_ff
        for j in range(self.d_ff):
            val = self.b1[j]
            for i in range(self.d_model):
                val += x[i] * self.W1[i][j]
            hidden[j] = gelu(val)
        
        # Second linear
        output = [0.0] * self.d_model
        for j in range(self.d_model):
            val = self.b2[j]
            for i in range(self.d_ff):
                val += hidden[i] * self.W2[i][j]
            output[j] = val
        
        return output


class TransformerBlock:
    """
    A single Transformer Block — the repeating unit stacked N times.
    
    Pre-Norm Architecture (used in GPT-2+, LLaMA, Gemini):
      x → LayerNorm → MultiHeadAttention → + Residual
        → LayerNorm → FeedForward → + Residual
    
    The residual connections are critical:
    without them, gradients vanish in deep networks (>6 layers).
    """
    def __init__(self, d_model: int, n_heads: int, d_ff: int, block_id: int = 0):
        self.mha = MultiHeadSelfAttention(d_model, n_heads, seed=block_id * 100)
        self.ffn = FeedForwardNetwork(d_model, d_ff, seed=block_id * 200)
        self.d_model = d_model
    
    def forward(self, x_seq: List[List[float]], causal: bool = False) -> List[List[float]]:
        """Process sequence through one Transformer block."""
        seq_len = len(x_seq)
        
        # Sub-layer 1: Multi-Head Self-Attention + Residual
        normed = [layer_norm(x) for x in x_seq]
        attn_out = self.mha.forward(normed, causal_mask=causal)
        x_seq = [
            [x_seq[i][d] + attn_out[i][d] for d in range(self.d_model)]
            for i in range(seq_len)
        ]
        
        # Sub-layer 2: Feed-Forward Network + Residual
        normed = [layer_norm(x) for x in x_seq]
        ffn_out = [self.ffn.forward(n) for n in normed]
        x_seq = [
            [x_seq[i][d] + ffn_out[i][d] for d in range(self.d_model)]
            for i in range(seq_len)
        ]
        
        return x_seq


class MiniTransformer:
    """
    A complete Transformer Encoder — built from scratch, no frameworks.
    
    This is a miniature version of the architecture that powers:
    - BERT (bidirectional, no causal mask)
    - GPT (autoregressive, causal mask)
    - T5, PaLM, Gemini (encoder-decoder variants)
    """
    def __init__(self, d_model: int = 16, n_heads: int = 4, n_layers: int = 2, 
                 d_ff: int = 64, max_seq_len: int = 128):
        self.d_model = d_model
        self.n_layers = n_layers
        self.pos_enc = PositionalEncoding(d_model, max_seq_len)
        
        self.blocks = [
            TransformerBlock(d_model, n_heads, d_ff, block_id=i)
            for i in range(n_layers)
        ]
    
    def forward(self, token_embeddings: List[List[float]], causal: bool = False) -> List[List[float]]:
        """
        Full forward pass through the Transformer.
        
        Args:
            token_embeddings: [seq_len, d_model] — pre-embedded input tokens
            causal: Whether to apply causal masking (GPT-style)
        """
        seq_len = len(token_embeddings)
        
        # Add positional encoding
        pos = self.pos_enc.encode(seq_len)
        x = [
            [token_embeddings[i][d] + pos[i][d] for d in range(self.d_model)]
            for i in range(seq_len)
        ]
        
        # Pass through N Transformer blocks
        for block in self.blocks:
            x = block.forward(x, causal=causal)
        
        # Final layer norm
        x = [layer_norm(xi) for xi in x]
        
        return x
    
    def run_experiment(self, seq_len: int = 8) -> Dict[str, Any]:
        """Run a Transformer forward pass and return analytics."""
        # Generate random token embeddings
        rng = random.Random(42)
        embeddings = [[rng.gauss(0, 1) for _ in range(self.d_model)] for _ in range(seq_len)]
        
        output = self.forward(embeddings, causal=True)
        
        # Compute output statistics
        flat = [v for row in output for v in row]
        mean_act = sum(flat) / len(flat)
        max_act = max(flat)
        min_act = min(flat)
        
        return {
            "architecture": f"Transformer-{self.n_layers}L-{self.d_model}D",
            "sequence_length": seq_len,
            "output_shape": f"[{seq_len}, {self.d_model}]",
            "activation_stats": {
                "mean": round(mean_act, 4),
                "max": round(max_act, 4),
                "min": round(min_act, 4),
            },
            "total_params_estimate": self.n_layers * (4 * self.d_model**2 + 2 * self.d_model * 64),
            "insight": "This is a miniature version of the same architecture powering GPT-4, Gemini, and BERT."
        }


def run_transformer_experiment() -> Dict[str, Any]:
    """Execution helper for ML pipeline."""
    transformer = MiniTransformer(d_model=16, n_heads=4, n_layers=3, d_ff=64)
    return transformer.run_experiment(seq_len=6)
