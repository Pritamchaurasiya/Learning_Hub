"""
Phase 173: FIM (Fill-In-The-Middle) Code Generation Architecture
Standard causal LLMs can only predict the future given the past.
But code completion in an IDE (like GitHub Copilot) requires 
inserting code *in the middle* of existing code.
FIM rearranges the training data using special tokens: <PRE>, <SUF>, <MID>.
Data format: <PRE> [prefix text] <SUF> [suffix text] <MID> [target to predict]
"""
import random
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class FIMCodeGenerator:
    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)
        
    def preprocess_fim_training_data(self, original_document: str) -> str:
        """How code is restructured during pre-training to teach the LLM to fill middles."""
        parts = original_document.split("\n")
        if len(parts) < 3:
            return ""
            
        # Randomly split into 3 chunks
        split1 = len(parts) // 3
        split2 = 2 * len(parts) // 3
        
        prefix = "\n".join(parts[:split1])
        middle = "\n".join(parts[split1:split2])
        suffix = "\n".join(parts[split2:])
        
        # FIM format (usually PSM: Prefix-Suffix-Middle)
        return f"<PRE> {prefix} <SUF> {suffix} <MID> {middle}"

    def predict_middle(self, prefix: str, suffix: str) -> str:
        """Simulate Autoregressive generation conditioned on both prefix and suffix."""
        # Simulated LLM logic understanding context
        if "def" in prefix and "return" in suffix:
            return "    # Autocompleting logic\n    x = y + 10\n    z = process(x)"
        elif "class" in prefix:
            return "    def __init__(self):\n        self.is_ready = True"
        else:
            return "    # Generated FIM block"

def run_fim_experiment() -> Dict[str, Any]:
    fim = FIMCodeGenerator()
    
    # Simulate a user's IDE cursor position:
    prefix = "def calculate_total(prices):\n    total = 0"
    suffix = "\n    return total\n"
    
    # Generate the missing code
    completed_middle = fim.predict_middle(prefix, suffix)
    
    # Reconstruct final file
    final_file = f"{prefix}\n{completed_middle}{suffix}"
    
    # Training simulation example
    original = "def greet():\n    print('Hello')\n    return True"
    train_string = fim.preprocess_fim_training_data(original)
    
    return {
        "paradigm": "Fill-In-The-Middle (FIM) Code Generation",
        "training_data_structural_shift": train_string,
        "ide_prefix_context": prefix,
        "ide_suffix_context": suffix,
        "generated_middle": completed_middle,
        "insight": "By artificially moving the suffix of a document to the middle of the sequence during training, an autoregressive language model learns to complete code while being fully aware of everything that comes after the cursor, powering modern AI IDEs."
    }
