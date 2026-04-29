"""
Guardian Ops Agent (Self-Healing)

Autonomous infrastructure management:
1. Detects system anomalies.
2. Applies auto-remediation triggers.
3. Chaos Monkey for resilience testing.
"""

import logging
import random
import time
from typing import Dict, Any, List
from enum import Enum

logger = logging.getLogger('ops.guardian')


class SystemState(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    CRITICAL = "critical"


class AnomalyType(Enum):
    HIGH_LATENCY = "high_latency"
    ERROR_SPIKE = "error_spike"
    MEMORY_LEAK = "memory_leak"
    DB_CONNECTION_LOSS = "db_loss"


class GuardianAgent:
    """
    Autonomous SRE Agent.
    """
    
    @classmethod
    def monitor_loop(cls, metrics: Dict[str, Any]):
        """
        Evaluate system metrics and decide on actions.
        """
        latency = metrics.get("avg_latency_ms", 50)
        error_rate = metrics.get("error_rate_percent", 0.1)
        
        # 1. Detection
        anomalies = []
        if latency > 1000:
            anomalies.append(AnomalyType.HIGH_LATENCY)
        if error_rate > 5.0:
            anomalies.append(AnomalyType.ERROR_SPIKE)
            
        # 2. Decision
        if anomalies:
            logger.warning(f"Guardian detected anomalies: {anomalies}")
            cls._remediate(anomalies)
        else:
            logger.info("Guardian check: System Healthy")

    @classmethod
    def _remediate(cls, anomalies: List[AnomalyType]):
        """Execute countermeasures."""
        for anomaly in anomalies:
            if anomaly == AnomalyType.HIGH_LATENCY:
                cls._action_scale_up()
            elif anomaly == AnomalyType.ERROR_SPIKE:
                cls._action_rollback_deployment()
            elif anomaly == AnomalyType.DB_CONNECTION_LOSS:
                cls._action_restart_db_pool()

    # ==========================================================================
    # ACTIONS (MOCKED)
    # ==========================================================================
    
    @classmethod
    def _action_scale_up(cls):
        logger.info("⚡ GUARDIAN ACTION: Scaling up worker replicas (+2)")
        # In prod: Kubernetes API call
        
    @classmethod
    def _action_rollback_deployment(cls):
        logger.critical("⚡ GUARDIAN ACTION: Initiating fast rollback to previous stable version")
        # In prod: CICD trigger
        
    @classmethod
    def _action_restart_db_pool(cls):
        logger.warning("⚡ GUARDIAN ACTION: Flushing and restarting connection pool")

    # ==========================================================================
    # CHAOS ENGINEERING
    # ==========================================================================
    
    @classmethod
    def unleash_chaos_monkey(cls):
        """Randomly terminate components to test resilience."""
        target = random.choice(["cache", "worker_1", "search_node"])
        logger.warning(f"🐒 CHAOS MONKEY: Terminating {target} to test failover...")
        # In prod: Actually kill pod
        return f"Killed {target}"
