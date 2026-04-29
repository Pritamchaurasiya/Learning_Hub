import os
import sys
import django
import math
from pathlib import Path

# Add project root to python path
project_root = str(Path(__file__).resolve().parent.parent)
sys.path.insert(0, project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'conductor.settings')
django.setup()

from apps.ai_engine.preference_learning import DirectPreferenceOptimization

def test_dpo_convergence():
    print("Testing DPO Convergence...")
    
    dim = 10
    dpo = DirectPreferenceOptimization(dim=dim, beta=0.1, model_path="temp_dpo.json")
    
    # Synthetic embeddings
    # We want 'chosen' to be favored over 'rejected'.
    # Initially the policy is all zeros.
    chosen_emb = [1.0 for _ in range(dim)] # Strong positive signal
    rejected_emb = [-1.0 for _ in range(dim)] # Strong negative signal
    
    # Run multiple steps
    initial_loss = dpo.dpo_loss(chosen_emb, rejected_emb)
    print(f"Initial Loss (Step 0): {initial_loss:.6f}")
    
    for step in range(1, 101):
        loss = dpo.train_step(chosen_emb, rejected_emb)
        if step % 20 == 0:
            print(f"Loss at Step {step}: {loss:.6f}")
            
    final_loss = dpo.dpo_loss(chosen_emb, rejected_emb)
    print(f"Final Loss: {final_loss:.6f}")
    
    assert final_loss < initial_loss, "Mathematical Convergence Failed! DPO Loss did not decrease."
    print("✅ DPO Convergence Confirmed: Loss decreased successfully.")
    
if __name__ == "__main__":
    test_dpo_convergence()
