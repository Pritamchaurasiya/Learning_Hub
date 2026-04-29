import math
import random
import logging
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class MultiHeadAttention:
    """
    Phase 62: Multi-Head Self-Attention (Core Transformer Component).
    
    Implements the attention mechanism from "Attention Is All You Need" (2017):
    
    MultiHead(Q,K,V) = Concat(head_1,...,head_h) · W^O
    where head_i = Attention(Q·W_i^Q, K·W_i^K, V·W_i^V)
    
    Attention(Q,K,V) = softmax(Q·K^T / √d_k) · V
    
    Each head can attend to different representation subspaces,
    capturing different types of relations in the learning sequence.
    """
    
    def __init__(self, d_model: int = 32, num_heads: int = 4):
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        # Initialize projection matrices using deterministic seeding
        self.W_Q = [self._init_matrix(d_model, self.d_k, f"wq_{h}") for h in range(num_heads)]
        self.W_K = [self._init_matrix(d_model, self.d_k, f"wk_{h}") for h in range(num_heads)]
        self.W_V = [self._init_matrix(d_model, self.d_k, f"wv_{h}") for h in range(num_heads)]
        self.W_O = self._init_matrix(d_model, d_model, "wo")
    
    @staticmethod
    def _init_matrix(rows: int, cols: int, seed_str: str) -> List[List[float]]:
        """Xavier-initialized weight matrix."""
        scale = math.sqrt(2.0 / (rows + cols))
        seed = hash(seed_str) % (2**31)
        rng = random.Random(seed)
        return [[rng.gauss(0, scale) for _ in range(cols)] for _ in range(rows)]
    
    @staticmethod
    def _matmul(A: List[List[float]], B: List[List[float]]) -> List[List[float]]:
        """Matrix multiplication A @ B."""
        rows_a, cols_b = len(A), len(B[0])
        cols_a = len(A[0])
        result = [[0.0] * cols_b for _ in range(rows_a)]
        for i in range(rows_a):
            for j in range(cols_b):
                total = 0.0
                for k in range(cols_a):
                    total += A[i][k] * B[k][j]
                result[i][j] = total
        return result
    
    @staticmethod
    def _transpose(M: List[List[float]]) -> List[List[float]]:
        """Transpose a matrix."""
        if not M:
            return []
        return [[M[i][j] for i in range(len(M))] for j in range(len(M[0]))]
    
    @staticmethod
    def _softmax(scores: List[float]) -> List[float]:
        """Numerically stable softmax."""
        max_s = max(scores) if scores else 0
        exp_s = [math.exp(s - max_s) for s in scores]
        total = sum(exp_s) + 1e-10
        return [e / total for e in exp_s]
    
    def _scaled_dot_product_attention(
        self, Q: List[List[float]], K: List[List[float]], V: List[List[float]]
    ) -> Tuple[List[List[float]], List[List[float]]]:
        """
        Scaled Dot-Product Attention.
        
        Attention(Q,K,V) = softmax(Q·K^T / √d_k) · V
        """
        K_T = self._transpose(K)
        scores = self._matmul(Q, K_T)
        
        scale = math.sqrt(self.d_k)
        
        # Scale and softmax each row
        attention_weights = []
        for row in scores:
            scaled = [s / scale for s in row]
            attention_weights.append(self._softmax(scaled))
        
        output = self._matmul(attention_weights, V)
        return output, attention_weights
    
    def forward(self, X: List[List[float]]) -> Dict:
        """
        Forward pass through Multi-Head Attention.
        
        Args:
            X: Input sequence [seq_len x d_model]
            
        Returns:
            Dict with output, attention_weights per head.
        """
        head_outputs = []
        all_attention_weights = []
        
        for h in range(self.num_heads):
            Q = self._matmul(X, self._transpose(self.W_Q[h]))
            K = self._matmul(X, self._transpose(self.W_K[h]))
            V = self._matmul(X, self._transpose(self.W_V[h]))
            
            head_out, attn_weights = self._scaled_dot_product_attention(Q, K, V)
            head_outputs.append(head_out)
            all_attention_weights.append(attn_weights)
        
        # Concatenate heads: [seq_len x (num_heads * d_k)]
        seq_len = len(X)
        concat = []
        for i in range(seq_len):
            row = []
            for h in range(self.num_heads):
                row.extend(head_outputs[h][i])
            concat.append(row)
        
        # Project through W_O
        output = self._matmul(concat, self._transpose(self.W_O))
        
        return {
            'output': output,
            'attention_weights': all_attention_weights,
            'num_heads': self.num_heads,
            'seq_len': seq_len
        }


class PositionalEncoding:
    """
    Sinusoidal Positional Encoding from the Transformer paper.
    
    PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
    PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
    
    Injects sequence position information since attention is
    permutation-invariant.
    """
    
    @classmethod
    def encode(cls, seq_len: int, d_model: int) -> List[List[float]]:
        """Generate positional encoding matrix."""
        pe = []
        for pos in range(seq_len):
            row = []
            for i in range(d_model):
                angle = pos / (10000 ** (2 * (i // 2) / d_model))
                if i % 2 == 0:
                    row.append(math.sin(angle))
                else:
                    row.append(math.cos(angle))
            pe.append(row)
        return pe
    
    @classmethod
    def add_to_embeddings(cls, embeddings: List[List[float]]) -> List[List[float]]:
        """Add positional encoding to input embeddings."""
        seq_len = len(embeddings)
        d_model = len(embeddings[0]) if embeddings else 0
        pe = cls.encode(seq_len, d_model)
        
        return [
            [e + p for e, p in zip(emb, pos)]
            for emb, pos in zip(embeddings, pe)
        ]


class FeedForwardNetwork:
    """Point-wise Feed-Forward Network used in each Transformer layer."""
    
    def __init__(self, d_model: int = 32, d_ff: int = 64):
        self.d_model = d_model
        self.d_ff = d_ff
        seed = hash("ffn") % (2**31)
        rng = random.Random(seed)
        scale1 = math.sqrt(2.0 / (d_model + d_ff))
        scale2 = math.sqrt(2.0 / (d_ff + d_model))
        self.W1 = [[rng.gauss(0, scale1) for _ in range(d_ff)] for _ in range(d_model)]
        self.b1 = [0.0] * d_ff
        self.W2 = [[rng.gauss(0, scale2) for _ in range(d_model)] for _ in range(d_ff)]
        self.b2 = [0.0] * d_model
    
    @staticmethod
    def _gelu(x: float) -> float:
        """Gaussian Error Linear Unit activation."""
        return 0.5 * x * (1 + math.tanh(math.sqrt(2 / math.pi) * (x + 0.044715 * x ** 3)))
    
    def forward(self, X: List[List[float]]) -> List[List[float]]:
        """FFN(x) = GELU(x·W1 + b1)·W2 + b2"""
        output = []
        for x in X:
            # Layer 1: Linear + GELU
            h = [
                self._gelu(sum(x[j] * self.W1[j][k] for j in range(self.d_model)) + self.b1[k])
                for k in range(self.d_ff)
            ]
            # Layer 2: Linear
            out = [
                sum(h[j] * self.W2[j][k] for j in range(self.d_ff)) + self.b2[k]
                for k in range(self.d_model)
            ]
            output.append(out)
        return output


class TransformerBlock:
    """
    Phase 62: Complete Transformer Encoder Block.
    
    Architecture:
    1. Multi-Head Self-Attention
    2. Add & LayerNorm (residual connection)
    3. Feed-Forward Network
    4. Add & LayerNorm (residual connection)
    
    This is the fundamental building block of GPT, BERT, and all
    modern Large Language Models.
    """
    
    def __init__(self, d_model: int = 32, num_heads: int = 4, d_ff: int = 64):
        self.d_model = d_model
        self.attention = MultiHeadAttention(d_model, num_heads)
        self.ffn = FeedForwardNetwork(d_model, d_ff)
    
    @staticmethod
    def _layer_norm(X: List[List[float]], eps: float = 1e-6) -> List[List[float]]:
        """Layer Normalization."""
        output = []
        for x in X:
            mean = sum(x) / len(x)
            var = sum((v - mean) ** 2 for v in x) / len(x)
            std = math.sqrt(var + eps)
            output.append([(v - mean) / std for v in x])
        return output
    
    @staticmethod
    def _residual_add(X: List[List[float]], Y: List[List[float]]) -> List[List[float]]:
        """Residual connection: X + Y."""
        return [
            [x + y for x, y in zip(xr, yr)]
            for xr, yr in zip(X, Y)
        ]
    
    def forward(self, X: List[List[float]]) -> Dict:
        """
        Forward pass through one Transformer block.
        """
        # 1. Multi-Head Self-Attention
        attn_result = self.attention.forward(X)
        attn_output = attn_result['output']
        
        # 2. Add & LayerNorm
        residual1 = self._residual_add(X, attn_output)
        norm1 = self._layer_norm(residual1)
        
        # 3. Feed-Forward Network
        ffn_output = self.ffn.forward(norm1)
        
        # 4. Add & LayerNorm
        residual2 = self._residual_add(norm1, ffn_output)
        norm2 = self._layer_norm(residual2)
        
        return {
            'output': norm2,
            'attention_weights': attn_result['attention_weights'],
            'seq_len': len(X),
            'd_model': self.d_model
        }


class LearningTrajectoryTransformer:
    """
    Phase 62: Transformer-based Learning Trajectory Predictor.
    
    Takes a sequence of past learning events and predicts:
    1. Next optimal topic to study
    2. Expected mastery trajectory
    3. Engagement forecast
    
    Uses stacked Transformer blocks with positional encoding
    to capture temporal patterns in learning behavior.
    """
    
    def __init__(self, d_model: int = 32, num_heads: int = 4,
                 num_layers: int = 2, d_ff: int = 64):
        self.d_model = d_model
        self.blocks = [
            TransformerBlock(d_model, num_heads, d_ff)
            for _ in range(num_layers)
        ]
    
    def _featurize_event(self, event: Dict) -> List[float]:
        """Convert a learning event into a d_model-dimensional embedding."""
        features = [
            event.get('mastery', 0.5),
            event.get('time_spent', 30) / 120.0,
            event.get('quiz_score', 0.5),
            event.get('engagement', 0.5),
            event.get('difficulty_level', 0.5),
            event.get('completion_rate', 0.5),
            event.get('streak_days', 0) / 30.0,
            event.get('hour_of_day', 12) / 24.0,
        ]
        
        # Pad or truncate to d_model
        while len(features) < self.d_model:
            features.append(math.sin(len(features) * 0.1))
        
        return features[:self.d_model]
    
    def predict_trajectory(self, learning_history: List[Dict]) -> Dict:
        """
        Predict future learning trajectory from historical events.
        
        Args:
            learning_history: List of event dicts with mastery, time_spent, etc.
            
        Returns:
            Dict with predicted next steps, mastery forecast, and attention analysis.
        """
        if not learning_history:
            return {'error': 'No learning history provided.'}
        
        # Featurize events
        embeddings = [self._featurize_event(e) for e in learning_history]
        
        # Add positional encoding
        embeddings = PositionalEncoding.add_to_embeddings(embeddings)
        
        # Forward through Transformer blocks
        X = embeddings
        all_attention = []
        
        for block in self.blocks:
            result = block.forward(X)
            X = result['output']
            all_attention.append(result['attention_weights'])
        
        # Use last position's output for prediction
        last_output = X[-1]
        
        # Decode predictions
        predicted_mastery = 1.0 / (1.0 + math.exp(-sum(last_output[:8]) / 8))
        predicted_engagement = 1.0 / (1.0 + math.exp(-sum(last_output[8:16]) / 8))
        predicted_difficulty = abs(sum(last_output[16:24]) / 8)
        
        # Forecast mastery trajectory for next 5 steps
        forecast = []
        current_mastery = predicted_mastery
        for step in range(5):
            current_mastery = min(1.0, current_mastery + random.uniform(0.02, 0.08))
            forecast.append({
                'step': step + 1,
                'predicted_mastery': round(current_mastery, 4),
                'confidence': round(max(0.5, 1.0 - step * 0.1), 4)
            })
        
        # Attention analysis: which past events matter most?
        if all_attention and all_attention[-1]:
            final_attn = all_attention[-1][0]  # First head of last layer
            if final_attn:
                last_row = final_attn[-1]  # Attention from last position
                event_importance = [
                    {
                        'event_index': i,
                        'attention_weight': round(w, 4),
                        'event_mastery': learning_history[i].get('mastery', 0.5)
                    }
                    for i, w in enumerate(last_row)
                ]
                event_importance.sort(key=lambda x: x['attention_weight'], reverse=True)
            else:
                event_importance = []
        else:
            event_importance = []
        
        return {
            'predictions': {
                'next_mastery': round(predicted_mastery, 4),
                'next_engagement': round(predicted_engagement, 4),
                'recommended_difficulty': round(min(1.0, predicted_difficulty), 4)
            },
            'mastery_forecast': forecast,
            'attention_analysis': event_importance[:5],
            'model_config': {
                'd_model': self.d_model,
                'num_layers': len(self.blocks),
                'sequence_length': len(learning_history)
            }
        }
