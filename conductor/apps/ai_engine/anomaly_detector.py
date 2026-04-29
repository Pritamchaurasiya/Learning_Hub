import math
import logging
from typing import List, Dict, Tuple, Optional
from collections import deque
from datetime import datetime, timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)


class ExponentialMovingAverage:
    """
    Online EMA calculator for streaming time-series data.
    
    EMA_t = α * x_t + (1 - α) * EMA_{t-1}
    """
    
    def __init__(self, alpha: float = 0.3):
        self.alpha = alpha
        self.value: Optional[float] = None
    
    def update(self, x: float) -> float:
        if self.value is None:
            self.value = x
        else:
            self.value = self.alpha * x + (1 - self.alpha) * self.value
        return self.value
    
    def get(self) -> Optional[float]:
        return self.value


class TimeSeriesAnomalyDetector:
    """
    Phase 58: Statistical Time-Series Anomaly Detection.
    
    Uses a sliding window Z-Score method combined with Exponential Moving 
    Average (EMA) to detect anomalous spikes or drops in platform metrics
    (login frequency, quiz scores, API latency, error rates).
    
    An observation is flagged anomalous if:
    |x - μ_window| > k * σ_window   (where k = sensitivity threshold)
    """
    
    def __init__(self, window_size: int = 50, z_threshold: float = 2.5):
        """
        Args:
            window_size: Number of recent observations in the sliding window.
            z_threshold: Z-Score multiplier for anomaly detection.
        """
        self.window_size = window_size
        self.z_threshold = z_threshold
        self.window: deque = deque(maxlen=window_size)
        self.ema = ExponentialMovingAverage(alpha=0.2)
        self.anomalies: List[Dict] = []
    
    def _window_stats(self) -> Tuple[float, float]:
        """Calculate mean and std of the current window."""
        if len(self.window) < 2:
            return 0.0, 1.0
        
        n = len(self.window)
        mean = sum(self.window) / n
        variance = sum((x - mean) ** 2 for x in self.window) / (n - 1)
        std = math.sqrt(max(variance, 1e-10))
        
        return mean, std
    
    def detect(self, value: float, timestamp: Optional[datetime] = None,
               label: str = "metric") -> Dict:
        """
        Process a single observation and check for anomalies.
        
        Args:
            value: The metric value to check.
            timestamp: When the observation occurred.
            label: Human-readable label for the metric.
            
        Returns:
            Dict with is_anomaly, z_score, ema, and details.
        """
        if timestamp is None:
            timestamp = timezone.now()
        
        self.window.append(value)
        ema_value = self.ema.update(value)
        mean, std = self._window_stats()
        
        z_score = (value - mean) / std if std > 1e-10 else 0.0
        is_anomaly = abs(z_score) > self.z_threshold
        
        result = {
            'value': round(value, 4),
            'timestamp': timestamp.isoformat() if hasattr(timestamp, 'isoformat') else str(timestamp),
            'label': label,
            'z_score': round(z_score, 4),
            'ema': round(ema_value, 4),
            'window_mean': round(mean, 4),
            'window_std': round(std, 4),
            'is_anomaly': is_anomaly,
            'direction': 'spike' if z_score > 0 else 'drop' if z_score < 0 else 'normal'
        }
        
        if is_anomaly:
            self.anomalies.append(result)
            logger.warning(
                "🚨 ANOMALY DETECTED [%s]: value=%.4f, z=%.4f, direction=%s",
                label, value, z_score, result['direction']
            )
        
        return result
    
    def batch_detect(self, series: List[Tuple[float, datetime]],
                     label: str = "metric") -> List[Dict]:
        """
        Process a batch of time-series observations.
        
        Args:
            series: List of (value, timestamp) tuples in chronological order.
            
        Returns:
            List of detection results, with anomalies flagged.
        """
        results = []
        for value, ts in series:
            results.append(self.detect(value, timestamp=ts, label=label))
        return results
    
    def get_anomaly_summary(self) -> Dict:
        """Returns a summary of all detected anomalies."""
        if not self.anomalies:
            return {
                'total_anomalies': 0,
                'spike_count': 0,
                'drop_count': 0,
                'anomalies': []
            }
        
        spikes = [a for a in self.anomalies if a['direction'] == 'spike']
        drops = [a for a in self.anomalies if a['direction'] == 'drop']
        
        return {
            'total_anomalies': len(self.anomalies),
            'spike_count': len(spikes),
            'drop_count': len(drops),
            'max_z_score': round(max(abs(a['z_score']) for a in self.anomalies), 4),
            'anomalies': self.anomalies[-20:]  # Last 20 anomalies
        }


class MultiMetricMonitor:
    """
    Monitors multiple platform metrics simultaneously for anomalies.
    """
    
    def __init__(self, z_threshold: float = 2.5):
        self.detectors: Dict[str, TimeSeriesAnomalyDetector] = {}
        self.z_threshold = z_threshold
    
    def observe(self, metric_name: str, value: float,
                timestamp: Optional[datetime] = None) -> Dict:
        """Record an observation for a named metric."""
        if metric_name not in self.detectors:
            self.detectors[metric_name] = TimeSeriesAnomalyDetector(
                z_threshold=self.z_threshold
            )
        return self.detectors[metric_name].detect(
            value, timestamp=timestamp, label=metric_name
        )
    
    def get_all_anomalies(self) -> Dict[str, Dict]:
        """Get anomaly summaries across all monitored metrics."""
        return {
            name: detector.get_anomaly_summary()
            for name, detector in self.detectors.items()
        }
