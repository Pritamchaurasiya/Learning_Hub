import math
import random
import logging
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class GRUCell:
    """
    Phase 62: Gated Recurrent Unit (GRU) cell.
    
    GRU uses two gates to control information flow:
    - Update gate (z): how much past info to keep
    - Reset gate (r): how much past info to forget
    
    z_t = σ(W_z · [h_{t-1}, x_t])
    r_t = σ(W_r · [h_{t-1}, x_t])
    h̃_t = tanh(W · [r_t ⊙ h_{t-1}, x_t])
    h_t = (1 - z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t
    """
    
    def __init__(self, input_dim: int, hidden_dim: int, seed_str: str = "gru"):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        
        total_input = input_dim + hidden_dim
        seed = hash(seed_str) % (2**31)
        rng = random.Random(seed)
        scale = math.sqrt(2.0 / (total_input + hidden_dim))
        
        # Weight matrices for update gate
        self.W_z = [[rng.gauss(0, scale) for _ in range(hidden_dim)] for _ in range(total_input)]
        self.b_z = [0.0] * hidden_dim
        
        # Weight matrices for reset gate
        self.W_r = [[rng.gauss(0, scale) for _ in range(hidden_dim)] for _ in range(total_input)]
        self.b_r = [0.0] * hidden_dim
        
        # Weight matrices for candidate
        self.W_h = [[rng.gauss(0, scale) for _ in range(hidden_dim)] for _ in range(total_input)]
        self.b_h = [0.0] * hidden_dim
    
    @staticmethod
    def _sigmoid(x: float) -> float:
        return 1.0 / (1.0 + math.exp(-max(-20, min(20, x))))
    
    @staticmethod
    def _tanh(x: float) -> float:
        return math.tanh(max(-20, min(20, x)))
    
    def _linear(self, concat_input: List[float], W: List[List[float]],
                b: List[float]) -> List[float]:
        """Linear transformation: W^T · x + b."""
        return [
            sum(concat_input[j] * W[j][i] for j in range(len(concat_input))) + b[i]
            for i in range(self.hidden_dim)
        ]
    
    def forward(self, x: List[float], h_prev: List[float]) -> List[float]:
        """
        Single GRU step.
        
        Args:
            x: Input vector [input_dim]
            h_prev: Previous hidden state [hidden_dim]
            
        Returns:
            New hidden state [hidden_dim]
        """
        # Concatenate input and previous hidden state
        concat = list(x) + list(h_prev)
        
        # Update gate
        z = [self._sigmoid(v) for v in self._linear(concat, self.W_z, self.b_z)]
        
        # Reset gate
        r = [self._sigmoid(v) for v in self._linear(concat, self.W_r, self.b_r)]
        
        # Candidate hidden state
        reset_h = [r_i * h_i for r_i, h_i in zip(r, h_prev)]
        concat_reset = list(x) + reset_h
        h_candidate = [self._tanh(v) for v in self._linear(concat_reset, self.W_h, self.b_h)]
        
        # Final hidden state
        h_new = [
            (1 - z_i) * h_i + z_i * hc_i
            for z_i, h_i, hc_i in zip(z, h_prev, h_candidate)
        ]
        
        return h_new


class Seq2SeqPredictor:
    """
    Phase 62: Sequence-to-Sequence Learning Trajectory Predictor.
    
    ENCODER: Processes the student's learning history into a 
    context vector using a GRU recurrent network.
    
    DECODER: Auto-regressively generates predictions for future
    learning steps, conditioned on the context.
    
    Architecture:
    [Event_1, Event_2, ..., Event_T] → Encoder GRU → Context Vector
    Context Vector → Decoder GRU → [Pred_T+1, Pred_T+2, ..., Pred_T+K]
    """
    
    def __init__(self, input_dim: int = 8, hidden_dim: int = 16):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.encoder = GRUCell(input_dim, hidden_dim, "encoder")
        self.decoder = GRUCell(input_dim, hidden_dim, "decoder")
    
    def _featurize(self, event: Dict) -> List[float]:
        """Convert learning event to feature vector."""
        features = [
            event.get('mastery', 0.5),
            event.get('quiz_score', 0.5),
            event.get('time_spent', 30) / 120.0,
            event.get('engagement', 0.5),
            event.get('difficulty', 0.5),
            event.get('completion_rate', 0.5),
            event.get('streak', 0) / 30.0,
            event.get('review_count', 0) / 10.0,
        ]
        while len(features) < self.input_dim:
            features.append(0.0)
        return features[:self.input_dim]
    
    def _decode_output(self, hidden: List[float]) -> Dict:
        """Decode hidden state to predicted learning metrics."""
        # Sigmoid for bounded predictions
        sigmoid = lambda x: 1.0 / (1.0 + math.exp(-max(-20, min(20, x))))
        
        return {
            'predicted_mastery': round(sigmoid(hidden[0] if len(hidden) > 0 else 0), 4),
            'predicted_engagement': round(sigmoid(hidden[1] if len(hidden) > 1 else 0), 4),
            'predicted_completion': round(sigmoid(hidden[2] if len(hidden) > 2 else 0), 4),
            'recommended_difficulty': round(sigmoid(hidden[3] if len(hidden) > 3 else 0), 4),
        }
    
    def encode(self, history: List[Dict]) -> List[float]:
        """
        Encode learning history into a context vector.
        
        Runs the encoder GRU over the sequence and returns the
        final hidden state as the context representation.
        """
        h = [0.0] * self.hidden_dim
        
        for event in history:
            x = self._featurize(event)
            h = self.encoder.forward(x, h)
        
        return h
    
    def decode(self, context: List[float], num_steps: int = 5) -> List[Dict]:
        """
        Auto-regressively generate future predictions.
        
        Uses the context vector as initial hidden state and feeds
        back predictions as inputs for subsequent steps.
        """
        h = list(context)
        predictions = []
        
        # Initial decoder input (last known state)
        x = [0.5] * self.input_dim
        
        for step in range(num_steps):
            h = self.decoder.forward(x, h)
            pred = self._decode_output(h)
            pred['step'] = step + 1
            pred['confidence'] = round(max(0.3, 1.0 - step * 0.12), 4)
            predictions.append(pred)
            
            # Feed prediction back as next input
            x = [
                pred['predicted_mastery'],
                pred['predicted_engagement'],
                pred['predicted_completion'],
                pred['recommended_difficulty'],
            ]
            while len(x) < self.input_dim:
                x.append(0.5)
        
        return predictions
    
    def predict_trajectory(self, learning_history: List[Dict],
                           forecast_steps: int = 5) -> Dict:
        """
        Full Seq2Seq pipeline: encode history → decode trajectory.
        """
        if not learning_history:
            return {'error': 'No learning history provided.'}
        
        # Encode
        context = self.encode(learning_history)
        
        # Decode
        predictions = self.decode(context, forecast_steps)
        
        # Compute summary statistics
        avg_mastery = sum(p['predicted_mastery'] for p in predictions) / len(predictions)
        avg_engagement = sum(p['predicted_engagement'] for p in predictions) / len(predictions)
        
        # Trend analysis
        first_mastery = predictions[0]['predicted_mastery']
        last_mastery = predictions[-1]['predicted_mastery']
        trend = 'improving' if last_mastery > first_mastery else 'declining' if last_mastery < first_mastery else 'stable'
        
        return {
            'context_vector_norm': round(math.sqrt(sum(c ** 2 for c in context)), 4),
            'input_sequence_length': len(learning_history),
            'forecast_steps': forecast_steps,
            'predictions': predictions,
            'summary': {
                'avg_predicted_mastery': round(avg_mastery, 4),
                'avg_predicted_engagement': round(avg_engagement, 4),
                'mastery_trend': trend
            }
        }
