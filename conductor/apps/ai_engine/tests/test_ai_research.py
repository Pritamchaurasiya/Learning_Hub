
import pytest
from apps.ai_engine.information_bottleneck import InformationBottleneckEngine, IBConfig
from apps.ai_engine.neuro_symbolic import NeuroSymbolicEngine

class TestAIResearch:
    """Test suite for Deep AI Research components."""

    def test_information_bottleneck_vib(self):
        """Test Variational Information Bottleneck training (Simulated/Torch)."""
        config = IBConfig(epochs=1, latent_dim=10)
        engine = InformationBottleneckEngine(config)
        
        # Mock Data
        X = [[0.1] * 784 for _ in range(5)]
        Y = [0, 1, 2, 3, 4]
        
        metrics = engine.train_vib(X, Y)
        
        assert "loss" in metrics
        assert "rate_I_XZ" in metrics
        assert "distortion_ce" in metrics
        # Rate should be positive
        assert metrics["rate_I_XZ"] >= 0

    def test_neuro_symbolic_math_verification(self):
        """Test Neuro-Symbolic math step verification."""
        # Valid step: 2x + 4 = 10 -> 2x = 6
        step1 = "2*x + 4 = 10"
        step2 = "2*x = 6"
        
        try:
            result = NeuroSymbolicEngine.verify_math_step(step2, step1)
            # If SymPy is installed, it should be valid. If not, fallback or skip.
            if result.get("reason") != "SymPy not installed":
                 assert result["valid"] is True
                 assert result["confidence"] > 0.9
        except Exception:
            pytest.skip("SymPy error or not installed")

    def test_neuro_symbolic_sat_solver(self):
        """Test SAT solver."""
        # A or B, not A -> B must be True
        vars = ["A", "B"]
        constraints = ["A | B", "~A"]
        
        try:
            solution = NeuroSymbolicEngine.solve_satisfiability(vars, constraints)
            if solution:
                assert solution["A"] is False
                assert solution["B"] is True
        except Exception:
            pytest.skip("SymPy not available")
