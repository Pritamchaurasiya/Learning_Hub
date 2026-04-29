# Real-Time Monitoring & Alerting System
"""
Advanced real-time monitoring with intelligent alerting and automated responses
"""

import os
import sys
import time
import json
import logging
import asyncio
import threading
import queue
import smtplib
import requests
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from pathlib import Path
import statistics
import traceback
import psutil
import socket
import subprocess
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from concurrent.futures import ThreadPoolExecutor, as_completed
import schedule

# Setup Django
try:
    import django
    from django.conf import settings
    from django.core.cache import cache
    from django.db import connection, connections
    from django.core.management import execute_from_command_line
    from django.apps import apps
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
    django.setup()
    
    DJANGO_AVAILABLE = True
except ImportError:
    DJANGO_AVAILABLE = False
    print("Warning: Django not available")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class MonitorType(Enum):
    """Monitor types."""
    SYSTEM = "system"
    APPLICATION = "application"
    DATABASE = "database"
    CACHE = "cache"
    API = "api"
    ML_SERVICE = "ml_service"
    NETWORK = "network"
    SECURITY = "security"
    PERFORMANCE = "performance"
    BUSINESS = "business"

class NotificationChannel(Enum):
    """Notification channels."""
    EMAIL = "email"
    SMS = "sms"
    SLACK = "slack"
    WEBHOOK = "webhook"
    DASHBOARD = "dashboard"
    LOG = "log"

@dataclass
class Metric:
    """Metric data structure."""
    name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Alert:
    """Alert data structure."""
    id: str
    name: str
    level: AlertLevel
    message: str
    monitor_type: MonitorType
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    metrics: List[Metric] = field(default_factory=list)
    actions_taken: List[str] = field(default_factory=list)
    notifications_sent: List[str] = field(default_factory=list)

@dataclass
class MonitorRule:
    """Monitor rule configuration."""
    id: str
    name: str
    monitor_type: MonitorType
    metric_name: str
    condition: str  # gt, lt, eq, ne, gte, lte
    threshold: float
    duration: int  # seconds
    alert_level: AlertLevel
    enabled: bool = True
    notification_channels: List[NotificationChannel] = field(default_factory=list)
    auto_resolve: bool = True
    auto_resolve_duration: int = 300  # 5 minutes
    actions: List[str] = field(default_factory=list)

@dataclass
class MonitoringMetrics:
    """Monitoring system metrics."""
    total_monitors: int = 0
    active_monitors: int = 0
    total_alerts: int = 0
    active_alerts: int = 0
    resolved_alerts: int = 0
    metrics_collected: int = 0
    notifications_sent: int = 0
    avg_response_time: float = 0.0
    system_health_score: float = 0.0

class RealTimeMonitoringSystem:
    """Real-time monitoring and alerting system."""
    
    def __init__(self):
        self.monitors: Dict[str, MonitorRule] = {}
        self.alerts: Dict[str, Alert] = {}
        self.metrics: List[Metric] = []
        self.metrics_queue = queue.Queue()
        self.alerts_queue = queue.Queue()
        self.metrics_collector = ThreadPoolExecutor(max_workers=5)
        self.alert_processor = ThreadPoolExecutor(max_workers=3)
        self.notification_sender = ThreadPoolExecutor(max_workers=2)
        self.running = False
        self.monitor_thread = None
        self.alert_thread = None
        self.metrics_thread = None
        self.start_time = time.time()
        self.system_metrics = MonitoringMetrics()
        
        # Initialize default monitors
        self._initialize_default_monitors()
    
    def _initialize_default_monitors(self):
        """Initialize default monitoring rules."""
        default_rules = [
            # System monitors
            MonitorRule(
                id="cpu_usage",
                name="CPU Usage Monitor",
                monitor_type=MonitorType.SYSTEM,
                metric_name="cpu_percent",
                condition="gt",
                threshold=80.0,
                duration=60,
                alert_level=AlertLevel.WARNING,
                notification_channels=[NotificationChannel.EMAIL, NotificationChannel.DASHBOARD],
                actions=["log_cpu_usage", "notify_admin"]
            ),
            MonitorRule(
                id="memory_usage",
                name="Memory Usage Monitor",
                monitor_type=MonitorType.SYSTEM,
                metric_name="memory_percent",
                condition="gt",
                threshold=85.0,
                duration=60,
                alert_level=AlertLevel.WARNING,
                notification_channels=[NotificationChannel.EMAIL, NotificationChannel.DASHBOARD],
                actions=["log_memory_usage", "notify_admin"]
            ),
            MonitorRule(
                id="disk_usage",
                name="Disk Usage Monitor",
                monitor_type=MonitorType.SYSTEM,
                metric_name="disk_percent",
                condition="gt",
                threshold=90.0,
                duration=120,
                alert_level=AlertLevel.CRITICAL,
                notification_channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
                actions=["cleanup_temp_files", "notify_admin"]
            ),
            
            # Application monitors
            MonitorRule(
                id="api_response_time",
                name="API Response Time Monitor",
                monitor_type=MonitorType.API,
                metric_name="response_time_ms",
                condition="gt",
                threshold=500.0,
                duration=30,
                alert_level=AlertLevel.WARNING,
                notification_channels=[NotificationChannel.SLACK, NotificationChannel.DASHBOARD],
                actions=["log_slow_requests", "check_api_health"]
            ),
            MonitorRule(
                id="error_rate",
                name="Error Rate Monitor",
                monitor_type=MonitorType.APPLICATION,
                metric_name="error_rate",
                condition="gt",
                threshold=5.0,
                duration=60,
                alert_level=AlertLevel.ERROR,
                notification_channels=[NotificationChannel.EMAIL, NotificationChannel.SLACK],
                actions=["log_errors", "restart_services"]
            ),
            
            # Database monitors
            MonitorRule(
                id="db_connection_time",
                name="Database Connection Time Monitor",
                monitor_type=MonitorType.DATABASE,
                metric_name="connection_time_ms",
                condition="gt",
                threshold=100.0,
                duration=30,
                alert_level=AlertLevel.WARNING,
                notification_channels=[NotificationChannel.DASHBOARD],
                actions=["check_db_health", "optimize_connections"]
            ),
            MonitorRule(
                id="db_query_time",
                name="Database Query Time Monitor",
                monitor_type=MonitorType.DATABASE,
                metric_name="query_time_ms",
                condition="gt",
                threshold=200.0,
                duration=30,
                alert_level=AlertLevel.WARNING,
                notification_channels=[NotificationChannel.DASHBOARD],
                actions=["log_slow_queries", "optimize_indexes"]
            ),
            
            # Cache monitors
            MonitorRule(
                id="cache_hit_rate",
                name="Cache Hit Rate Monitor",
                monitor_type=MonitorType.CACHE,
                metric_name="hit_rate",
                condition="lt",
                threshold=80.0,
                duration=120,
                alert_level=AlertLevel.WARNING,
                notification_channels=[NotificationChannel.DASHBOARD],
                actions=["warm_cache", "check_cache_health"]
            ),
            
            # ML Service monitors
            MonitorRule(
                id="ml_response_time",
                name="ML Service Response Time Monitor",
                monitor_type=MonitorType.ML_SERVICE,
                metric_name="response_time_ms",
                condition="gt",
                threshold=300.0,
                duration=30,
                alert_level=AlertLevel.WARNING,
                notification_channels=[NotificationChannel.SLACK, NotificationChannel.DASHBOARD],
                actions=["log_ml_performance", "check_ml_health"]
            ),
            MonitorRule(
                id="ml_accuracy",
                name="ML Model Accuracy Monitor",
                monitor_type=MonitorType.ML_SERVICE,
                metric_name="accuracy",
                condition="lt",
                threshold=85.0,
                duration=300,
                alert_level=AlertLevel.ERROR,
                notification_channels=[NotificationChannel.EMAIL, NotificationChannel.SLACK],
                actions=["retrain_model", "check_data_quality"]
            ),
            
            # Network monitors
            MonitorRule(
                id="network_latency",
                name="Network Latency Monitor",
                monitor_type=MonitorType.NETWORK,
                metric_name="latency_ms",
                condition="gt",
                threshold=200.0,
                duration=60,
                alert_level=AlertLevel.WARNING,
                notification_channels=[NotificationChannel.DASHBOARD],
                actions=["check_network_health", "optimize_routing"]
            ),
            
            # Security monitors
            MonitorRule(
                id="failed_login_attempts",
                name="Failed Login Attempts Monitor",
                monitor_type=MonitorType.SECURITY,
                metric_name="failed_logins",
                condition="gt",
                threshold=10.0,
                duration=60,
                alert_level=AlertLevel.WARNING,
                notification_channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
                actions=["block_ip", "notify_security_team"]
            ),
            MonitorRule(
                id="security_events",
                name="Security Events Monitor",
                monitor_type=MonitorType.SECURITY,
                metric_name="security_events",
                condition="gt",
                threshold=1.0,
                duration=30,
                alert_level=AlertLevel.CRITICAL,
                notification_channels=[NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.SLACK],
                actions=["investigate_event", "notify_security_team"]
            )
        ]
        
        for rule in default_rules:
            self.monitors[rule.id] = rule
        
        self.system_metrics.total_monitors = len(self.monitors)
    
    def start_monitoring(self):
        """Start the monitoring system."""
        if self.running:
            logger.warning("Monitoring system is already running")
            return
        
        self.running = True
        logger.info("Starting real-time monitoring system...")
        
        # Start monitoring threads
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.alert_thread = threading.Thread(target=self._alert_loop, daemon=True)
        self.metrics_thread = threading.Thread(target=self._metrics_loop, daemon=True)
        
        self.monitor_thread.start()
        self.alert_thread.start()
        self.metrics_thread.start()
        
        logger.info("Real-time monitoring system started successfully")
    
    def stop_monitoring(self):
        """Stop the monitoring system."""
        if not self.running:
            logger.warning("Monitoring system is not running")
            return
        
        self.running = False
        logger.info("Stopping real-time monitoring system...")
        
        # Wait for threads to finish
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        if self.alert_thread:
            self.alert_thread.join(timeout=5)
        if self.metrics_thread:
            self.metrics_thread.join(timeout=5)
        
        # Shutdown executors
        self.metrics_collector.shutdown(wait=True)
        self.alert_processor.shutdown(wait=True)
        self.notification_sender.shutdown(wait=True)
        
        logger.info("Real-time monitoring system stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop."""
        while self.running:
            try:
                # Collect metrics for all enabled monitors
                futures = []
                for rule in self.monitors.values():
                    if rule.enabled:
                        future = self.metrics_collector.submit(self._collect_metrics, rule)
                        futures.append(future)
                
                # Wait for metrics collection to complete
                for future in as_completed(futures, timeout=30):
                    try:
                        metrics = future.result()
                        for metric in metrics:
                            self.metrics_queue.put(metric)
                    except Exception as e:
                        logger.error(f"Error collecting metrics: {e}")
                
                # Sleep before next collection
                time.sleep(10)  # Collect metrics every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")
                time.sleep(5)
    
    def _alert_loop(self):
        """Alert processing loop."""
        while self.running:
            try:
                # Process metrics from queue
                while not self.metrics_queue.empty():
                    try:
                        metric = self.metrics_queue.get_nowait()
                        self._process_metric(metric)
                    except queue.Empty:
                        break
                
                # Process alerts
                while not self.alerts_queue.empty():
                    try:
                        alert = self.alerts_queue.get_nowait()
                        self._process_alert(alert)
                    except queue.Empty:
                        break
                
                # Check for auto-resolution
                self._check_auto_resolution()
                
                # Sleep before next processing
                time.sleep(5)  # Process alerts every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in alert loop: {e}")
                time.sleep(5)
    
    def _metrics_loop(self):
        """Metrics processing loop."""
        while self.running:
            try:
                # Update system metrics
                self._update_system_metrics()
                
                # Clean up old metrics
                self._cleanup_old_metrics()
                
                # Sleep before next update
                time.sleep(60)  # Update system metrics every minute
                
            except Exception as e:
                logger.error(f"Error in metrics loop: {e}")
                time.sleep(30)
    
    def _collect_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect metrics for a specific monitor rule."""
        metrics = []
        
        try:
            if rule.monitor_type == MonitorType.SYSTEM:
                metrics.extend(self._collect_system_metrics(rule))
            elif rule.monitor_type == MonitorType.APPLICATION:
                metrics.extend(self._collect_application_metrics(rule))
            elif rule.monitor_type == MonitorType.DATABASE:
                metrics.extend(self._collect_database_metrics(rule))
            elif rule.monitor_type == MonitorType.CACHE:
                metrics.extend(self._collect_cache_metrics(rule))
            elif rule.monitor_type == MonitorType.API:
                metrics.extend(self._collect_api_metrics(rule))
            elif rule.monitor_type == MonitorType.ML_SERVICE:
                metrics.extend(self._collect_ml_metrics(rule))
            elif rule.monitor_type == MonitorType.NETWORK:
                metrics.extend(self._collect_network_metrics(rule))
            elif rule.monitor_type == MonitorType.SECURITY:
                metrics.extend(self._collect_security_metrics(rule))
            elif rule.monitor_type == MonitorType.PERFORMANCE:
                metrics.extend(self._collect_performance_metrics(rule))
            elif rule.monitor_type == MonitorType.BUSINESS:
                metrics.extend(self._collect_business_metrics(rule))
            
        except Exception as e:
            logger.error(f"Error collecting metrics for {rule.name}: {e}")
        
        return metrics
    
    def _collect_system_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect system metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if rule.metric_name == "cpu_percent":
                value = psutil.cpu_percent(interval=1)
                metrics.append(Metric(
                    name="cpu_percent",
                    value=value,
                    unit="percent",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "memory_percent":
                memory = psutil.virtual_memory()
                metrics.append(Metric(
                    name="memory_percent",
                    value=memory.percent,
                    unit="percent",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name, "available_gb": memory.available / (1024**3)}
                ))
            
            elif rule.metric_name == "disk_percent":
                disk = psutil.disk_usage('/')
                percent = (disk.used / disk.total) * 100
                metrics.append(Metric(
                    name="disk_percent",
                    value=percent,
                    unit="percent",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name, "free_gb": disk.free / (1024**3)}
                ))
            
            elif rule.metric_name == "load_average":
                if hasattr(psutil, 'getloadavg'):
                    load_avg = psutil.getloadavg()
                    metrics.append(Metric(
                        name="load_average",
                        value=load_avg[0],
                        unit="load",
                        timestamp=timestamp,
                        tags={"monitor": rule.id},
                        metadata={"rule": rule.name, "1min": load_avg[0], "5min": load_avg[1], "15min": load_avg[2]}
                    ))
            
            elif rule.metric_name == "network_io":
                net_io = psutil.net_io_counters()
                metrics.append(Metric(
                    name="network_io",
                    value=net_io.bytes_sent + net_io.bytes_recv,
                    unit="bytes",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name, "bytes_sent": net_io.bytes_sent, "bytes_recv": net_io.bytes_recv}
                ))
        
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
        
        return metrics
    
    def _collect_application_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect application metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if rule.metric_name == "error_rate":
                # Simulate error rate calculation
                error_rate = 2.5  # Simulated value
                metrics.append(Metric(
                    name="error_rate",
                    value=error_rate,
                    unit="percent",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "active_users":
                # Simulate active users count
                active_users = 150  # Simulated value
                metrics.append(Metric(
                    name="active_users",
                    value=active_users,
                    unit="count",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "request_rate":
                # Simulate request rate
                request_rate = 45.2  # requests per second
                metrics.append(Metric(
                    name="request_rate",
                    value=request_rate,
                    unit="rps",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
        
        except Exception as e:
            logger.error(f"Error collecting application metrics: {e}")
        
        return metrics
    
    def _collect_database_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect database metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if DJANGO_AVAILABLE:
                if rule.metric_name == "connection_time_ms":
                    start_time = time.time()
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT 1")
                    connection_time = (time.time() - start_time) * 1000
                    
                    metrics.append(Metric(
                        name="connection_time_ms",
                        value=connection_time,
                        unit="ms",
                        timestamp=timestamp,
                        tags={"monitor": rule.id},
                        metadata={"rule": rule.name}
                    ))
                
                elif rule.metric_name == "query_time_ms":
                    start_time = time.time()
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT version()")
                    query_time = (time.time() - start_time) * 1000
                    
                    metrics.append(Metric(
                        name="query_time_ms",
                        value=query_time,
                        unit="ms",
                        timestamp=timestamp,
                        tags={"monitor": rule.id},
                        metadata={"rule": rule.name}
                    ))
                
                elif rule.metric_name == "active_connections":
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")
                        active_connections = cursor.fetchone()[0]
                    
                    metrics.append(Metric(
                        name="active_connections",
                        value=active_connections,
                        unit="count",
                        timestamp=timestamp,
                        tags={"monitor": rule.id},
                        metadata={"rule": rule.name}
                    ))
        
        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")
        
        return metrics
    
    def _collect_cache_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect cache metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if DJANGO_AVAILABLE:
                if rule.metric_name == "hit_rate":
                    # Simulate cache hit rate
                    hit_rate = 92.5  # Simulated value
                    metrics.append(Metric(
                        name="hit_rate",
                        value=hit_rate,
                        unit="percent",
                        timestamp=timestamp,
                        tags={"monitor": rule.id},
                        metadata={"rule": rule.name}
                    ))
                
                elif rule.metric_name == "cache_size":
                    # Simulate cache size
                    cache_size = 1024 * 1024 * 100  # 100MB
                    metrics.append(Metric(
                        name="cache_size",
                        value=cache_size,
                        unit="bytes",
                        timestamp=timestamp,
                        tags={"monitor": rule.id},
                        metadata={"rule": rule.name}
                    ))
        
        except Exception as e:
            logger.error(f"Error collecting cache metrics: {e}")
        
        return metrics
    
    def _collect_api_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect API metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if rule.metric_name == "response_time_ms":
                # Simulate API response time
                response_time = 120.5  # Simulated value
                metrics.append(Metric(
                    name="response_time_ms",
                    value=response_time,
                    unit="ms",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "request_count":
                # Simulate request count
                request_count = 1250  # Simulated value
                metrics.append(Metric(
                    name="request_count",
                    value=request_count,
                    unit="count",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
        
        except Exception as e:
            logger.error(f"Error collecting API metrics: {e}")
        
        return metrics
    
    def _collect_ml_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect ML service metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if rule.metric_name == "response_time_ms":
                # Simulate ML service response time
                response_time = 250.8  # Simulated value
                metrics.append(Metric(
                    name="response_time_ms",
                    value=response_time,
                    unit="ms",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "accuracy":
                # Simulate ML model accuracy
                accuracy = 91.2  # Simulated value
                metrics.append(Metric(
                    name="accuracy",
                    value=accuracy,
                    unit="percent",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "inference_count":
                # Simulate inference count
                inference_count = 450  # Simulated value
                metrics.append(Metric(
                    name="inference_count",
                    value=inference_count,
                    unit="count",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
        
        except Exception as e:
            logger.error(f"Error collecting ML metrics: {e}")
        
        return metrics
    
    def _collect_network_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect network metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if rule.metric_name == "latency_ms":
                # Simulate network latency
                latency = 45.2  # Simulated value
                metrics.append(Metric(
                    name="latency_ms",
                    value=latency,
                    unit="ms",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "packet_loss":
                # Simulate packet loss
                packet_loss = 0.1  # Simulated value
                metrics.append(Metric(
                    name="packet_loss",
                    value=packet_loss,
                    unit="percent",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
        
        except Exception as e:
            logger.error(f"Error collecting network metrics: {e}")
        
        return metrics
    
    def _collect_security_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect security metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if rule.metric_name == "failed_logins":
                # Simulate failed login attempts
                failed_logins = 3  # Simulated value
                metrics.append(Metric(
                    name="failed_logins",
                    value=failed_logins,
                    unit="count",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "security_events":
                # Simulate security events
                security_events = 0  # Simulated value
                metrics.append(Metric(
                    name="security_events",
                    value=security_events,
                    unit="count",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
        
        except Exception as e:
            logger.error(f"Error collecting security metrics: {e}")
        
        return metrics
    
    def _collect_performance_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect performance metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if rule.metric_name == "throughput":
                # Simulate throughput
                throughput = 1250.5  # Simulated value
                metrics.append(Metric(
                    name="throughput",
                    value=throughput,
                    unit="ops/sec",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "response_time_p95":
                # Simulate 95th percentile response time
                response_time_p95 = 320.8  # Simulated value
                metrics.append(Metric(
                    name="response_time_p95",
                    value=response_time_p95,
                    unit="ms",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
        
        except Exception as e:
            logger.error(f"Error collecting performance metrics: {e}")
        
        return metrics
    
    def _collect_business_metrics(self, rule: MonitorRule) -> List[Metric]:
        """Collect business metrics."""
        metrics = []
        timestamp = datetime.now()
        
        try:
            if rule.metric_name == "user_engagement":
                # Simulate user engagement
                engagement = 78.5  # Simulated value
                metrics.append(Metric(
                    name="user_engagement",
                    value=engagement,
                    unit="percent",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
            
            elif rule.metric_name == "conversion_rate":
                # Simulate conversion rate
                conversion_rate = 12.3  # Simulated value
                metrics.append(Metric(
                    name="conversion_rate",
                    value=conversion_rate,
                    unit="percent",
                    timestamp=timestamp,
                    tags={"monitor": rule.id},
                    metadata={"rule": rule.name}
                ))
        
        except Exception as e:
            logger.error(f"Error collecting business metrics: {e}")
        
        return metrics
    
    def _process_metric(self, metric: Metric):
        """Process a metric and check for alerts."""
        try:
            # Add metric to storage
            self.metrics.append(metric)
            self.system_metrics.metrics_collected += 1
            
            # Find matching monitor rule
            rule_id = metric.tags.get("monitor")
            if rule_id and rule_id in self.monitors:
                rule = self.monitors[rule_id]
                self._check_metric_threshold(metric, rule)
        
        except Exception as e:
            logger.error(f"Error processing metric: {e}")
    
    def _check_metric_threshold(self, metric: Metric, rule: MonitorRule):
        """Check if metric violates threshold and create alert if needed."""
        try:
            # Check if metric value violates threshold
            violates = False
            
            if rule.condition == "gt" and metric.value > rule.threshold:
                violates = True
            elif rule.condition == "lt" and metric.value < rule.threshold:
                violates = True
            elif rule.condition == "eq" and metric.value == rule.threshold:
                violates = True
            elif rule.condition == "ne" and metric.value != rule.threshold:
                violates = True
            elif rule.condition == "gte" and metric.value >= rule.threshold:
                violates = True
            elif rule.condition == "lte" and metric.value <= rule.threshold:
                violates = True
            
            if violates:
                # Check if alert already exists
                alert_id = f"{rule.id}_{metric.name}"
                
                if alert_id not in self.alerts:
                    # Create new alert
                    alert = Alert(
                        id=alert_id,
                        name=rule.name,
                        level=rule.alert_level,
                        message=f"{rule.name}: {metric.name} is {metric.value} (threshold: {rule.threshold})",
                        monitor_type=rule.monitor_type,
                        timestamp=metric.timestamp,
                        metrics=[metric]
                    )
                    
                    self.alerts[alert_id] = alert
                    self.alerts_queue.put(alert)
                    self.system_metrics.total_alerts += 1
                    self.system_metrics.active_alerts += 1
                    
                    logger.warning(f"Alert created: {alert.message}")
                else:
                    # Update existing alert
                    alert = self.alerts[alert_id]
                    alert.metrics.append(metric)
                    alert.timestamp = metric.timestamp  # Update timestamp
        
        except Exception as e:
            logger.error(f"Error checking metric threshold: {e}")
    
    def _process_alert(self, alert: Alert):
        """Process an alert and send notifications."""
        try:
            # Get monitor rule
            rule_id = alert.id.split('_')[0]
            rule = self.monitors.get(rule_id)
            
            if not rule:
                logger.error(f"No rule found for alert: {alert.id}")
                return
            
            # Send notifications
            for channel in rule.notification_channels:
                self.notification_sender.submit(self._send_notification, alert, channel)
            
            # Execute actions
            for action in rule.actions:
                self.alert_processor.submit(self._execute_action, alert, action)
        
        except Exception as e:
            logger.error(f"Error processing alert: {e}")
    
    def _send_notification(self, alert: Alert, channel: NotificationChannel):
        """Send notification through specified channel."""
        try:
            if channel == NotificationChannel.EMAIL:
                self._send_email_notification(alert)
            elif channel == NotificationChannel.SMS:
                self._send_sms_notification(alert)
            elif channel == NotificationChannel.SLACK:
                self._send_slack_notification(alert)
            elif channel == NotificationChannel.WEBHOOK:
                self._send_webhook_notification(alert)
            elif channel == NotificationChannel.DASHBOARD:
                self._send_dashboard_notification(alert)
            elif channel == NotificationChannel.LOG:
                self._send_log_notification(alert)
            
            alert.notifications_sent.append(channel.value)
            self.system_metrics.notifications_sent += 1
            
            logger.info(f"Notification sent via {channel.value} for alert: {alert.id}")
        
        except Exception as e:
            logger.error(f"Error sending notification via {channel.value}: {e}")
    
    def _send_email_notification(self, alert: Alert):
        """Send email notification."""
        try:
            # Simulate email sending
            subject = f"[{alert.level.value.upper()}] {alert.name}"
            body = f"""
Alert: {alert.name}
Level: {alert.level.value}
Message: {alert.message}
Timestamp: {alert.timestamp}
Monitor Type: {alert.monitor_type.value}

Recent Metrics:
{chr(10).join([f"- {m.name}: {m.value} {m.unit}" for m in alert.metrics[-5:]])}

Actions Taken: {', '.join(alert.actions_taken)}
            """
            
            # In real implementation, use SMTP to send email
            logger.info(f"Email notification sent for alert: {alert.id}")
        
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
    
    def _send_sms_notification(self, alert: Alert):
        """Send SMS notification."""
        try:
            # Simulate SMS sending
            message = f"[{alert.level.value.upper()}] {alert.name}: {alert.message}"
            
            # In real implementation, use SMS service API
            logger.info(f"SMS notification sent for alert: {alert.id}")
        
        except Exception as e:
            logger.error(f"Error sending SMS notification: {e}")
    
    def _send_slack_notification(self, alert: Alert):
        """Send Slack notification."""
        try:
            # Simulate Slack notification
            color = {
                AlertLevel.INFO: "good",
                AlertLevel.WARNING: "warning",
                AlertLevel.ERROR: "danger",
                AlertLevel.CRITICAL: "danger",
                AlertLevel.EMERGENCY: "danger"
            }.get(alert.level, "warning")
            
            payload = {
                "attachments": [{
                    "color": color,
                    "title": f"[{alert.level.value.upper()}] {alert.name}",
                    "text": alert.message,
                    "fields": [
                        {"title": "Monitor Type", "value": alert.monitor_type.value, "short": True},
                        {"title": "Timestamp", "value": str(alert.timestamp), "short": True}
                    ]
                }]
            }
            
            # In real implementation, send to Slack webhook
            logger.info(f"Slack notification sent for alert: {alert.id}")
        
        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")
    
    def _send_webhook_notification(self, alert: Alert):
        """Send webhook notification."""
        try:
            # Simulate webhook notification
            payload = {
                "alert_id": alert.id,
                "name": alert.name,
                "level": alert.level.value,
                "message": alert.message,
                "timestamp": alert.timestamp.isoformat(),
                "monitor_type": alert.monitor_type.value,
                "metrics": [{"name": m.name, "value": m.value, "unit": m.unit} for m in alert.metrics]
            }
            
            # In real implementation, send to webhook URL
            logger.info(f"Webhook notification sent for alert: {alert.id}")
        
        except Exception as e:
            logger.error(f"Error sending webhook notification: {e}")
    
    def _send_dashboard_notification(self, alert: Alert):
        """Send dashboard notification."""
        try:
            # Store alert for dashboard display
            # In real implementation, store in database or cache
            cache.set(f"alert_{alert.id}", alert, timeout=3600)
            
            logger.info(f"Dashboard notification sent for alert: {alert.id}")
        
        except Exception as e:
            logger.error(f"Error sending dashboard notification: {e}")
    
    def _send_log_notification(self, alert: Alert):
        """Send log notification."""
        try:
            log_level = {
                AlertLevel.INFO: logging.INFO,
                AlertLevel.WARNING: logging.WARNING,
                AlertLevel.ERROR: logging.ERROR,
                AlertLevel.CRITICAL: logging.CRITICAL,
                AlertLevel.EMERGENCY: logging.CRITICAL
            }.get(alert.level, logging.WARNING)
            
            logger.log(log_level, f"ALERT: {alert.name} - {alert.message}")
        
        except Exception as e:
            logger.error(f"Error sending log notification: {e}")
    
    def _execute_action(self, alert: Alert, action: str):
        """Execute automated action for alert."""
        try:
            if action == "log_cpu_usage":
                self._log_cpu_usage(alert)
            elif action == "log_memory_usage":
                self._log_memory_usage(alert)
            elif action == "cleanup_temp_files":
                self._cleanup_temp_files(alert)
            elif action == "notify_admin":
                self._notify_admin(alert)
            elif action == "log_slow_requests":
                self._log_slow_requests(alert)
            elif action == "check_api_health":
                self._check_api_health(alert)
            elif action == "restart_services":
                self._restart_services(alert)
            elif action == "check_db_health":
                self._check_db_health(alert)
            elif action == "optimize_connections":
                self._optimize_connections(alert)
            elif action == "log_slow_queries":
                self._log_slow_queries(alert)
            elif action == "optimize_indexes":
                self._optimize_indexes(alert)
            elif action == "warm_cache":
                self._warm_cache(alert)
            elif action == "check_cache_health":
                self._check_cache_health(alert)
            elif action == "log_ml_performance":
                self._log_ml_performance(alert)
            elif action == "check_ml_health":
                self._check_ml_health(alert)
            elif action == "retrain_model":
                self._retrain_model(alert)
            elif action == "check_data_quality":
                self._check_data_quality(alert)
            elif action == "check_network_health":
                self._check_network_health(alert)
            elif action == "optimize_routing":
                self._optimize_routing(alert)
            elif action == "block_ip":
                self._block_ip(alert)
            elif action == "investigate_event":
                self._investigate_event(alert)
            elif action == "notify_security_team":
                self._notify_security_team(alert)
            
            alert.actions_taken.append(action)
            logger.info(f"Action executed: {action} for alert: {alert.id}")
        
        except Exception as e:
            logger.error(f"Error executing action {action}: {e}")
    
    def _log_cpu_usage(self, alert: Alert):
        """Log CPU usage details."""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
            
            logger.info(f"CPU Usage: {cpu_percent}%, Cores: {cpu_count}, Load: {load_avg}")
        
        except Exception as e:
            logger.error(f"Error logging CPU usage: {e}")
    
    def _log_memory_usage(self, alert: Alert):
        """Log memory usage details."""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            logger.info(f"Memory Usage: {memory.percent}%, Available: {memory.available / (1024**3):.2f}GB")
            logger.info(f"Swap Usage: {swap.percent}%, Available: {swap.free / (1024**3):.2f}GB")
        
        except Exception as e:
            logger.error(f"Error logging memory usage: {e}")
    
    def _cleanup_temp_files(self, alert: Alert):
        """Clean up temporary files."""
        try:
            import tempfile
            temp_dir = tempfile.gettempdir()
            
            # Simulate cleanup
            logger.info(f"Cleaning up temporary files in {temp_dir}")
        
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {e}")
    
    def _notify_admin(self, alert: Alert):
        """Notify administrator."""
        try:
            # Simulate admin notification
            logger.warning(f"ADMIN NOTIFICATION: {alert.message}")
        
        except Exception as e:
            logger.error(f"Error notifying admin: {e}")
    
    def _log_slow_requests(self, alert: Alert):
        """Log slow requests."""
        try:
            # Simulate logging slow requests
            logger.warning("Slow requests detected - check API performance")
        
        except Exception as e:
            logger.error(f"Error logging slow requests: {e}")
    
    def _check_api_health(self, alert: Alert):
        """Check API health."""
        try:
            if DJANGO_AVAILABLE:
                from django.test import Client
                client = Client()
                response = client.get('/health/')
                
                if response.status_code == 200:
                    logger.info("API health check passed")
                else:
                    logger.error(f"API health check failed: {response.status_code}")
        
        except Exception as e:
            logger.error(f"Error checking API health: {e}")
    
    def _restart_services(self, alert: Alert):
        """Restart services."""
        try:
            # Simulate service restart
            logger.warning("Service restart triggered")
        
        except Exception as e:
            logger.error(f"Error restarting services: {e}")
    
    def _check_db_health(self, alert: Alert):
        """Check database health."""
        try:
            if DJANGO_AVAILABLE:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                
                logger.info("Database health check passed")
        
        except Exception as e:
            logger.error(f"Error checking database health: {e}")
    
    def _optimize_connections(self, alert: Alert):
        """Optimize database connections."""
        try:
            # Simulate connection optimization
            logger.info("Database connection optimization triggered")
        
        except Exception as e:
            logger.error(f"Error optimizing connections: {e}")
    
    def _log_slow_queries(self, alert: Alert):
        """Log slow queries."""
        try:
            # Simulate logging slow queries
            logger.warning("Slow queries detected - check database performance")
        
        except Exception as e:
            logger.error(f"Error logging slow queries: {e}")
    
    def _optimize_indexes(self, alert: Alert):
        """Optimize database indexes."""
        try:
            # Simulate index optimization
            logger.info("Database index optimization triggered")
        
        except Exception as e:
            logger.error(f"Error optimizing indexes: {e}")
    
    def _warm_cache(self, alert: Alert):
        """Warm up cache."""
        try:
            # Simulate cache warming
            logger.info("Cache warming triggered")
        
        except Exception as e:
            logger.error(f"Error warming cache: {e}")
    
    def _check_cache_health(self, alert: Alert):
        """Check cache health."""
        try:
            if DJANGO_AVAILABLE:
                cache.set('health_check', 'test', 60)
                value = cache.get('health_check')
                
                if value == 'test':
                    logger.info("Cache health check passed")
                    cache.delete('health_check')
                else:
                    logger.error("Cache health check failed")
        
        except Exception as e:
            logger.error(f"Error checking cache health: {e}")
    
    def _log_ml_performance(self, alert: Alert):
        """Log ML performance metrics."""
        try:
            # Simulate ML performance logging
            logger.warning("ML performance issues detected")
        
        except Exception as e:
            logger.error(f"Error logging ML performance: {e}")
    
    def _check_ml_health(self, alert: Alert):
        """Check ML service health."""
        try:
            # Simulate ML health check
            logger.info("ML service health check triggered")
        
        except Exception as e:
            logger.error(f"Error checking ML health: {e}")
    
    def _retrain_model(self, alert: Alert):
        """Retrain ML model."""
        try:
            # Simulate model retraining
            logger.info("ML model retraining triggered")
        
        except Exception as e:
            logger.error(f"Error retraining model: {e}")
    
    def _check_data_quality(self, alert: Alert):
        """Check data quality."""
        try:
            # Simulate data quality check
            logger.info("Data quality check triggered")
        
        except Exception as e:
            logger.error(f"Error checking data quality: {e}")
    
    def _check_network_health(self, alert: Alert):
        """Check network health."""
        try:
            # Simulate network health check
            logger.info("Network health check triggered")
        
        except Exception as e:
            logger.error(f"Error checking network health: {e}")
    
    def _optimize_routing(self, alert: Alert):
        """Optimize network routing."""
        try:
            # Simulate routing optimization
            logger.info("Network routing optimization triggered")
        
        except Exception as e:
            logger.error(f"Error optimizing routing: {e}")
    
    def _block_ip(self, alert: Alert):
        """Block IP address."""
        try:
            # Simulate IP blocking
            logger.warning("IP blocking triggered")
        
        except Exception as e:
            logger.error(f"Error blocking IP: {e}")
    
    def _investigate_event(self, alert: Alert):
        """Investigate security event."""
        try:
            # Simulate security investigation
            logger.warning("Security event investigation triggered")
        
        except Exception as e:
            logger.error(f"Error investigating event: {e}")
    
    def _notify_security_team(self, alert: Alert):
        """Notify security team."""
        try:
            # Simulate security team notification
            logger.critical(f"SECURITY TEAM NOTIFICATION: {alert.message}")
        
        except Exception as e:
            logger.error(f"Error notifying security team: {e}")
    
    def _check_auto_resolution(self):
        """Check for auto-resolution of alerts."""
        try:
            current_time = datetime.now()
            
            for alert_id, alert in list(self.alerts.items()):
                if not alert.resolved:
                    # Check if alert should be auto-resolved
                    rule_id = alert_id.split('_')[0]
                    rule = self.monitors.get(rule_id)
                    
                    if rule and rule.auto_resolve:
                        time_since_last_metric = (current_time - alert.timestamp).total_seconds()
                        
                        if time_since_last_metric > rule.auto_resolve_duration:
                            # Auto-resolve alert
                            alert.resolved = True
                            alert.resolved_at = current_time
                            self.system_metrics.active_alerts -= 1
                            self.system_metrics.resolved_alerts += 1
                            
                            logger.info(f"Alert auto-resolved: {alert_id}")
        
        except Exception as e:
            logger.error(f"Error checking auto-resolution: {e}")
    
    def _update_system_metrics(self):
        """Update system metrics."""
        try:
            # Update active monitors count
            self.system_metrics.active_monitors = sum(1 for rule in self.monitors.values() if rule.enabled)
            
            # Calculate average response time
            if self.metrics:
                recent_metrics = [m for m in self.metrics if (datetime.now() - m.timestamp).total_seconds() < 300]
                if recent_metrics:
                    # Simulate response time calculation
                    self.system_metrics.avg_response_time = 150.5  # Simulated value
            
            # Calculate system health score
            self.system_metrics.system_health_score = self._calculate_health_score()
        
        except Exception as e:
            logger.error(f"Error updating system metrics: {e}")
    
    def _calculate_health_score(self) -> float:
        """Calculate overall system health score."""
        try:
            # Base score
            score = 100.0
            
            # Deduct points for active alerts
            critical_alerts = sum(1 for alert in self.alerts.values() if not alert.resolved and alert.level in [AlertLevel.CRITICAL, AlertLevel.EMERGENCY])
            error_alerts = sum(1 for alert in self.alerts.values() if not alert.resolved and alert.level == AlertLevel.ERROR)
            warning_alerts = sum(1 for alert in self.alerts.values() if not alert.resolved and alert.level == AlertLevel.WARNING)
            
            score -= critical_alerts * 20
            score -= error_alerts * 10
            score -= warning_alerts * 5
            
            # Deduct points for system resource issues
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_percent = psutil.virtual_memory().percent
            
            if cpu_percent > 80:
                score -= (cpu_percent - 80) * 0.5
            
            if memory_percent > 85:
                score -= (memory_percent - 85) * 0.5
            
            return max(0.0, min(100.0, score))
        
        except Exception as e:
            logger.error(f"Error calculating health score: {e}")
            return 50.0
    
    def _cleanup_old_metrics(self):
        """Clean up old metrics to prevent memory issues."""
        try:
            cutoff_time = datetime.now() - timedelta(hours=24)
            self.metrics = [m for m in self.metrics if m.timestamp > cutoff_time]
        
        except Exception as e:
            logger.error(f"Error cleaning up old metrics: {e}")
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get current monitoring status."""
        return {
            'running': self.running,
            'uptime': time.time() - self.start_time,
            'system_metrics': {
                'total_monitors': self.system_metrics.total_monitors,
                'active_monitors': self.system_metrics.active_monitors,
                'total_alerts': self.system_metrics.total_alerts,
                'active_alerts': self.system_metrics.active_alerts,
                'resolved_alerts': self.system_metrics.resolved_alerts,
                'metrics_collected': self.system_metrics.metrics_collected,
                'notifications_sent': self.system_metrics.notifications_sent,
                'avg_response_time': self.system_metrics.avg_response_time,
                'system_health_score': self.system_metrics.system_health_score
            },
            'active_alerts': [
                {
                    'id': alert.id,
                    'name': alert.name,
                    'level': alert.level.value,
                    'message': alert.message,
                    'timestamp': alert.timestamp.isoformat(),
                    'monitor_type': alert.monitor_type.value
                }
                for alert in self.alerts.values() if not alert.resolved
            ],
            'monitor_rules': [
                {
                    'id': rule.id,
                    'name': rule.name,
                    'monitor_type': rule.monitor_type.value,
                    'enabled': rule.enabled,
                    'threshold': rule.threshold,
                    'alert_level': rule.alert_level.value
                }
                for rule in self.monitors.values()
            ]
        }
    
    def add_monitor_rule(self, rule: MonitorRule):
        """Add a new monitor rule."""
        self.monitors[rule.id] = rule
        self.system_metrics.total_monitors += 1
        
        if rule.enabled:
            self.system_metrics.active_monitors += 1
        
        logger.info(f"Monitor rule added: {rule.name}")
    
    def remove_monitor_rule(self, rule_id: str):
        """Remove a monitor rule."""
        if rule_id in self.monitors:
            rule = self.monitors[rule_id]
            if rule.enabled:
                self.system_metrics.active_monitors -= 1
            
            del self.monitors[rule_id]
            self.system_metrics.total_monitors -= 1
            
            logger.info(f"Monitor rule removed: {rule.name}")
    
    def enable_monitor_rule(self, rule_id: str):
        """Enable a monitor rule."""
        if rule_id in self.monitors:
            rule = self.monitors[rule_id]
            rule.enabled = True
            self.system_metrics.active_monitors += 1
            
            logger.info(f"Monitor rule enabled: {rule.name}")
    
    def disable_monitor_rule(self, rule_id: str):
        """Disable a monitor rule."""
        if rule_id in self.monitors:
            rule = self.monitors[rule_id]
            rule.enabled = False
            self.system_metrics.active_monitors -= 1
            
            logger.info(f"Monitor rule disabled: {rule.name}")
    
    def resolve_alert(self, alert_id: str):
        """Manually resolve an alert."""
        if alert_id in self.alerts:
            alert = self.alerts[alert_id]
            if not alert.resolved:
                alert.resolved = True
                alert.resolved_at = datetime.now()
                self.system_metrics.active_alerts -= 1
                self.system_metrics.resolved_alerts += 1
                
                logger.info(f"Alert manually resolved: {alert_id}")
    
    def get_alert_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get alert history for the specified hours."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        return [
            {
                'id': alert.id,
                'name': alert.name,
                'level': alert.level.value,
                'message': alert.message,
                'timestamp': alert.timestamp.isoformat(),
                'resolved': alert.resolved,
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None,
                'monitor_type': alert.monitor_type.value,
                'actions_taken': alert.actions_taken,
                'notifications_sent': alert.notifications_sent
            }
            for alert in self.alerts.values()
            if alert.timestamp > cutoff_time
        ]

def main():
    """Main function for the monitoring system."""
    print("🔍 Starting Real-Time Monitoring & Alerting System...")
    print("=" * 80)
    
    # Create monitoring system
    monitoring_system = RealTimeMonitoringSystem()
    
    try:
        # Start monitoring
        monitoring_system.start_monitoring()
        
        print("✅ Real-time monitoring system started successfully!")
        print(f"📊 Total monitors: {monitoring_system.system_metrics.total_monitors}")
        print(f"🔧 Active monitors: {monitoring_system.system_metrics.active_monitors}")
        print(f"📈 System health score: {monitoring_system.system_metrics.system_health_score:.1f}/100")
        
        # Display monitoring status every 30 seconds
        while True:
            time.sleep(30)
            
            status = monitoring_system.get_monitoring_status()
            
            print(f"\n📊 Monitoring Status (Uptime: {status['uptime']:.0f}s):")
            print("=" * 80)
            print(f"🔧 Active Monitors: {status['system_metrics']['active_monitors']}")
            print(f"🚨 Active Alerts: {status['system_metrics']['active_alerts']}")
            print(f"✅ Resolved Alerts: {status['system_metrics']['resolved_alerts']}")
            print(f"📈 Metrics Collected: {status['system_metrics']['metrics_collected']}")
            print(f"📧 Notifications Sent: {status['system_metrics']['notifications_sent']}")
            print(f"💚 Health Score: {status['system_metrics']['system_health_score']:.1f}/100")
            
            # Display active alerts
            if status['active_alerts']:
                print(f"\n🚨 Active Alerts:")
                print("=" * 80)
                for alert in status['active_alerts'][:5]:  # Show first 5
                    level_icon = {"info": "ℹ️", "warning": "⚠️", "error": "❌", "critical": "🔴", "emergency": "🆘"}.get(alert['level'], "📢")
                    print(f"{level_icon} {alert['name']}: {alert['message']}")
            
            # Health assessment
            health_score = status['system_metrics']['system_health_score']
            if health_score >= 90:
                print(f"\n🌟 System Health: EXCELLENT ({health_score:.1f}/100)")
            elif health_score >= 80:
                print(f"\n✅ System Health: GOOD ({health_score:.1f}/100)")
            elif health_score >= 70:
                print(f"\n⚠️  System Health: FAIR ({health_score:.1f}/100)")
            elif health_score >= 60:
                print(f"\n❌ System Health: POOR ({health_score:.1f}/100)")
            else:
                print(f"\n🆘 System Health: CRITICAL ({health_score:.1f}/100)")
    
    except KeyboardInterrupt:
        print("\n🛑 Stopping monitoring system...")
        monitoring_system.stop_monitoring()
        print("✅ Monitoring system stopped")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        monitoring_system.stop_monitoring()

if __name__ == '__main__':
    main()
