"""
Self-Improvement AI Module (Phase 29).
Agents that improve their own performance over time.
"""
import logging
import random
import math
from typing import List, Dict, Any, Optional, Callable, Tuple
from dataclasses import dataclass, field
from collections import deque
import time

logger = logging.getLogger(__name__)


@dataclass
class PerformanceRecord:
    """Record of performance on a task."""
    task_id: str
    task_type: str
    success: bool
    score: float
    time_taken: float
    timestamp: float
    strategy_used: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Strategy:
    """A strategy that can be used and improved."""
    name: str
    parameters: Dict[str, float]
    success_count: int = 0
    failure_count: int = 0
    total_score: float = 0.0
    
    @property
    def success_rate(self) -> float:
        total = self.success_count + self.failure_count
        return self.success_count / total if total > 0 else 0.5
    
    @property
    def avg_score(self) -> float:
        total = self.success_count + self.failure_count
        return self.total_score / total if total > 0 else 0.0
    
    def update(self, success: bool, score: float):
        """Update strategy statistics."""
        if success:
            self.success_count += 1
        else:
            self.failure_count += 1
        self.total_score += score


class StrategyPool:
    """Pool of strategies with evolution."""
    
    def __init__(self, n_strategies: int = 10):
        self.strategies: Dict[str, Strategy] = {}
        self._initialize_strategies(n_strategies)
    
    def _initialize_strategies(self, n: int):
        """Create initial random strategies."""
        for i in range(n):
            name = f"strategy_{i}"
            params = {
                "exploration_rate": random.uniform(0.1, 0.5),
                "learning_rate": random.uniform(0.01, 0.1),
                "depth": random.randint(1, 5),
                "breadth": random.randint(2, 10),
                "patience": random.randint(1, 10)
            }
            self.strategies[name] = Strategy(name, params)
    
    def select_strategy(self, task_type: str) -> Strategy:
        """Select best strategy using UCB1."""
        total_trials = sum(s.success_count + s.failure_count for s in self.strategies.values())
        
        if total_trials == 0:
            return random.choice(list(self.strategies.values()))
        
        best_score = -float('inf')
        best_strategy = None
        
        for strategy in self.strategies.values():
            trials = strategy.success_count + strategy.failure_count
            if trials == 0:
                return strategy
            
            exploitation = strategy.avg_score
            exploration = math.sqrt(2 * math.log(total_trials + 1) / trials)
            ucb_score = exploitation + exploration
            
            if ucb_score > best_score:
                best_score = ucb_score
                best_strategy = strategy
        
        return best_strategy
    
    def evolve(self, top_k: int = 3):
        """Evolve strategies based on performance."""
        sorted_strategies = sorted(
            self.strategies.values(),
            key=lambda s: s.avg_score,
            reverse=True
        )
        
        top_strategies = sorted_strategies[:top_k]
        bottom_strategies = sorted_strategies[-top_k:]
        
        # Replace worst with mutations of best
        for bottom in bottom_strategies:
            parent = random.choice(top_strategies)
            new_params = {}
            
            for key, value in parent.parameters.items():
                mutation = random.gauss(0, 0.1)
                new_params[key] = max(0.01, min(1.0, value + mutation))
            
            self.strategies[bottom.name] = Strategy(
                bottom.name,
                new_params,
                0, 0, 0.0
            )


class SelfReflection:
    """Self-reflection and introspection capabilities."""
    
    def __init__(self, memory_size: int = 100):
        self.memory: deque = deque(maxlen=memory_size)
        self.insights: List[Dict[str, Any]] = []
        self.weaknesses: Dict[str, float] = {}
        self.strengths: Dict[str, float] = {}
    
    def record(self, record: PerformanceRecord):
        """Record a performance instance."""
        self.memory.append(record)
    
    def analyze(self) -> Dict[str, Any]:
        """Analyze recent performance."""
        if not self.memory:
            return {"status": "no_data"}
        
        records = list(self.memory)
        
        # Overall stats
        success_rate = sum(1 for r in records if r.success) / len(records)
        avg_score = sum(r.score for r in records) / len(records)
        
        # By task type
        by_type = {}
        for record in records:
            if record.task_type not in by_type:
                by_type[record.task_type] = {"success": 0, "total": 0, "scores": []}
            by_type[record.task_type]["total"] += 1
            if record.success:
                by_type[record.task_type]["success"] += 1
            by_type[record.task_type]["scores"].append(record.score)
        
        for task_type, stats in by_type.items():
            rate = stats["success"] / stats["total"]
            avg = sum(stats["scores"]) / len(stats["scores"])
            
            if rate < 0.5:
                self.weaknesses[task_type] = rate
            elif rate > 0.8:
                self.strengths[task_type] = rate
        
        # Generate insights
        insights = []
        for weakness, rate in self.weaknesses.items():
            insights.append({
                "type": "weakness",
                "area": weakness,
                "rate": rate,
                "recommendation": f"Focus more practice on {weakness} tasks"
            })
        
        for strength, rate in self.strengths.items():
            insights.append({
                "type": "strength",
                "area": strength,
                "rate": rate,
                "recommendation": f"Leverage {strength} expertise for related tasks"
            })
        
        self.insights = insights
        
        return {
            "overall_success_rate": success_rate,
            "overall_avg_score": avg_score,
            "by_task_type": {k: {"success_rate": v["success"]/v["total"]} for k, v in by_type.items()},
            "weaknesses": self.weaknesses,
            "strengths": self.strengths,
            "insights": insights
        }


class MetaOptimizer:
    """Optimize the optimization process itself."""
    
    def __init__(self):
        self.optimizer_configs: List[Dict[str, Any]] = []
        self.current_config: Dict[str, Any] = self._default_config()
        self.config_scores: Dict[str, List[float]] = {}
    
    def _default_config(self) -> Dict[str, Any]:
        return {
            "learning_rate": 0.1,
            "momentum": 0.9,
            "batch_size": 32,
            "optimizer": "adam",
            "scheduler": "cosine"
        }
    
    def suggest_config(self) -> Dict[str, Any]:
        """Suggest a new configuration to try."""
        if random.random() < 0.3:  # Exploration
            return {
                "learning_rate": 10 ** random.uniform(-4, -1),
                "momentum": random.uniform(0.5, 0.99),
                "batch_size": random.choice([16, 32, 64, 128]),
                "optimizer": random.choice(["adam", "sgd", "adamw", "rmsprop"]),
                "scheduler": random.choice(["cosine", "linear", "step", "none"])
            }
        else:  # Exploitation - mutate best
            if self.config_scores:
                best_key = max(self.config_scores.keys(), 
                             key=lambda k: sum(self.config_scores[k])/len(self.config_scores[k]))
                best_config = self.optimizer_configs[int(best_key.split("_")[1])]
                
                mutated = best_config.copy()
                param = random.choice(["learning_rate", "momentum"])
                if param == "learning_rate":
                    mutated["learning_rate"] *= random.uniform(0.5, 2.0)
                else:
                    mutated["momentum"] = max(0.5, min(0.99, mutated["momentum"] + random.gauss(0, 0.1)))
                
                return mutated
        
        return self._default_config()
    
    def record_result(self, config: Dict[str, Any], score: float):
        """Record result for a configuration."""
        self.optimizer_configs.append(config)
        key = f"config_{len(self.optimizer_configs) - 1}"
        
        if key not in self.config_scores:
            self.config_scores[key] = []
        self.config_scores[key].append(score)
        
        # Calculate average of all config averages
        avg_all = 0.0
        if self.config_scores:
            total = sum(sum(v) / len(v) for v in self.config_scores.values() if v)
            avg_all = total / len(self.config_scores)
        
        if score > avg_all:
            self.current_config = config
    
    def get_best_config(self) -> Dict[str, Any]:
        """Get the best configuration found so far."""
        if not self.config_scores:
            return self._default_config()
        
        best_key = max(self.config_scores.keys(),
                      key=lambda k: sum(self.config_scores[k])/len(self.config_scores[k]))
        return self.optimizer_configs[int(best_key.split("_")[1])]


class SelfImprovingAgent:
    """An agent that improves its own performance."""
    
    def __init__(self, name: str):
        self.name = name
        self.strategy_pool = StrategyPool()
        self.reflection = SelfReflection()
        self.meta_optimizer = MetaOptimizer()
        self.generation = 0
        self.total_tasks = 0
        self.improvements: List[Dict[str, Any]] = []
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a task and learn from it."""
        task_id = task.get("id", str(self.total_tasks))
        task_type = task.get("type", "general")
        
        # Select strategy
        strategy = self.strategy_pool.select_strategy(task_type)
        
        # Simulate task execution
        start_time = time.time()
        
        # Performance depends on strategy parameters and task difficulty
        difficulty = task.get("difficulty", 0.5)
        base_success_prob = 0.7 - difficulty * 0.4
        
        # Strategy parameters affect performance
        lr_bonus = 0.1 if strategy.parameters.get("learning_rate", 0) < 0.05 else 0
        depth_bonus = 0.05 * min(strategy.parameters.get("depth", 1), 3)
        
        success_prob = min(0.95, base_success_prob + lr_bonus + depth_bonus + strategy.success_rate * 0.1)
        success = random.random() < success_prob
        
        score = random.uniform(0.5, 1.0) if success else random.uniform(0.0, 0.5)
        time_taken = random.uniform(0.1, 1.0)
        
        # Update strategy
        strategy.update(success, score)
        
        # Record performance
        record = PerformanceRecord(
            task_id=task_id,
            task_type=task_type,
            success=success,
            score=score,
            time_taken=time_taken,
            timestamp=time.time(),
            strategy_used=strategy.name
        )
        self.reflection.record(record)
        
        self.total_tasks += 1
        
        return {
            "task_id": task_id,
            "success": success,
            "score": score,
            "strategy": strategy.name,
            "time_taken": time_taken
        }
    
    def improve(self) -> Dict[str, Any]:
        """Run self-improvement cycle."""
        self.generation += 1
        
        # Analyze recent performance
        analysis = self.reflection.analyze()
        
        # Evolve strategies
        self.strategy_pool.evolve()
        
        # Try new meta-optimizer config
        new_config = self.meta_optimizer.suggest_config()
        
        # Simulate config evaluation
        config_score = random.uniform(0.5, 1.0)
        self.meta_optimizer.record_result(new_config, config_score)
        
        improvement = {
            "generation": self.generation,
            "analysis": analysis,
            "strategies_evolved": True,
            "best_strategy": max(
                self.strategy_pool.strategies.values(),
                key=lambda s: s.avg_score
            ).name,
            "best_optimizer_config": self.meta_optimizer.get_best_config()
        }
        
        self.improvements.append(improvement)
        
        return improvement
    
    def run_training(self, n_tasks: int = 50, improve_every: int = 10) -> Dict[str, Any]:
        """Run a training loop with periodic improvement."""
        results = []
        
        task_types = ["reasoning", "coding", "analysis", "creative"]
        
        for i in range(n_tasks):
            task = {
                "id": f"task_{i}",
                "type": random.choice(task_types),
                "difficulty": random.uniform(0.3, 0.8)
            }
            
            result = self.execute_task(task)
            results.append(result)
            
            if (i + 1) % improve_every == 0:
                self.improve()
        
        # Final analysis
        final_analysis = self.reflection.analyze()
        
        return {
            "agent": self.name,
            "total_tasks": n_tasks,
            "generations": self.generation,
            "final_success_rate": final_analysis.get("overall_success_rate", 0),
            "final_avg_score": final_analysis.get("overall_avg_score", 0),
            "improvements": len(self.improvements),
            "strengths": list(self.reflection.strengths.keys()),
            "weaknesses": list(self.reflection.weaknesses.keys())
        }


def run_self_improvement_experiment(n_agents: int = 3, n_tasks: int = 100) -> Dict[str, Any]:
    """Run self-improvement experiment."""
    print("=== Self-Improvement AI Experiment ===")
    
    agents = []
    for i in range(n_agents):
        agent = SelfImprovingAgent(f"agent_{i}")
        result = agent.run_training(n_tasks=n_tasks, improve_every=20)
        agents.append(result)
        
        print(f"\nAgent {i}: Success Rate = {result['final_success_rate']:.2%}, "
              f"Avg Score = {result['final_avg_score']:.3f}")
    
    best_agent = max(agents, key=lambda a: a["final_avg_score"])
    
    return {
        "n_agents": n_agents,
        "n_tasks": n_tasks,
        "agents": agents,
        "best_agent": best_agent["agent"],
        "best_score": best_agent["final_avg_score"]
    }
