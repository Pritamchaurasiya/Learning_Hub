"""
Fine-Tuning

Model adaptation:
1. LoRA/QLoRA.
2. Instruction tuning.
3. RLHF preparation.
"""

import random
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class FineTuneMethod(Enum):
    FULL = "full"
    LORA = "lora"
    QLORA = "qlora"
    PREFIX = "prefix"
    ADAPTER = "adapter"


@dataclass
class LoRAConfig:
    rank: int = 8
    alpha: float = 16.0
    dropout: float = 0.1
    target_modules: List[str] = None

    def __post_init__(self):
        if self.target_modules is None:
            self.target_modules = ['q_proj', 'v_proj']


@dataclass
class TrainingConfig:
    learning_rate: float = 2e-5
    batch_size: int = 8
    epochs: int = 3
    warmup_ratio: float = 0.1
    weight_decay: float = 0.01
    gradient_accumulation: int = 4


class LoRALayer:
    """Low-Rank Adaptation layer."""
    def __init__(self, in_dim: int, out_dim: int, config: LoRAConfig):
        self.config = config
        self.rank = config.rank
        self.alpha = config.alpha
        self.scaling = self.alpha / self.rank
        # Initialize A and B matrices
        self.A = [[random.gauss(0, 0.02) for _ in range(config.rank)] for _ in range(in_dim)]
        self.B = [[0.0 for _ in range(out_dim)] for _ in range(config.rank)]

    def forward(self, x: List[float]) -> List[float]:
        # x @ A @ B * scaling
        hidden = [sum(x[i] * self.A[i][j] for i in range(len(x))) for j in range(self.rank)]
        output = [sum(hidden[i] * self.B[i][j] for i in range(self.rank)) * self.scaling 
                  for j in range(len(self.B[0]))]
        return output


class InstructionDataset:
    """Instruction tuning dataset."""
    def __init__(self):
        self.samples: List[Dict[str, str]] = []

    def add(self, instruction: str, input_text: str, output: str):
        self.samples.append({
            'instruction': instruction,
            'input': input_text,
            'output': output
        })

    def format_alpaca(self, sample: Dict) -> str:
        if sample['input']:
            return f"### Instruction:\n{sample['instruction']}\n\n### Input:\n{sample['input']}\n\n### Response:\n{sample['output']}"
        return f"### Instruction:\n{sample['instruction']}\n\n### Response:\n{sample['output']}"

    def format_chatml(self, sample: Dict) -> str:
        return f"<|im_start|>user\n{sample['instruction']}\n{sample['input']}<|im_end|>\n<|im_start|>assistant\n{sample['output']}<|im_end|>"

    def get_batch(self, batch_size: int) -> List[Dict]:
        indices = random.sample(range(len(self.samples)), min(batch_size, len(self.samples)))
        return [self.samples[i] for i in indices]


class RLHFPreparation:
    """Prepare for RLHF training."""
    def __init__(self):
        self.preference_data: List[Tuple[str, str, str]] = []  # (prompt, chosen, rejected)

    def add_preference(self, prompt: str, chosen: str, rejected: str):
        self.preference_data.append((prompt, chosen, rejected))

    def compute_reward_signal(self, response: str, reference: str) -> float:
        # Simple similarity-based reward
        resp_words = set(response.lower().split())
        ref_words = set(reference.lower().split())
        if not resp_words:
            return -1.0
        overlap = len(resp_words & ref_words)
        return overlap / len(resp_words)

    def format_dpo(self, sample: Tuple[str, str, str]) -> Dict:
        prompt, chosen, rejected = sample
        return {
            'prompt': prompt,
            'chosen': chosen,
            'rejected': rejected
        }


class FineTuner:
    """Complete fine-tuning system."""
    def __init__(self, method: FineTuneMethod = FineTuneMethod.LORA):
        self.method = method
        self.lora_config = LoRAConfig()
        self.training_config = TrainingConfig()
        self.lora_layers: Dict[str, LoRALayer] = {}
        self.dataset = InstructionDataset()
        self.rlhf = RLHFPreparation()
        self.training_history: List[Dict] = []

    def prepare_lora(self, model_config: Dict):
        for module in self.lora_config.target_modules:
            in_dim = model_config.get('hidden_size', 768)
            out_dim = model_config.get('hidden_size', 768)
            self.lora_layers[module] = LoRALayer(in_dim, out_dim, self.lora_config)

    def train_step(self, batch: List[Dict]) -> float:
        # Simulated training step
        loss = random.uniform(0.5, 2.0)
        for _ in range(5):  # Simulate gradient descent
            loss *= 0.95
        return loss

    def train(self, num_steps: int = 100) -> Dict:
        losses = []
        for step in range(num_steps):
            batch = self.dataset.get_batch(self.training_config.batch_size)
            if not batch:
                break
            loss = self.train_step(batch)
            losses.append(loss)
            self.training_history.append({'step': step, 'loss': loss})
        
        return {
            'method': self.method.value,
            'steps': len(losses),
            'final_loss': losses[-1] if losses else 0,
            'avg_loss': sum(losses) / len(losses) if losses else 0
        }

    def save_adapter(self, path: str) -> Dict:
        adapter_weights = {}
        for name, layer in self.lora_layers.items():
            adapter_weights[f'{name}.A'] = layer.A
            adapter_weights[f'{name}.B'] = layer.B
        return {
            'path': path,
            'config': {
                'rank': self.lora_config.rank,
                'alpha': self.lora_config.alpha,
                'modules': list(self.lora_layers.keys())
            },
            'num_params': sum(len(layer.A) * layer.rank * 2 for layer in self.lora_layers.values())
        }
