# ML-Specific Monitoring and Observability
"""
Comprehensive monitoring for ML services with Prometheus metrics and alerting
"""

import asyncio
import logging
import time
import json
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
import redis.asyncio as redis
import psutil
import threading
from functools import wraps

logger = logging.getLogger(__name__)

# ML-specific metrics
try:
    ML_INFERENCE_REQUESTS = Counter('ml_inference_requests_total', 'Total ML inference requests', ['model', 'status'])
    ML_INFERENCE_LATENCY = Histogram('ml_inference_latency_seconds', 'ML inference latency', ['model', 'optimization'])
    ML_MODEL_ACCURACY = Gauge('ml_model_accuracy', 'ML model accuracy', ['model'])
    ML_MODEL_PERFORMANCE = Gauge('ml_model_performance', 'ML model performance score', ['model'])
    ML_CACHE_HIT_RATE = Gauge('ml_cache_hit_rate', 'ML cache hit rate', ['cache_type'])
    ML_MEMORY_USAGE = Gauge('ml_memory_usage_bytes', 'ML service memory usage', ['service'])
    ML_CPU_USAGE = Gauge('ml_cpu_usage_percent', 'ML service CPU usage', ['service'])
    ML_ACTIVE_CONNECTIONS = Gauge('ml_active_connections', 'Active ML connections', ['service'])
    ML_QUEUE_SIZE = Gauge('ml_queue_size', 'ML request queue size', ['service'])
    ML_ERROR_RATE = Gauge('ml_error_rate', 'ML error rate', ['service', 'error_type'])
    ML_THROUGHPUT = Gauge('ml_throughput_requests_per_second', 'ML throughput', ['service'])
except ValueError:
    from prometheus_client import REGISTRY
    ML_INFERENCE_REQUESTS = REGISTRY._names_to_collectors.get('ml_inference_requests_total')
    ML_INFERENCE_LATENCY = REGISTRY._names_to_collectors.get('ml_inference_latency_seconds')
    ML_MODEL_ACCURACY = REGISTRY._names_to_collectors.get('ml_model_accuracy')
    ML_MODEL_PERFORMANCE = REGISTRY._names_to_collectors.get('ml_model_performance')
    ML_CACHE_HIT_RATE = REGISTRY._names_to_collectors.get('ml_cache_hit_rate')
    ML_MEMORY_USAGE = REGISTRY._names_to_collectors.get('ml_memory_usage_bytes')
    ML_CPU_USAGE = REGISTRY._names_to_collectors.get('ml_cpu_usage_percent')
    ML_ACTIVE_CONNECTIONS = REGISTRY._names_to_collectors.get('ml_active_connections')
    ML_QUEUE_SIZE = REGISTRY._names_to_collectors.get('ml_queue_size')
    ML_ERROR_RATE = REGISTRY._names_to_collectors.get('ml_error_rate')
    ML_THROUGHPUT = REGISTRY._names_to_collectors.get('ml_throughput_requests_per_second')

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

@dataclass
class MLAlert:
    """ML service alert definition."""
    name: str
    severity: AlertSeverity
    condition: str
    threshold: float
    message: str
    service: str
    metric: str
    triggered_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    is_active: bool = False

@dataclass
class MLServiceMetrics:
    """Comprehensive metrics for ML services."""
    service_name: str
    timestamp: datetime
    request_count: int = 0
    error_count: int = 0
    avg_latency: float = 0.0
    p95_latency: float = 0.0
    p99_latency: float = 0.0
    throughput: float = 0.0
    memory_usage: float = 0.0
    cpu_usage: float = 0.0
    cache_hit_rate: float = 0.0
    queue_size: int = 0
    active_connections: int = 0
    model_accuracy: Optional[float] = None
    custom_metrics: Dict[str, float] = field(default_factory=dict)

class MLMetricsCollector:
    """Collects and aggregates ML service metrics."""
    
    def __init__(self):
        self.metrics_history: Dict[str, List[MLServiceMetrics]] = {}
        self.alerts: List[MLAlert] = []
        self.collection_interval = 30  # seconds
        self.redis_client: Optional[redis.Redis] = None
        self._running = False
        self._collection_thread: Optional[threading.Thread] = None
        self._initialize_redis()
        self._setup_default_alerts()
    
    def _initialize_redis(self):
        """Initialize Redis connection for metrics storage."""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            logger.info("ML Metrics Collector connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
    
    def _setup_default_alerts(self):
        """Setup default ML service alerts."""
        default_alerts = [
            MLAlert(
                name="High Inference Latency",
                severity=AlertSeverity.WARNING,
                condition="avg_latency > 0.1",  # 100ms
                threshold=0.1,
                message="ML inference latency exceeds 100ms",
                service="inference",
                metric="avg_latency"
            ),
            MLAlert(
                name="Critical Inference Latency",
                severity=AlertSeverity.CRITICAL,
                condition="avg_latency > 0.5",  # 500ms
                threshold=0.5,
                message="ML inference latency exceeds 500ms",
                service="inference",
                metric="avg_latency"
            ),
            MLAlert(
                name="High Memory Usage",
                severity=AlertSeverity.WARNING,
                condition="memory_usage > 0.8",  # 80%
                threshold=0.8,
                message="ML service memory usage exceeds 80%",
                service="general",
                metric="memory_usage"
            ),
            MLAlert(
                name="Critical Memory Usage",
                severity=AlertSeverity.CRITICAL,
                condition="memory_usage > 0.9",  # 90%
                threshold=0.9,
                message="ML service memory usage exceeds 90%",
                service="general",
                metric="memory_usage"
            ),
            MLAlert(
                name="High Error Rate",
                severity=AlertSeverity.WARNING,
                condition="error_rate > 0.1",  # 10%
                threshold=0.1,
                message="ML service error rate exceeds 10%",
                service="general",
                metric="error_rate"
            ),
            MLAlert(
                name="Critical Error Rate",
                severity=AlertSeverity.CRITICAL,
                condition="error_rate > 0.2",  # 20%
                threshold=0.2,
                message="ML service error rate exceeds 20%",
                service="general",
                metric="error_rate"
            ),
            MLAlert(
                name="Low Cache Hit Rate",
                severity=AlertSeverity.WARNING,
                condition="cache_hit_rate < 0.5",  # 50%
                threshold=0.5,
                message="ML cache hit rate below 50%",
                service="cache",
                metric="cache_hit_rate"
            ),
            MLAlert(
                name="High Queue Size",
                severity=AlertSeverity.WARNING,
                condition="queue_size > 100",
                threshold=100,
                message="ML request queue size exceeds 100",
                service="queue",
                metric="queue_size"
            ),
            MLAlert(
                name="Model Accuracy Drop",
                severity=AlertSeverity.WARNING,
                condition="model_accuracy < 0.8",  # 80%
                threshold=0.8,
                message="ML model accuracy below 80%",
                service="model",
                metric="model_accuracy"
            )
        ]
        
        self.alerts.extend(default_alerts)
    
    def start_collection(self):
        """Start metrics collection in background thread."""
        if self._running:
            return
        
        self._running = True
        self._collection_thread = threading.Thread(target=self._collect_metrics_loop, daemon=True)
        self._collection_thread.start()
        logger.info("ML Metrics collection started")
    
    def stop_collection(self):
        """Stop metrics collection."""
        self._running = False
        if self._collection_thread:
            self._collection_thread.join(timeout=5)
        logger.info("ML Metrics collection stopped")
    
    def _collect_metrics_loop(self):
        """Background loop for collecting metrics."""
        while self._running:
            try:
                self._collect_all_metrics()
                self._check_alerts()
                time.sleep(self.collection_interval)
            except Exception as e:
                logger.error(f"Metrics collection error: {e}")
                time.sleep(5)  # Wait before retrying
    
    def _collect_all_metrics(self):
        """Collect metrics from all ML services."""
        services = ['inference', 'rag', 'recommendations', 'adaptive_learning', 'user_behavior']
        
        for service in services:
            try:
                metrics = self._collect_service_metrics(service)
                self._store_metrics(service, metrics)
            except Exception as e:
                logger.error(f"Error collecting metrics for {service}: {e}")
    
    def _collect_service_metrics(self, service: str) -> MLServiceMetrics:
        """Collect metrics for a specific service."""
        try:
            # Get system metrics
            memory_usage = psutil.virtual_memory().percent / 100
            cpu_usage = psutil.cpu_percent(interval=1) / 100
            
            # Get service-specific metrics
            service_metrics = MLServiceMetrics(
                service_name=service,
                timestamp=timezone.now(),
                memory_usage=memory_usage,
                cpu_usage=cpu_usage
            )
            
            # Collect service-specific metrics based on service type
            if service == 'inference':
                service_metrics = self._collect_inference_metrics(service_metrics)
            elif service == 'rag':
                service_metrics = self._collect_rag_metrics(service_metrics)
            elif service == 'recommendations':
                service_metrics = self._collect_recommendation_metrics(service_metrics)
            elif service == 'adaptive_learning':
                service_metrics = self._collect_adaptive_learning_metrics(service_metrics)
            elif service == 'user_behavior':
                service_metrics = self._collect_user_behavior_metrics(service_metrics)
            
            return service_metrics
            
        except Exception as e:
            logger.error(f"Error collecting {service} metrics: {e}")
            return MLServiceMetrics(service_name=service, timestamp=timezone.now())
    
    def _collect_inference_metrics(self, metrics: MLServiceMetrics) -> MLServiceMetrics:
        """Collect inference service specific metrics."""
        try:
            # Get inference metrics from Redis or local storage
            if self.redis_client:
                # Get recent inference metrics
                recent_metrics = self.redis_client.lrange("ml_inference_metrics", 0, 99)  # Last 100
                
                if recent_metrics:
                    latencies = []
                    error_count = 0
                    
                    for metric_str in recent_metrics:
                        try:
                            metric_data = json.loads(metric_str)
                            if metric_data.get('status') == 'success':
                                latencies.append(metric_data.get('latency', 0))
                            else:
                                error_count += 1
                        except json.JSONDecodeError:
                            continue
                    
                    if latencies:
                        latencies.sort()
                        metrics.avg_latency = sum(latencies) / len(latencies)
                        metrics.p95_latency = latencies[int(len(latencies) * 0.95)]
                        metrics.p99_latency = latencies[int(len(latencies) * 0.99)]
                    
                    metrics.request_count = len(recent_metrics)
                    metrics.error_count = error_count
                    metrics.throughput = len(recent_metrics) / 60  # per second (assuming 1 minute window)
            
            # Get queue size
            queue_size = self.redis_client.llen("ml_inference_queue") if self.redis_client else 0
            metrics.queue_size = queue_size
            
            # Get cache hit rate
            cache_hits = self.redis_client.get("ml_cache_hits") if self.redis_client else 0
            cache_misses = self.redis_client.get("ml_cache_misses") if self.redis_client else 0
            total_cache_requests = int(cache_hits or 0) + int(cache_misses or 0)
            metrics.cache_hit_rate = int(cache_hits or 0) / max(total_cache_requests, 1)
            
            # Get active connections
            metrics.active_connections = self.redis_client.pubsub_numsub("ml_inference_connections") if self.redis_client else 0
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting inference metrics: {e}")
            return metrics
    
    def _collect_rag_metrics(self, metrics: MLServiceMetrics) -> MLServiceMetrics:
        """Collect RAG service specific metrics."""
        try:
            if self.redis_client:
                # Get RAG search metrics
                search_count = int(self.redis_client.get("rag_search_count") or 0)
                search_errors = int(self.redis_client.get("rag_search_errors") or 0)
                
                metrics.request_count = search_count
                metrics.error_count = search_errors
                
                # Get cache hit rate
                cache_hits = int(self.redis_client.get("rag_cache_hits") or 0)
                cache_misses = int(self.redis_client.get("rag_cache_misses") or 0)
                total_requests = cache_hits + cache_misses
                metrics.cache_hit_rate = cache_hits / max(total_requests, 1)
                
                # Get average latency
                total_latency = float(self.redis_client.get("rag_total_latency") or 0)
                metrics.avg_latency = total_latency / max(search_count, 1)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting RAG metrics: {e}")
            return metrics
    
    def _collect_recommendation_metrics(self, metrics: MLServiceMetrics) -> MLServiceMetrics:
        """Collect recommendation service specific metrics."""
        try:
            if self.redis_client:
                # Get recommendation metrics
                rec_count = int(self.redis_client.get("recommendation_count") or 0)
                rec_errors = int(self.redis_client.get("recommendation_errors") or 0)
                
                metrics.request_count = rec_count
                metrics.error_count = rec_errors
                
                # Get cache hit rate
                cache_hits = int(self.redis_client.get("rec_cache_hits") or 0)
                cache_misses = int(self.redis_client.get("rec_cache_misses") or 0)
                total_requests = cache_hits + cache_misses
                metrics.cache_hit_rate = cache_hits / max(total_requests, 1)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting recommendation metrics: {e}")
            return metrics
    
    def _collect_adaptive_learning_metrics(self, metrics: MLServiceMetrics) -> MLServiceMetrics:
        """Collect adaptive learning service specific metrics."""
        try:
            if self.redis_client:
                # Get adaptive learning metrics
                path_count = int(self.redis_client.get("adaptive_path_count") or 0)
                adaptation_count = int(self.redis_client.get("adaptation_count") or 0)
                
                metrics.request_count = path_count + adaptation_count
                
                # Get model accuracy if available
                model_accuracy = self.redis_client.get("adaptive_model_accuracy")
                if model_accuracy:
                    metrics.model_accuracy = float(model_accuracy)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting adaptive learning metrics: {e}")
            return metrics
    
    def _collect_user_behavior_metrics(self, metrics: MLServiceMetrics) -> MLServiceMetrics:
        """Collect user behavior service specific metrics."""
        try:
            if self.redis_client:
                # Get user behavior metrics
                tracking_count = int(self.redis_client.get("behavior_tracking_count") or 0)
                analysis_count = int(self.redis_client.get("behavior_analysis_count") or 0)
                
                metrics.request_count = tracking_count + analysis_count
                
                # Get cache hit rate
                cache_hits = int(self.redis_client.get("behavior_cache_hits") or 0)
                cache_misses = int(self.redis_client.get("behavior_cache_misses") or 0)
                total_requests = cache_hits + cache_misses
                metrics.cache_hit_rate = cache_hits / max(total_requests, 1)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting user behavior metrics: {e}")
            return metrics
    
    def _store_metrics(self, service: str, metrics: MLServiceMetrics):
        """Store metrics in Redis and local history."""
        try:
            # Store in Redis for real-time access
            if self.redis_client:
                metrics_key = f"ml_metrics:{service}:latest"
                metrics_data = {
                    'timestamp': metrics.timestamp.isoformat(),
                    'request_count': metrics.request_count,
                    'error_count': metrics.error_count,
                    'avg_latency': metrics.avg_latency,
                    'p95_latency': metrics.p95_latency,
                    'p99_latency': metrics.p99_latency,
                    'throughput': metrics.throughput,
                    'memory_usage': metrics.memory_usage,
                    'cpu_usage': metrics.cpu_usage,
                    'cache_hit_rate': metrics.cache_hit_rate,
                    'queue_size': metrics.queue_size,
                    'active_connections': metrics.active_connections,
                    'model_accuracy': metrics.model_accuracy
                }
                
                self.redis_client.setex(metrics_key, 300, json.dumps(metrics_data))  # 5 minutes TTL
                
                # Store in time series
                timeseries_key = f"ml_metrics_timeseries:{service}"
                self.redis_client.lpush(timeseries_key, json.dumps(metrics_data))
                self.redis_client.ltrim(timeseries_key, 0, 999)  # Keep last 1000 entries
                self.redis_client.expire(timeseries_key, 86400)  # 24 hours TTL
            
            # Store in local history
            if service not in self.metrics_history:
                self.metrics_history[service] = []
            
            self.metrics_history[service].append(metrics)
            
            # Keep only last 100 entries in memory
            if len(self.metrics_history[service]) > 100:
                self.metrics_history[service] = self.metrics_history[service][-100:]
            
        except Exception as e:
            logger.error(f"Error storing {service} metrics: {e}")
    
    def _check_alerts(self):
        """Check all alerts against current metrics."""
        try:
            for alert in self.alerts:
                # Skip resolved alerts
                if not alert.is_active:
                    continue
                
                # Get current metric value
                current_value = self._get_metric_value(alert.service, alert.metric)
                if current_value is None:
                    continue
                
                # Evaluate alert condition
                should_trigger = self._evaluate_alert_condition(alert.condition, current_value)
                
                if should_trigger and not alert.is_active:
                    # Trigger alert
                    alert.triggered_at = timezone.now()
                    alert.is_active = True
                    self._handle_alert_triggered(alert)
                elif not should_trigger and alert.is_active:
                    # Resolve alert
                    alert.resolved_at = timezone.now()
                    alert.is_active = False
                    self._handle_alert_resolved(alert)
                elif should_trigger and alert.is_active:
                    # Alert is still active, check if re-notification needed
                    if alert.triggered_at and (timezone.now() - alert.triggered_at).total_seconds() > 3600:  # 1 hour
                        self._handle_alert_triggered(alert)  # Re-notify
            
        except Exception as e:
            logger.error(f"Error checking alerts: {e}")
    
    def _get_metric_value(self, service: str, metric: str) -> Optional[float]:
        """Get current value for a specific metric."""
        try:
            # Get latest metrics for the service
            if service in self.metrics_history and self.metrics_history[service]:
                latest_metrics = self.metrics_history[service][-1]
                
                if hasattr(latest_metrics, metric):
                    return getattr(latest_metrics, metric)
                elif metric in latest_metrics.custom_metrics:
                    return latest_metrics.custom_metrics[metric]
            
            # Try Redis if not in local history
            if self.redis_client:
                metrics_key = f"ml_metrics:{service}:latest"
                metrics_data = self.redis_client.get(metrics_key)
                
                if metrics_data:
                    data = json.loads(metrics_data)
                    return data.get(metric)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting metric value for {service}.{metric}: {e}")
            return None
    
    def _evaluate_alert_condition(self, condition: str, value: float) -> bool:
        """Evaluate alert condition."""
        try:
            # Simple condition evaluation (could be extended with a proper expression parser)
            if '>' in condition:
                threshold = float(condition.split('>')[1].strip())
                return value > threshold
            elif '<' in condition:
                threshold = float(condition.split('<')[1].strip())
                return value < threshold
            elif '>=' in condition:
                threshold = float(condition.split('>=')[1].strip())
                return value >= threshold
            elif '<=' in condition:
                threshold = float(condition.split('<=')[1].strip())
                return value <= threshold
            elif '==' in condition:
                threshold = float(condition.split('==')[1].strip())
                return value == threshold
            
            return False
            
        except Exception as e:
            logger.error(f"Error evaluating alert condition '{condition}': {e}")
            return False
    
    def _handle_alert_triggered(self, alert: MLAlert):
        """Handle triggered alert."""
        try:
            logger.warning(f"ALERT TRIGGERED: {alert.name} - {alert.message}")
            
            # Store alert in Redis
            if self.redis_client:
                alert_data = {
                    'name': alert.name,
                    'severity': alert.severity.value,
                    'message': alert.message,
                    'service': alert.service,
                    'metric': alert.metric,
                    'triggered_at': alert.triggered_at.isoformat() if alert.triggered_at else None,
                    'is_active': True
                }
                
                self.redis_client.lpush("ml_alerts", json.dumps(alert_data))
                self.redis_client.ltrim("ml_alerts", 0, 99)  # Keep last 100 alerts
            
            # Could send to external monitoring system here
            # e.g., Slack, PagerDuty, etc.
            
        except Exception as e:
            logger.error(f"Error handling alert triggered: {e}")
    
    def _handle_alert_resolved(self, alert: MLAlert):
        """Handle resolved alert."""
        try:
            logger.info(f"ALERT RESOLVED: {alert.name}")
            
            # Update alert in Redis
            if self.redis_client:
                alert_data = {
                    'name': alert.name,
                    'severity': alert.severity.value,
                    'message': alert.message,
                    'service': alert.service,
                    'metric': alert.metric,
                    'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None,
                    'is_active': False
                }
                
                self.redis_client.lpush("ml_alerts", json.dumps(alert_data))
                self.redis_client.ltrim("ml_alerts", 0, 99)
            
        except Exception as e:
            logger.error(f"Error handling alert resolved: {e}")
    
    def get_metrics_summary(self, service: Optional[str] = None) -> Dict[str, Any]:
        """Get summary of current metrics."""
        try:
            summary = {
                'timestamp': timezone.now().isoformat(),
                'services': {}
            }
            
            services_to_check = [service] if service else self.metrics_history.keys()
            
            for svc in services_to_check:
                if svc in self.metrics_history and self.metrics_history[svc]:
                    latest_metrics = self.metrics_history[svc][-1]
                    
                    summary['services'][svc] = {
                        'request_count': latest_metrics.request_count,
                        'error_count': latest_metrics.error_count,
                        'error_rate': latest_metrics.error_count / max(latest_metrics.request_count, 1),
                        'avg_latency': latest_metrics.avg_latency,
                        'p95_latency': latest_metrics.p95_latency,
                        'p99_latency': latest_metrics.p99_latency,
                        'throughput': latest_metrics.throughput,
                        'memory_usage': latest_metrics.memory_usage,
                        'cpu_usage': latest_metrics.cpu_usage,
                        'cache_hit_rate': latest_metrics.cache_hit_rate,
                        'queue_size': latest_metrics.queue_size,
                        'active_connections': latest_metrics.active_connections,
                        'model_accuracy': latest_metrics.model_accuracy
                    }
            
            # Add active alerts
            summary['active_alerts'] = [
                {
                    'name': alert.name,
                    'severity': alert.severity.value,
                    'message': alert.message,
                    'service': alert.service,
                    'triggered_at': alert.triggered_at.isoformat() if alert.triggered_at else None
                }
                for alert in self.alerts if alert.is_active
            ]
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting metrics summary: {e}")
            return {'error': str(e)}
    
    def get_prometheus_metrics(self) -> str:
        """Get metrics in Prometheus format."""
        try:
            registry = CollectorRegistry()
            
            # Add custom metrics to registry
            registry.register(ML_INFERENCE_REQUESTS)
            registry.register(ML_INFERENCE_LATENCY)
            registry.register(ML_MODEL_ACCURACY)
            registry.register(ML_MODEL_PERFORMANCE)
            registry.register(ML_CACHE_HIT_RATE)
            registry.register(ML_MEMORY_USAGE)
            registry.register(ML_CPU_USAGE)
            registry.register(ML_ACTIVE_CONNECTIONS)
            registry.register(ML_QUEUE_SIZE)
            registry.register(ML_ERROR_RATE)
            registry.register(ML_THROUGHPUT)
            
            # Update gauge values with latest metrics
            for service, metrics_list in self.metrics_history.items():
                if metrics_list:
                    latest_metrics = metrics_list[-1]
                    
                    # Update gauges
                    ML_MEMORY_USAGE.labels(service=service).set(latest_metrics.memory_usage * 1024 * 1024 * 1024)  # Convert to bytes
                    ML_CPU_USAGE.labels(service=service).set(latest_metrics.cpu_usage * 100)  # Convert to percent
                    ML_ACTIVE_CONNECTIONS.labels(service=service).set(latest_metrics.active_connections)
                    ML_QUEUE_SIZE.labels(service=service).set(latest_metrics.queue_size)
                    ML_CACHE_HIT_RATE.labels(service=service).set(latest_metrics.cache_hit_rate)
                    ML_THROUGHPUT.labels(service=service).set(latest_metrics.throughput)
                    
                    if latest_metrics.model_accuracy:
                        ML_MODEL_ACCURACY.labels(model=service).set(latest_metrics.model_accuracy)
            
            return generate_latest(registry).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Error getting Prometheus metrics: {e}")
            return ""

# Decorators for automatic metrics collection
def track_ml_metrics(service: str, operation: str = "inference"):
    """Decorator to automatically track ML operation metrics."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            error_type = None
            
            try:
                result = await func(*args, **kwargs)
                return result
                
            except Exception as e:
                success = False
                error_type = type(e).__name__
                raise
                
            finally:
                # Record metrics
                end_time = time.time()
                latency = end_time - start_time
                
                ML_INFERENCE_REQUESTS.labels(model=service, status='success' if success else 'error').inc()
                ML_INFERENCE_LATENCY.labels(model=service, optimization='standard').observe(latency)
                
                # Store in Redis for detailed analysis
                try:
                    from django.conf import settings
                    redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
                    
                    metric_data = {
                        'service': service,
                        'operation': operation,
                        'latency': latency,
                        'timestamp': timezone.now().isoformat(),
                        'success': success,
                        'error_type': error_type
                    }
                    
                    redis_client.lpush("ml_operation_metrics", json.dumps(metric_data))
                    redis_client.ltrim("ml_operation_metrics", 0, 999)  # Keep last 1000
                    
                except Exception as e:
                    logger.error(f"Error storing operation metrics: {e}")
        
        return wrapper
    return decorator

def track_cache_performance(cache_type: str):
    """Decorator to track cache performance."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_hit = False
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                cache_hit = True  # Assume cache hit if no exception
                return result
                
            except Exception as e:
                cache_hit = False
                raise
                
            finally:
                # Record cache metrics
                try:
                    from django.conf import settings
                    redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
                    
                    if cache_hit:
                        redis_client.incr(f"{cache_type}_cache_hits")
                    else:
                        redis_client.incr(f"{cache_type}_cache_misses")
                    
                except Exception as e:
                    logger.error(f"Error recording cache metrics: {e}")
        
        return wrapper
    return decorator

# Global metrics collector instance
ml_metrics_collector = MLMetricsCollector()

# Metrics API endpoints
class MLMetricsAPI:
    """API endpoints for ML metrics."""
    
    def __init__(self, metrics_collector: MLMetricsCollector):
        self.metrics_collector = metrics_collector
    
    async def get_metrics_summary(self, service: Optional[str] = None) -> Dict[str, Any]:
        """Get metrics summary for all or specific service."""
        return self.metrics_collector.get_metrics_summary(service)
    
    async def get_prometheus_metrics(self) -> str:
        """Get metrics in Prometheus format."""
        return self.metrics_collector.get_prometheus_metrics()
    
    async def get_service_metrics(self, service: str, hours: int = 1) -> List[Dict[str, Any]]:
        """Get historical metrics for a service."""
        try:
            from django.conf import settings
            redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
            
            timeseries_key = f"ml_metrics_timeseries:{service}"
            metrics_data = redis_client.lrange(timeseries_key, 0, -1)
            
            # Parse and filter by time
            cutoff_time = timezone.now() - timedelta(hours=hours)
            filtered_metrics = []
            
            for metric_str in metrics_data:
                try:
                    metric_data = json.loads(metric_str)
                    metric_time = datetime.fromisoformat(metric_data['timestamp'].replace('Z', '+00:00'))
                    
                    if metric_time >= cutoff_time:
                        filtered_metrics.append(metric_data)
                        
                except (json.JSONDecodeError, ValueError):
                    continue
            
            return filtered_metrics
            
        except Exception as e:
            logger.error(f"Error getting service metrics: {e}")
            return []
    
    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get active alerts."""
        return [
            {
                'name': alert.name,
                'severity': alert.severity.value,
                'message': alert.message,
                'service': alert.service,
                'metric': alert.metric,
                'threshold': alert.threshold,
                'triggered_at': alert.triggered_at.isoformat() if alert.triggered_at else None
            }
            for alert in self.metrics_collector.alerts if alert.is_active
        ]
    
    async def get_alert_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get alert history."""
        try:
            from django.conf import settings
            redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
            
            alert_data = redis_client.lrange("ml_alerts", 0, -1)
            
            # Parse and filter by time
            cutoff_time = timezone.now() - timedelta(hours=hours)
            filtered_alerts = []
            
            for alert_str in alert_data:
                try:
                    alert = json.loads(alert_str)
                    
                    # Parse timestamps
                    if alert.get('triggered_at'):
                        triggered_time = datetime.fromisoformat(alert['triggered_at'].replace('Z', '+00:00'))
                        if triggered_time >= cutoff_time:
                            filtered_alerts.append(alert)
                    
                    if alert.get('resolved_at'):
                        resolved_time = datetime.fromisoformat(alert['resolved_at'].replace('Z', '+00:00'))
                        if resolved_time >= cutoff_time:
                            filtered_alerts.append(alert)
                            
                except (json.JSONDecodeError, ValueError):
                    continue
            
            return filtered_alerts
            
        except Exception as e:
            logger.error(f"Error getting alert history: {e}")
            return []

# Global metrics API instance
ml_metrics_api = MLMetricsAPI(ml_metrics_collector)
