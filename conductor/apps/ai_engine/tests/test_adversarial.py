"""
Tests for Adversarial Robustness and Defense Mechanisms.
validates FGSM, PGD, Defense Pipeline, and logic verification.
"""

import pytest
try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

from apps.ai_engine.adversarial_robustness import (
    FGSM, PGD, AdversarialTrainer, DefensePipeline, PerturbationDetector
)

@pytest.fixture
def mock_clean_data():
    # 5 samples, 3 features each
    return [
        [0.1, 0.2, 0.1],
        [0.2, 0.1, 0.2],
        [0.1, 0.15, 0.1],
        [0.15, 0.2, 0.15],
        [0.1, 0.2, 0.15]
    ]

@pytest.fixture
def mock_labels():
    return [0, 1, 0, 1, 0]

if HAS_TORCH:
    class SimpleModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.fc = nn.Linear(3, 2)
        
        def forward(self, x):
            return self.fc(x)


def test_fgsm_simulated(mock_clean_data, mock_labels):
    """Test simulated FGSM attack."""
    attacker = FGSM(epsilon=0.1)
    attacked = attacker.attack(mock_clean_data[0], mock_labels[0])
    
    assert len(attacked) == 3
    assert attacked != mock_clean_data[0]
    # Check epsilon bound
    for o, a in zip(mock_clean_data[0], attacked):
        assert abs(o - a) <= 0.1 + 1e-9

@pytest.mark.skipif(not HAS_TORCH, reason="PyTorch not installed")
def test_fgsm_torch():
    """Test real FGSM attack with PyTorch."""
    model = SimpleModel()
    attacker = FGSM(model=model, epsilon=0.1)
    
    data = torch.tensor([[0.5, 0.5, 0.5]], dtype=torch.float32)
    target = torch.tensor([0], dtype=torch.long)
    
    adv_data = attacker.attack(data, target)
    
    assert adv_data.shape == data.shape
    assert not torch.allclose(data, adv_data)

def test_defense_pipeline_training(mock_clean_data, mock_labels):
    """Test full defense pipeline training simulation."""
    pipeline = DefensePipeline()
    results = pipeline.train_robust_model(mock_clean_data, mock_labels, epochs=3)
    
    assert results['epochs'] == 3
    assert 'history' in results
    assert len(results['history']) == 3
    assert 'robustness_score' in results['history'][0]

def test_perturbation_detector(mock_clean_data):
    """Test detection of adversarial examples."""
    detector = PerturbationDetector(threshold=2.0)
    detector.fit(mock_clean_data)
    
    # Test on clean data (should be low score)
    clean_sample = [0.12, 0.18, 0.12]
    is_adv, score = detector.is_adversarial(clean_sample)
    assert not is_adv
    
    # Test on outlier/adversarial data
    adv_sample = [0.9, 0.9, 0.9]
    is_adv, score = detector.is_adversarial(adv_sample)
    assert is_adv
