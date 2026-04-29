"""
Transformer / Self-Attention Engine (NumPy Accelerated)

Production-grade implementation:
1. Scaled Dot-Product Attention
2. Multi-Head Attention
3. Layer Normalization
4. Position-wise Feed-Forward Network
5. Full Encoder Block with Residual Connections
"""

import logging
import math
import numpy as np
from typing import List, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class LayerNorm:
    """
    Layer Normalization: Normalizes across features (last dim).
    LN(x) = gamma * (x - mean) / sqrt(var + eps) + beta
    """
    def __init__(self, d_model: int, eps: float = 1e-6):
        self.gamma = np.ones(d_model)
        self.beta = np.zeros(d_model)
        self.eps = eps
    
    def forward(self, x: np.ndarray) -> np.ndarray:
        mean = x.mean(axis=-1, keepdims=True)
        std = x.std(axis=-1, keepdims=True)
        return self.gamma * (x - mean) / (std + self.eps) + self.beta


class PositionalEncoding:
    """
    Sinusoidal positional encoding for sequence position awareness.
    PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
    PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
    """
    @classmethod
    def encode(cls, seq_len: int, d_model: int) -> np.ndarray:
        pe = np.zeros((seq_len, d_model))
        position = np.arange(seq_len)[:, np.newaxis]
        div_term = np.exp(np.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = np.sin(position * div_term)
        pe[:, 1::2] = np.cos(position * div_term)
        return pe


class ScaledDotProductAttention:
    """
    Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
    
    Supports optional attention mask for decoder/padding.
    """
    @classmethod
    def forward(
        cls, 
        Q: np.ndarray, 
        K: np.ndarray, 
        V: np.ndarray,
        mask: Optional[np.ndarray] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Args:
            Q: Query [batch, seq_len, d_k] or [seq_len, d_k]
            K: Key [batch, seq_len, d_k] or [seq_len, d_k]
            V: Value [batch, seq_len, d_v] or [seq_len, d_v]
            mask: Optional mask [seq_len, seq_len]
        
        Returns:
            output: Attended values
            attention_weights: Attention distribution
        """
        d_k = K.shape[-1]
        
        # QK^T / sqrt(d_k)
        scores = np.matmul(Q, K.swapaxes(-2, -1)) / math.sqrt(d_k)
        
        # Apply mask (set masked positions to -inf before softmax)
        if mask is not None:
            scores = np.where(mask == 0, -1e9, scores)
        
        # Softmax
        attention_weights = cls._softmax(scores)
        
        # Weighted sum of values
        output = np.matmul(attention_weights, V)
        
        return output, attention_weights
    
    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        exp_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=-1, keepdims=True)


class MultiHeadAttention:
    """
    Multi-Head Attention: Parallel attention heads with learned projections.
    
    MHA(Q, K, V) = Concat(head_1, ..., head_h) W^O
    where head_i = Attention(Q W^Q_i, K W^K_i, V W^V_i)
    """
    def __init__(self, d_model: int = 512, n_heads: int = 8, dropout: float = 0.1):
        assert d_model % n_heads == 0, "d_model must be divisible by n_heads"
        
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads
        self.dropout = dropout
        
        # Xavier initialization for weight matrices
        scale = np.sqrt(2.0 / (d_model + self.d_k))
        self.W_Q = np.random.randn(d_model, d_model) * scale
        self.W_K = np.random.randn(d_model, d_model) * scale
        self.W_V = np.random.randn(d_model, d_model) * scale
        self.W_O = np.random.randn(d_model, d_model) * scale

    def forward(
        self, 
        query: np.ndarray, 
        key: np.ndarray, 
        value: np.ndarray,
        mask: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Args:
            query: [seq_len, d_model]
            key: [seq_len, d_model]
            value: [seq_len, d_model]
        
        Returns:
            output: [seq_len, d_model]
        """
        seq_len = query.shape[0]
        
        # Linear projections
        Q = query @ self.W_Q  # [seq_len, d_model]
        K = key @ self.W_K
        V = value @ self.W_V
        
        # Reshape to [n_heads, seq_len, d_k]
        Q = Q.reshape(seq_len, self.n_heads, self.d_k).transpose(1, 0, 2)
        K = K.reshape(seq_len, self.n_heads, self.d_k).transpose(1, 0, 2)
        V = V.reshape(seq_len, self.n_heads, self.d_k).transpose(1, 0, 2)
        
        # Apply attention to each head
        head_outputs = []
        attention_weights = []
        for h in range(self.n_heads):
            out, attn = ScaledDotProductAttention.forward(Q[h], K[h], V[h], mask)
            head_outputs.append(out)
            attention_weights.append(attn)
        
        # Concatenate heads: [seq_len, d_model]
        concat = np.concatenate(head_outputs, axis=-1)
        
        # Final linear projection
        output = concat @ self.W_O
        
        return output


class FeedForward:
    """
    Position-wise Feed-Forward Network.
    FFN(x) = max(0, xW1 + b1)W2 + b2
    
    Typically d_ff = 4 * d_model
    """
    def __init__(self, d_model: int = 512, d_ff: int = 2048, dropout: float = 0.1):
        scale1 = np.sqrt(2.0 / (d_model + d_ff))
        scale2 = np.sqrt(2.0 / (d_ff + d_model))
        
        self.W1 = np.random.randn(d_model, d_ff) * scale1
        self.b1 = np.zeros(d_ff)
        self.W2 = np.random.randn(d_ff, d_model) * scale2
        self.b2 = np.zeros(d_model)
        self.dropout = dropout

    def forward(self, x: np.ndarray) -> np.ndarray:
        """
        Args:
            x: [seq_len, d_model]
        Returns:
            output: [seq_len, d_model]
        """
        # First linear + ReLU
        hidden = np.maximum(0, x @ self.W1 + self.b1)
        
        # Second linear
        output = hidden @ self.W2 + self.b2
        
        return output


class EncoderBlock:
    """
    Transformer Encoder Block:
    1. Multi-Head Self-Attention + Residual + LayerNorm
    2. Feed-Forward Network + Residual + LayerNorm
    """
    def __init__(self, d_model: int = 512, n_heads: int = 8, d_ff: int = 2048, dropout: float = 0.1):
        self.self_attention = MultiHeadAttention(d_model, n_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        self.norm1 = LayerNorm(d_model)
        self.norm2 = LayerNorm(d_model)
        self.dropout = dropout
    
    def forward(self, x: np.ndarray, mask: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Args:
            x: [seq_len, d_model]
            mask: Optional attention mask
        
        Returns:
            output: [seq_len, d_model]
        """
        # Self-attention with residual
        attn_output = self.self_attention.forward(x, x, x, mask)
        x = self.norm1.forward(x + attn_output)
        
        # Feed-forward with residual
        ff_output = self.feed_forward.forward(x)
        x = self.norm2.forward(x + ff_output)
        
        return x


class TransformerEncoder:
    """
    Full Transformer Encoder stack.
    """
    def __init__(
        self, 
        n_layers: int = 6,
        d_model: int = 512, 
        n_heads: int = 8, 
        d_ff: int = 2048,
        max_seq_len: int = 512,
        dropout: float = 0.1
    ):
        self.d_model = d_model
        self.layers = [EncoderBlock(d_model, n_heads, d_ff, dropout) for _ in range(n_layers)]
        self.positional_encoding = PositionalEncoding.encode(max_seq_len, d_model)
        self.norm = LayerNorm(d_model)
    
    def forward(self, x: np.ndarray, mask: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Args:
            x: Input embeddings [seq_len, d_model]
            mask: Optional attention mask
        
        Returns:
            output: Encoded representations [seq_len, d_model]
        """
        seq_len = x.shape[0]
        
        # Add positional encoding
        x = x + self.positional_encoding[:seq_len]
        
        # Pass through encoder layers
        for layer in self.layers:
            x = layer.forward(x, mask)
        
        # Final normalization
        x = self.norm.forward(x)
        
        return x


def create_causal_mask(seq_len: int) -> np.ndarray:
    """Creates causal (look-ahead) mask for decoder self-attention."""
    mask = np.tril(np.ones((seq_len, seq_len)))
    return mask


def demo_transformer():
    """Demo: Process a sequence through transformer encoder."""
    print("=== Transformer Encoder Demo ===")
    
    # Parameters
    seq_len = 10
    d_model = 64
    n_heads = 4
    
    # Random input embeddings
    x = np.random.randn(seq_len, d_model)
    
    # Create encoder
    encoder = TransformerEncoder(
        n_layers=2,
        d_model=d_model,
        n_heads=n_heads,
        d_ff=256,
        max_seq_len=100
    )
    
    # Forward pass
    output = encoder.forward(x)
    
    print(f"Input shape: {x.shape}")
    print(f"Output shape: {output.shape}")
    print(f"Output mean: {output.mean():.4f}, std: {output.std():.4f}")
    
    # Test with causal mask
    mask = create_causal_mask(seq_len)
    masked_output = encoder.forward(x, mask)
    print(f"Masked output shape: {masked_output.shape}")


if __name__ == "__main__":
    demo_transformer()
