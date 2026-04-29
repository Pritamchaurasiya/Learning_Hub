import logging
from django.test import TestCase

# Phase 169-173 Multimodal GenAI & Advanced Reasoning test suite
class MultimodalReasoningTests(TestCase):
    
    def test_vla_engine(self):
        from apps.ai_engine.vla_engine import run_vla_experiment
        res = run_vla_experiment()
        self.assertIn("action_trajectory", res)
        # Should generate 4 steps of kinematic actions
        self.assertEqual(len(res["action_trajectory"]), 4)
        self.assertIn("dx", res["action_trajectory"][0])

    def test_tree_of_thought(self):
        from apps.ai_engine.tree_of_thought import run_tot_experiment
        res = run_tot_experiment()
        self.assertIn("reasoning_chain", res)
        # Verify it went 4 levels deep
        self.assertEqual(len(res["reasoning_chain"]), 4)
        self.assertGreaterEqual(res["final_confidence"], 0.0)

    def test_gaussian_splatting(self):
        from apps.ai_engine.gaussian_splatting_sim import run_gaussian_splat_experiment
        res = run_gaussian_splat_experiment()
        self.assertIn("view_1_statistics", res)
        self.assertIn("view_2_statistics", res)
        # Render should return RGB pixel colors
        self.assertEqual(len(res["view_1_statistics"]["final_pixel_color_rgb"]), 3)

    def test_audio_bridge(self):
        from apps.ai_engine.multimodal_audio_bridge import run_audio_bridge_experiment
        res = run_audio_bridge_experiment()
        self.assertIn("generated_audio_tokens", res["results"])
        self.assertIn("generated_waveform_samples", res["results"])
        self.assertGreater(res["results"]["generated_waveform_samples"], 0)

    def test_fim_code_gen(self):
        from apps.ai_engine.fim_code_generation import run_fim_experiment
        res = run_fim_experiment()
        self.assertIn("generated_middle", res)
        self.assertIn("training_data_structural_shift", res)
        self.assertTrue("<PRE>" in res["training_data_structural_shift"])
        self.assertTrue("<SUF>" in res["training_data_structural_shift"])
        self.assertTrue("<MID>" in res["training_data_structural_shift"])
