"""
Evaluation Framework

Model evaluation:
1. Benchmark suites.
2. Metric computation.
3. Leaderboard tracking.
"""

import random
import math
from typing import List, Dict, Optional
from dataclasses import dataclass
from collections import defaultdict


@dataclass
class EvalResult:
    model: str
    benchmark: str
    score: float
    metrics: Dict[str, float]
    samples_evaluated: int


class TextMetrics:
    """Text generation metrics."""
    def bleu(self, reference: str, hypothesis: str, n: int = 4) -> float:
        ref_tokens = reference.lower().split()
        hyp_tokens = hypothesis.lower().split()
        
        if not hyp_tokens:
            return 0.0
        
        precisions = []
        for i in range(1, min(n + 1, len(hyp_tokens) + 1)):
            ref_ngrams = set(tuple(ref_tokens[j:j+i]) for j in range(len(ref_tokens) - i + 1))
            hyp_ngrams = [tuple(hyp_tokens[j:j+i]) for j in range(len(hyp_tokens) - i + 1)]
            matches = sum(1 for ng in hyp_ngrams if ng in ref_ngrams)
            precision = matches / len(hyp_ngrams) if hyp_ngrams else 0
            precisions.append(precision)
        
        if not precisions or 0 in precisions:
            return 0.0
        
        log_precisions = [math.log(p) for p in precisions if p > 0]
        geo_mean = math.exp(sum(log_precisions) / len(log_precisions))
        
        bp = 1.0 if len(hyp_tokens) >= len(ref_tokens) else math.exp(1 - len(ref_tokens) / len(hyp_tokens))
        return bp * geo_mean

    def rouge_l(self, reference: str, hypothesis: str) -> float:
        ref_tokens = reference.lower().split()
        hyp_tokens = hypothesis.lower().split()
        
        if not ref_tokens or not hyp_tokens:
            return 0.0
        
        # LCS
        m, n = len(ref_tokens), len(hyp_tokens)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if ref_tokens[i-1] == hyp_tokens[j-1]:
                    dp[i][j] = dp[i-1][j-1] + 1
                else:
                    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
        
        lcs = dp[m][n]
        precision = lcs / n
        recall = lcs / m
        if precision + recall == 0:
            return 0.0
        return 2 * precision * recall / (precision + recall)

    def exact_match(self, reference: str, hypothesis: str) -> float:
        return 1.0 if reference.strip().lower() == hypothesis.strip().lower() else 0.0


class BenchmarkSuite:
    """Benchmark evaluation suite."""
    def __init__(self, name: str):
        self.name = name
        self.tasks: List[Dict] = []
        self.metrics = TextMetrics()

    def add_task(self, prompt: str, reference: str, category: str = "general"):
        self.tasks.append({'prompt': prompt, 'reference': reference, 'category': category})

    def evaluate(self, model_fn) -> Dict:
        results = defaultdict(list)
        
        for task in self.tasks:
            prediction = model_fn(task['prompt'])
            
            bleu = self.metrics.bleu(task['reference'], prediction)
            rouge = self.metrics.rouge_l(task['reference'], prediction)
            em = self.metrics.exact_match(task['reference'], prediction)
            
            results[task['category']].append({
                'bleu': bleu, 'rouge_l': rouge, 'exact_match': em
            })
        
        # Aggregate
        aggregated = {}
        for cat, scores in results.items():
            aggregated[cat] = {
                'bleu': sum(s['bleu'] for s in scores) / len(scores),
                'rouge_l': sum(s['rouge_l'] for s in scores) / len(scores),
                'exact_match': sum(s['exact_match'] for s in scores) / len(scores)
            }
        
        return {'benchmark': self.name, 'categories': aggregated, 'total_tasks': len(self.tasks)}


class Leaderboard:
    """Track model performance."""
    def __init__(self):
        self.entries: List[EvalResult] = []

    def submit(self, result: EvalResult):
        self.entries.append(result)

    def get_rankings(self, benchmark: str) -> List[EvalResult]:
        filtered = [e for e in self.entries if e.benchmark == benchmark]
        return sorted(filtered, key=lambda e: -e.score)

    def get_best(self, benchmark: str) -> Optional[EvalResult]:
        rankings = self.get_rankings(benchmark)
        return rankings[0] if rankings else None


class EvaluationFramework:
    """Complete evaluation system."""
    def __init__(self):
        self.metrics = TextMetrics()
        self.benchmarks: Dict[str, BenchmarkSuite] = {}
        self.leaderboard = Leaderboard()

    def create_benchmark(self, name: str) -> BenchmarkSuite:
        suite = BenchmarkSuite(name)
        self.benchmarks[name] = suite
        return suite

    def evaluate(self, model_name: str, benchmark_name: str, model_fn) -> EvalResult:
        if benchmark_name not in self.benchmarks:
            return EvalResult(model_name, benchmark_name, 0, {}, 0)
        
        results = self.benchmarks[benchmark_name].evaluate(model_fn)
        
        # Compute overall score
        all_scores = []
        for cat_scores in results['categories'].values():
            all_scores.extend(cat_scores.values())
        overall = sum(all_scores) / len(all_scores) if all_scores else 0
        
        result = EvalResult(
            model=model_name,
            benchmark=benchmark_name,
            score=overall,
            metrics=results['categories'],
            samples_evaluated=results['total_tasks']
        )
        
        self.leaderboard.submit(result)
        return result
