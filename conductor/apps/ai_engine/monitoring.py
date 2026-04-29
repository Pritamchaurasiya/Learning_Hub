
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional
from django.conf import settings
from django.utils import timezone
import structlog

logger = structlog.get_logger(__name__)

@dataclass
class ModelMetrics:
    model_name: str
    latency_ms: float
    token_usage: Dict[str, int]
    success: bool
    error: Optional[str] = None
    timestamp: float = 0.0

    def __post_init__(self):
        self.timestamp = time.time()

class AIModelMonitor:
    """
    Monitors AI model performance, latency, and drift.
    Integrates with structural logging and Django Prometheus if available.
    """
    
    def __init__(self):
        self.logger = logger.bind(component="ai_monitor")

    def log_inference(self, metrics: ModelMetrics):
        """
        Logs inference metrics for observability.
        """
        log_method = self.logger.info if metrics.success else self.logger.error
        
        log_method(
            "ai_model_inference",
            model=metrics.model_name,
            latency_ms=f"{metrics.latency_ms:.2f}",
            tokens=metrics.token_usage,
            success=metrics.success,
            error=metrics.error,
            timestamp=timezone.now().isoformat()
        )

        # Here you could also send metrics to Datadog, Prometheus, or a custom DB table
        # e.g., self._record_prometheus(metrics)

    def start_timer(self) -> float:
        return time.perf_counter()

    def stop_timer(self, start_time: float) -> float:
        return (time.perf_counter() - start_time) * 1000  # Convert to ms

import numpy as np
from django.db.models import QuerySet

class DriftDetector:
    """
    Phase 51: Machine Learning Observability.
    Detects statistical Data Drift via Population Stability Index (PSI).
    Monitors if the foundational data distribution the World Models and Causal engines
    rely upon has shifted significantly over time, requiring model retraining.
    """
    
    @staticmethod
    def calculate_psi(expected: np.ndarray, actual: np.ndarray, buckets: int = 10) -> float:
        """
        Calculates the Population Stability Index comparing an expected (historical) 
        distribution versus an actual (recent) distribution.
        
        PSI < 0.1: No significant change
        0.1 <= PSI <= 0.2: Moderate shift (monitor)
        PSI > 0.2: Significant shift (retrain needed)
        """
        def build_buckets(data: np.ndarray, num_buckets: int):
            breakpoints = np.arange(0, num_buckets + 1) / num_buckets * 100
            q = np.percentile(data, breakpoints)
            # Add small epsilon to max to include highest values in the last bin
            q[-1] += 1e-6 
            return q

        if len(expected) == 0 or len(actual) == 0:
            return 0.0

        breakpoints = build_buckets(expected, buckets)
        
        expected_percents = np.histogram(expected, breakpoints)[0] / len(expected)
        actual_percents = np.histogram(actual, breakpoints)[0] / len(actual)

        # Replace 0s with a tiny epsilon to avoid division by zero
        expected_percents = np.where(expected_percents == 0, 0.0001, expected_percents)
        actual_percents = np.where(actual_percents == 0, 0.0001, actual_percents)

        psi_values = (actual_percents - expected_percents) * np.log(actual_percents / expected_percents)
        return float(np.sum(psi_values))

    @classmethod
    def detect_data_drift(cls, historical_qs: QuerySet, recent_qs: QuerySet, field: str) -> float:
        """
        Calculates PSI for a specific Django float/integer field across two QuerySets.
        """
        expected_data = np.array(list(historical_qs.values_list(field, flat=True).exclude(**{field: None})), dtype=float)
        actual_data = np.array(list(recent_qs.values_list(field, flat=True).exclude(**{field: None})), dtype=float)

        if len(expected_data) < 10 or len(actual_data) < 10:
            logger.warning(f"Insufficient data for drift detection on {field}.")
            return 0.0

        psi = cls.calculate_psi(expected_data, actual_data)
        logger.info("drift_detection", field=field, psi=round(psi, 3), status="drifted" if psi > 0.2 else "stable")
        return psi

monitor = AIModelMonitor()
