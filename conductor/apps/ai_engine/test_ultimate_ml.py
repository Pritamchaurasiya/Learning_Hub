import logging
from django.test import TestCase

# Phase 159-163 Ultimate ML testing suite
class UltimateMLStructureTests(TestCase):
    
    def test_multi_agent_swarm(self):
        from apps.ai_engine.multi_agent_swarm import run_swarm_experiment
        res = run_swarm_experiment()
        self.assertIn("paradigm", res)
        self.assertIn("execution_trace", res)
        self.assertTrue(res["final_consensus_reached"])
        self.assertGreater(res["iterations_run"], 0)
        self.assertIn("planner", res["active_agents"])

    def test_graphrag_engine(self):
        from apps.ai_engine.graph_rag import run_graphrag_experiment
        res = run_graphrag_experiment()
        self.assertIn("insight", res)
        self.assertIn("graph_stats", res)
        self.assertEqual(res["graph_stats"]["communities_detected"], 2)
        self.assertTrue(len(res["generated_answer"]) > 0)
        
    def test_dpo_engine(self):
        from apps.ai_engine.dpo_engine import run_dpo_experiment
        res = run_dpo_experiment()
        self.assertIn("paradigm", res)
        self.assertIn("training_trajectory", res)
        self.assertEqual(len(res["training_trajectory"]), 5)
        # As adaptation progresses, the margin (implicit reward difference) should decrease/improve
        self.assertIsNotNone(res["final_loss"])

    def test_liquid_neural_network(self):
        from apps.ai_engine.liquid_neural_network import run_liquid_network_experiment
        res = run_liquid_network_experiment()
        self.assertIn("insight", res)
        self.assertIn("steady_output_variance", res)
        self.assertIn("noisy_output_variance", res)
        self.assertGreater(res["neurons"], 0)

    def test_jamba_hybrid(self):
        from apps.ai_engine.jamba_hybrid import run_jamba_experiment
        res = run_jamba_experiment()
        self.assertIn("insight", res)
        self.assertEqual(res["total_layers"], 32)
        self.assertIn("memory_analysis", res)
        # Verify the memory reduction factor
        self.assertGreater(res["memory_analysis"]["memory_reduction_factor"], 1.0)
