"""
Neural Cellular Automata (NCA) (Phase 96).
Self-organizing spatial models simulating biological morphogenesis.
"""
import random
import math
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class NeuralCellularAutomata:
    """
    Simulates a grid of cells where each cell has a hidden state vector.
    Cells update their state based solely on their own state and their 
    immediate neighbors' states, mimicking decentralized biological growth.
    """
    def __init__(self, grid_size: int = 16, channels: int = 4, hidden_dim: int = 16):
        self.size = grid_size
        self.channels = channels
        self.hidden_dim = hidden_dim
        
        # Grid shape: [size][size][channels]
        # Channel 0 represents "alpha" or living state (1=alive, 0=dead)
        self.grid = [[[0.0 for _ in range(channels)] for _ in range(grid_size)] for _ in range(grid_size)]
        
        # 1x1 Convolution 1 (Update Rule Network)
        # Weights: (channels * 3) -> hidden_dim
        # Where 3 is the number of perception filters: identity, sobel_x, sobel_y
        self.w1 = [[random.gauss(0, 0.1) for _ in range(channels * 3)] for _ in range(hidden_dim)]
        
        # 1x1 Convolution 2
        # Weights: hidden_dim -> channels
        self.w2 = [[random.gauss(0, 0.1) for _ in range(hidden_dim)] for _ in range(channels)]
        
    def seed(self, x: int, y: int):
        """Places a living seed at specific coordinates."""
        if 0 <= x < self.size and 0 <= y < self.size:
            self.grid[y][x][0] = 1.0 # Alpha channel
            for c in range(1, self.channels):
                self.grid[y][x][c] = 1.0 # Fully activated initial state
                
    def _sobel_filter(self, y: int, x: int, c: int, direction: str) -> float:
        """Applies 3x3 Sobel filter to channel 'c' at position (y, x)."""
        val = 0.0
        
        if direction == 'x':
            kernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
        elif direction == 'y':
            kernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
        else:
            return 0.0
            
        for dy in [-1, 0, 1]:
            for dx in [-1, 0, 1]:
                ny, nx = y + dy, x + dx
                # Wrap around (toroidal grid) or zero padding. Using zero padding here.
                if 0 <= ny < self.size and 0 <= nx < self.size:
                    val += self.grid[ny][nx][c] * kernel[dy + 1][dx + 1]
        return val

    def step(self):
        """Performs one synchronous perceived-update step for the entire grid."""
        new_grid = [[[0.0 for _ in range(self.channels)] for _ in range(self.size)] for _ in range(self.size)]
        
        for y in range(self.size):
            for x in range(self.size):
                
                # 1. Perception
                perception_vec = []
                for c in range(self.channels):
                    ident = self.grid[y][x][c]
                    dx = self._sobel_filter(y, x, c, 'x')
                    dy = self._sobel_filter(y, x, c, 'y')
                    perception_vec.extend([ident, dx, dy])
                    
                # 2. Neural Update (MLP on perception vector)
                hidden = []
                for i in range(self.hidden_dim):
                    h = sum(self.w1[i][j] * perception_vec[j] for j in range(len(perception_vec)))
                    hidden.append(max(0, h)) # ReLU
                    
                ds = []
                for i in range(self.channels):
                    o = sum(self.w2[i][j] * hidden[j] for j in range(self.hidden_dim))
                    ds.append(o)
                    
                # 3. Stochastic Update
                # Cells randomly decide whether to apply the update to break symmetry/synchrony
                if random.random() < 0.5:
                    for c in range(self.channels):
                        new_val = self.grid[y][x][c] + ds[c]
                        # Clamp between 0 and 1
                        new_grid[y][x][c] = max(0.0, min(1.0, new_val))
                else:
                    new_grid[y][x] = self.grid[y][x][:]
                    
                # 4. Alive Masking
                # If a cell has no living neighbors (alpha channel), it dies/stays dead
                alive_neighbors = self._sobel_filter(y, x, 0, 'x')**2 + self._sobel_filter(y, x, 0, 'y')**2 + self.grid[y][x][0]
                if alive_neighbors < 0.1:
                    new_grid[y][x] = [0.0] * self.channels
                    
        self.grid = new_grid
        
    def get_state(self) -> List[List[List[float]]]:
        return self.grid


class NCAEngine:
    """
    Phase 96: Neural Cellular Automata Engine.
    Used for generative modeling of self-repairing patterns.
    """
    def __init__(self, size: int = 16, channels: int = 4):
        self.nca = NeuralCellularAutomata(grid_size=size, channels=channels)
        
    def grow(self, steps: int = 50) -> Dict[str, Any]:
        """Seeds the center and grows the pattern for N steps."""
        center = self.nca.size // 2
        self.nca.seed(center, center)
        
        for _ in range(steps):
            self.nca.step()
            
        # Extract alpha channel to represent the "shape"
        alpha_grid = [[round(self.nca.grid[y][x][0], 2) for x in range(self.nca.size)] for y in range(self.nca.size)]
        
        # Calculate living cell count
        alive_count = sum(1 for row in alpha_grid for val in row if val > 0.1)
        
        return {
            "grid_size": self.nca.size,
            "steps_simulated": steps,
            "living_cells": alive_count,
            "alpha_map": alpha_grid
        }
