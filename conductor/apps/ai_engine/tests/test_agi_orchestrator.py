import timeit
import unittest
from conductor.apps.ai_engine.agi_orchestrator import AGIOrchestrator


class TestAGIOrchestrator(unittest.TestCase):
    def setUp(self):
        self.orchestrator = AGIOrchestrator()

    def test_parse_intent_single_domain(self):
        self.assertEqual(
            self.orchestrator._parse_intent("Show me an image of a cat"),
            ["Computer Vision"]
        )
        self.assertEqual(
            self.orchestrator._parse_intent("Please generate a new poem"),
            ["Generative Modeling"]
        )
        self.assertEqual(
            self.orchestrator._parse_intent("Predict the time series data"),
            ["Time Series & Sequences"]
        )
        self.assertEqual(
            self.orchestrator._parse_intent("Store this in memory"),
            ["Extreme Memory"]
        )
        self.assertEqual(
            self.orchestrator._parse_intent("Analyze brain growth and energy"),
            ["Optimization & Biology"]
        )
        self.assertEqual(
            self.orchestrator._parse_intent("Scale quantum compute"),
            ["Quantum & Scaling"]
        )
        self.assertEqual(
            self.orchestrator._parse_intent("Explain why this happened"),
            ["Interpretability"]
        )

    def test_parse_intent_multiple_domains(self):
        prompt = "Create a new image and explain the quantum time series predict"
        expected = [
            "Computer Vision",
            "Generative Modeling",
            "Time Series & Sequences",
            "Quantum & Scaling",
            "Interpretability"
        ]
        self.assertEqual(self.orchestrator._parse_intent(prompt), expected)

    def test_parse_intent_fallback(self):
        self.assertEqual(
            self.orchestrator._parse_intent("Hello world"),
            ["Generative Modeling", "Interpretability", "Quantum & Scaling"]
        )

    def test_synthesize_solution(self):
        res = self.orchestrator.synthesize_solution("Create a new vision model")
        self.assertEqual(res["status"], "AGI Core Online")
        self.assertIn("Computer Vision", res["cognitive_domains_activated"])
        self.assertIn("Generative Modeling", res["cognitive_domains_activated"])

    def test_benchmark_parse_intent(self):
        prompts = [
            "Show me an image of a cat and generate a picture",
            "Predict the time series flow and store in memory",
            "Explain quantum scale and brain energy life",
            "Hello abstract world without keywords",
            "Create a new dream vision to predict sequence memory quantum explanation"
        ]

        iterations = 50000

        def run_bench():
            for p in prompts:
                self.orchestrator._parse_intent(p)

        total_time = timeit.timeit(run_bench, number=iterations)
        avg_us = (total_time / (iterations * len(prompts))) * 1e6
        print(f"\n[BENCHMARK] Total time for {iterations * len(prompts)} parse_intent calls: {total_time:.4f}s ({avg_us:.3f} µs/call)")


if __name__ == "__main__":
    unittest.main()
