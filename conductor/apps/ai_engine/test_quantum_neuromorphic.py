import logging
from django.test import TestCase

# Phase 164-168 Quantum AI & Neuromorphic Computing test suite
class QuantumNeuromorphicTests(TestCase):
    
    def test_quantum_ml_sim(self):
        from apps.ai_engine.quantum_ml_sim import run_quantum_ml_experiment
        res = run_quantum_ml_experiment()
        self.assertIn("paradigm", res)
        self.assertIn("training_trajectory", res)
        # Should simulate parameter shift gradient descent over 5 steps
        self.assertEqual(len(res["training_trajectory"]), 5)
        self.assertEqual(res["num_qubits"], 4)

    def test_neuromorphic_snn(self):
        from apps.ai_engine.neuromorphic_snn import run_snn_experiment
        res = run_snn_experiment()
        self.assertIn("architecture", res)
        self.assertEqual(res["time_simulation_ms"], 10)
        # Verify spikes array dimension (10ms output)
        self.assertEqual(len(res["output_raster"]), 10)
        self.assertGreaterEqual(res["total_output_spikes"], 0)
        
    def test_energy_based_model(self):
        from apps.ai_engine.energy_based_models import run_hopfield_experiment
        res = run_hopfield_experiment()
        self.assertIn("memory_capacity", res)
        # The retrieved pattern should be closer to the target than the corrupted one
        self.assertLess(res["retrieval_distance"], res["corruption_distance"])
        # Verification of Gibbs Distribution normalization
        self.assertAlmostEqual(sum(res["attention_weights"]), 1.0, places=3)

    def test_neurosymbolic_ai(self):
        from apps.ai_engine.neurosymbolic_ai import run_neurosymbolic_experiment
        res = run_neurosymbolic_experiment()
        results_data = res["results"]
        self.assertGreater(results_data["neural_proposals_count"], 0)
        # Some logic violations must be caught (System 2 filtering System 1)
        self.assertGreater(results_data["logic_violations_caught"], 0)

    def test_hyperdimensional_comp(self):
        from apps.ai_engine.hyperdimensional_comp import run_hdc_experiment
        res = run_hdc_experiment()
        self.assertIn("insight", res)
        # Hyperdimensional vectors are mostly orthogonal
        self.assertAlmostEqual(res["orthogonality_check"], 0.0, delta=0.15)
        # Successful binding+bundling retrieval
        self.assertTrue(res["successful_retrieval"])
        self.assertGreater(res["target_retrieval_similarity"], res["false_retrieval_similarity"])
