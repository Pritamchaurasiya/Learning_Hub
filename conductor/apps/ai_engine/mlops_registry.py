"""
Phase 146: MLOps Model Registry & A/B Testing Framework

Production ML is not just about training — it's about managing model lifecycle:
  1. Version Control for models (like Git for code)
  2. Promotion Pipeline: Development → Staging → Production → Archived
  3. A/B Testing: Split traffic between model versions to measure impact
  4. Canary Deployment: Gradually roll out new models with automatic rollback

This is what MLflow, Vertex AI Model Registry, and SageMaker do internally.
"""
import logging
import random
import math
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ModelStage(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    ARCHIVED = "archived"


@dataclass
class ModelMetrics:
    """Performance metrics for a model version."""
    accuracy: float = 0.0
    latency_ms: float = 0.0
    throughput_qps: float = 0.0       # Queries per second
    error_rate: float = 0.0
    memory_mb: float = 0.0
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "accuracy": round(self.accuracy, 4),
            "latency_ms": round(self.latency_ms, 2),
            "throughput_qps": round(self.throughput_qps, 1),
            "error_rate": round(self.error_rate, 4),
            "memory_mb": round(self.memory_mb, 1),
        }


@dataclass
class ModelVersion:
    """A registered model version with metadata."""
    name: str
    version: int
    stage: ModelStage = ModelStage.DEVELOPMENT
    metrics: ModelMetrics = field(default_factory=ModelMetrics)
    created_at: float = field(default_factory=time.time)
    description: str = ""
    hyperparameters: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "stage": self.stage.value,
            "metrics": self.metrics.to_dict(),
            "description": self.description,
            "hyperparameters": self.hyperparameters,
        }


class ModelRegistry:
    """
    Central Model Registry — tracks all model versions and their lifecycle.
    
    Workflow:
      1. Register new model version (DEVELOPMENT)
      2. Run validation → Promote to STAGING
      3. A/B test against production → Promote to PRODUCTION
      4. Old model → ARCHIVED
    """
    def __init__(self):
        self.models: Dict[str, List[ModelVersion]] = {}  # name -> versions
        self._version_counter: Dict[str, int] = {}
    
    def register_model(self, name: str, metrics: ModelMetrics, 
                       description: str = "", hyperparams: Dict[str, Any] = None) -> ModelVersion:
        """Register a new model version."""
        if name not in self.models:
            self.models[name] = []
            self._version_counter[name] = 0
        
        self._version_counter[name] += 1
        version = ModelVersion(
            name=name,
            version=self._version_counter[name],
            metrics=metrics,
            description=description,
            hyperparameters=hyperparams or {},
        )
        self.models[name].append(version)
        logger.info(f"Registered {name} v{version.version} (stage: {version.stage.value})")
        return version
    
    def promote(self, name: str, version: int, target_stage: ModelStage) -> Dict[str, Any]:
        """Promote a model version to a new stage."""
        model = self._get_version(name, version)
        if not model:
            return {"error": f"Model {name} v{version} not found"}
        
        old_stage = model.stage
        
        # If promoting to PRODUCTION, archive existing production model
        if target_stage == ModelStage.PRODUCTION:
            for v in self.models.get(name, []):
                if v.stage == ModelStage.PRODUCTION and v.version != version:
                    v.stage = ModelStage.ARCHIVED
                    logger.info(f"Archived {name} v{v.version}")
        
        model.stage = target_stage
        return {
            "model": name,
            "version": version,
            "transition": f"{old_stage.value} → {target_stage.value}",
            "status": "success"
        }
    
    def rollback(self, name: str) -> Dict[str, Any]:
        """Roll back to the previous production version."""
        versions = self.models.get(name, [])
        archived = [v for v in versions if v.stage == ModelStage.ARCHIVED]
        current_prod = [v for v in versions if v.stage == ModelStage.PRODUCTION]
        
        if not archived:
            return {"error": "No archived version to rollback to."}
        
        # Archive current production
        for v in current_prod:
            v.stage = ModelStage.ARCHIVED
        
        # Restore latest archived
        latest_archived = max(archived, key=lambda v: v.version)
        latest_archived.stage = ModelStage.PRODUCTION
        
        return {
            "rolled_back_to": f"v{latest_archived.version}",
            "status": "success"
        }
    
    def compare_versions(self, name: str, v1: int, v2: int) -> Dict[str, Any]:
        """Compare metrics between two model versions."""
        m1, m2 = self._get_version(name, v1), self._get_version(name, v2)
        if not m1 or not m2:
            return {"error": "One or both versions not found."}
        
        met1, met2 = m1.metrics, m2.metrics
        return {
            "comparison": f"v{v1} vs v{v2}",
            "accuracy_delta": round(met2.accuracy - met1.accuracy, 4),
            "latency_delta_ms": round(met2.latency_ms - met1.latency_ms, 2),
            "throughput_delta_qps": round(met2.throughput_qps - met1.throughput_qps, 1),
            "recommendation": "Promote v2" if met2.accuracy > met1.accuracy and met2.latency_ms <= met1.latency_ms * 1.1 else "Keep v1"
        }
    
    def _get_version(self, name: str, version: int) -> Optional[ModelVersion]:
        for v in self.models.get(name, []):
            if v.version == version:
                return v
        return None
    
    def list_models(self) -> Dict[str, Any]:
        result = {}
        for name, versions in self.models.items():
            result[name] = [v.to_dict() for v in versions]
        return result


class ABTestManager:
    """
    A/B Test Manager for model deployment.
    
    Splits traffic between model versions and computes statistical significance
    using a two-proportion Z-test.
    
    Z = (p1 - p2) / √(p̂(1-p̂)(1/n1 + 1/n2))
    where p̂ = (x1 + x2) / (n1 + n2)
    """
    def __init__(self, model_a: str, model_b: str, traffic_split: float = 0.5):
        self.model_a = model_a
        self.model_b = model_b
        self.traffic_split = traffic_split
        
        self.results_a: List[bool] = []  # True = success
        self.results_b: List[bool] = []
    
    def route_request(self) -> str:
        """Route a request to model A or B based on traffic split."""
        return self.model_a if random.random() < self.traffic_split else self.model_b
    
    def record_outcome(self, model: str, success: bool):
        """Record the outcome of a request."""
        if model == self.model_a:
            self.results_a.append(success)
        else:
            self.results_b.append(success)
    
    def compute_significance(self) -> Dict[str, Any]:
        """
        Two-proportion Z-test for statistical significance.
        Tests whether model B is significantly better than model A.
        """
        n_a, n_b = len(self.results_a), len(self.results_b)
        if n_a < 30 or n_b < 30:
            return {"error": "Need at least 30 samples per group for significance testing."}
        
        p_a = sum(self.results_a) / n_a
        p_b = sum(self.results_b) / n_b
        
        # Pooled proportion
        p_pool = (sum(self.results_a) + sum(self.results_b)) / (n_a + n_b)
        
        # Standard error
        se = math.sqrt(p_pool * (1 - p_pool) * (1/n_a + 1/n_b)) if p_pool > 0 and p_pool < 1 else 1e-10
        
        # Z-statistic
        z = (p_b - p_a) / se
        
        # Approximate p-value (one-tailed)
        p_value = 0.5 * (1 + math.erf(-abs(z) / math.sqrt(2)))
        
        return {
            "model_a_rate": round(p_a, 4),
            "model_b_rate": round(p_b, 4),
            "z_statistic": round(z, 4),
            "p_value": round(p_value, 6),
            "significant_at_005": p_value < 0.05,
            "recommendation": f"Deploy {self.model_b}" if p_value < 0.05 and p_b > p_a else f"Keep {self.model_a}"
        }
    
    def run_simulation(self, n_requests: int = 200) -> Dict[str, Any]:
        """Simulate an A/B test."""
        for _ in range(n_requests):
            model = self.route_request()
            # Model B is slightly better in simulation
            if model == self.model_a:
                success = random.random() < 0.72
            else:
                success = random.random() < 0.78
            self.record_outcome(model, success)
        
        return self.compute_significance()


def run_mlops_experiment() -> Dict[str, Any]:
    """Execution helper for ML pipeline."""
    registry = ModelRegistry()
    
    # Register model versions
    v1 = registry.register_model("tutor_llm", ModelMetrics(accuracy=0.82, latency_ms=120, throughput_qps=50), 
                                  description="Baseline tutor model", hyperparams={"lr": 0.001, "epochs": 10})
    v2 = registry.register_model("tutor_llm", ModelMetrics(accuracy=0.87, latency_ms=115, throughput_qps=55),
                                  description="Fine-tuned with RLHF", hyperparams={"lr": 0.0005, "epochs": 20})
    
    # Promote v1 to production
    registry.promote("tutor_llm", 1, ModelStage.PRODUCTION)
    
    # Compare
    comparison = registry.compare_versions("tutor_llm", 1, 2)
    
    # A/B Test
    ab_test = ABTestManager("tutor_llm_v1", "tutor_llm_v2", traffic_split=0.5)
    ab_results = ab_test.run_simulation(300)
    
    return {
        "registry": registry.list_models(),
        "comparison": comparison,
        "ab_test": ab_results,
        "insight": "MLOps lifecycle: Register → Validate → A/B Test → Promote/Rollback."
    }
