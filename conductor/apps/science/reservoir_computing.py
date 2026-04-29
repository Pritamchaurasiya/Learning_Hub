"""
Reservoir Computing (Echo State Networks)

Efficient time-series processing:
1. Fixed random recurrent reservoir.
2. Only train linear readout layer.
3. Captures temporal dependencies.
"""

import numpy as np
import logging
import random
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

class EchoStateNetwork:
    """
    Echo State Network (ESN) for time series forecasting.
    Uses numpy for efficient matrix operations (Ridge Regression).
    """
    
    def __init__(self, input_dim: int, reservoir_size: int = 100, output_dim: int = 1, 
                 spectral_radius: float = 0.9, leak_rate: float = 0.3, sparsity: float = 0.1):
        self.input_dim = input_dim
        self.reservoir_size = reservoir_size
        self.output_dim = output_dim
        self.leak_rate = leak_rate
        
        # Initialize weights
        # W_in: Input -> Reservoir
        self.W_in = np.random.uniform(-1, 1, (reservoir_size, input_dim))
        
        # W_res: Reservoir -> Reservoir (Sparse)
        W_res_temp = np.random.uniform(-1, 1, (reservoir_size, reservoir_size))
        # Mask for sparsity
        mask = np.random.rand(reservoir_size, reservoir_size) < sparsity
        W_res_temp *= mask
        
        # Spectral radius scaling - exact calculation
        rho = max(abs(np.linalg.eigvals(W_res_temp)))
        self.W_res = W_res_temp * (spectral_radius / rho) if rho > 0 else W_res_temp
        
        # W_out: Reservoir -> Output (Learned)
        self.W_out = np.zeros((output_dim, reservoir_size + input_dim)) # Concat input for stability?
        # Standard ESN usually reads out from State (+ optional Input)
        # Here we follow simple state readout
        self.W_out = np.zeros((output_dim, reservoir_size))
        
        # State: (Reservoir Size,)
        self.state = np.zeros(reservoir_size)

    def _update_state(self, input_vec: np.ndarray):
        """Update reservoir state x(t) = (1-a)x(t-1) + a*tanh(Win*u(t) + Wres*x(t-1))"""
        # Ensure inputs are arrays
        u = np.array(input_vec)
        
        pre_activation = np.dot(self.W_in, u) + np.dot(self.W_res, self.state)
        self.state = (1 - self.leak_rate) * self.state + self.leak_rate * np.tanh(pre_activation)

    def fit(self, X: List[List[float]], y: List[List[float]], regularization: float = 1e-8):
        """
        Train readout weights using Ridge Regression.
        X: Sequence of inputs (T, input_dim)
        y: Sequence of targets (T, output_dim)
        """
        X_arr = np.array(X)
        y_arr = np.array(y)
        
        if len(X_arr) != len(y_arr):
            raise ValueError("X and y must have same length")
            
        T = len(X_arr)
        
        # Collect states
        states = []
        # Transient washout? Usually discard first N steps. 
        # For this implementation, we keep all (or user can slice X).
        for t in range(T):
            self._update_state(X_arr[t])
            states.append(self.state.copy())
            
        S = np.array(states) # (T, reservoir_size)
        
        # Ridge Regression: W_out = (S^T S + reg*I)^-1 S^T y
        # Or using lstsq if reg=0.
        # W_out shape: (output_dim, reservoir_size) 
        # But standard eq solves Xw = y -> w = ...
        # Here S * W_out.T = Y => W_out.T = (S^T S + ...)^-1 S^T Y
        
        # Add regularization
        S_T_S = np.dot(S.T, S)
        reg_I = regularization * np.eye(self.reservoir_size)
        
        try:
             # W_out_T = inv(S.T @ S + reg * I) @ S.T @ Y
             W_out_T = np.linalg.solve(S_T_S + reg_I, np.dot(S.T, y_arr))
             self.W_out = W_out_T.T
             logger.info(f"ESN Training complete. Train Error (MSE): {np.mean((np.dot(S, self.W_out.T) - y_arr)**2):.6f}")
        except np.linalg.LinAlgError:
             logger.error("Singular matrix in ESN training. Using pseudo-inverse.")
             self.W_out = np.dot(np.linalg.pinv(S), y_arr).T

    def predict(self, X: List[List[float]]) -> List[List[float]]:
        """Predict sequence."""
        X_arr = np.array(X)
        preds = []
        
        for x in X_arr:
            self._update_state(x)
            # y = W_out * state
            y_pred = np.dot(self.W_out, self.state)
            preds.append(y_pred.tolist())
            
        return preds

    def reset_state(self):
        self.state = np.zeros(self.reservoir_size)
