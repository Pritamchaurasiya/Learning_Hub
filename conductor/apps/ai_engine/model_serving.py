"""
Model Serving

Production serving:
1. Model registry.
2. Load balancing.
3. Health monitoring.
"""

import random
import time
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class ModelStatus(Enum):
    LOADING = "loading"
    READY = "ready"
    BUSY = "busy"
    ERROR = "error"
    UNLOADING = "unloading"


@dataclass
class ModelInfo:
    name: str
    version: str
    status: ModelStatus = ModelStatus.LOADING
    replicas: int = 1
    memory_mb: int = 1000
    loaded_at: Optional[datetime] = None
    requests_served: int = 0
    avg_latency_ms: float = 0.0


@dataclass
class ServerInstance:
    id: str
    host: str
    port: int
    status: str = "healthy"
    load: float = 0.0
    models: List[str] = field(default_factory=list)


class ModelRegistry:
    """Central model registry."""
    def __init__(self):
        self.models: Dict[str, ModelInfo] = {}
        self.versions: Dict[str, List[str]] = {}

    def register(self, model: ModelInfo):
        key = f"{model.name}:{model.version}"
        self.models[key] = model
        if model.name not in self.versions:
            self.versions[model.name] = []
        self.versions[model.name].append(model.version)

    def get(self, name: str, version: Optional[str] = None) -> Optional[ModelInfo]:
        if version:
            return self.models.get(f"{name}:{version}")
        versions = self.versions.get(name, [])
        if versions:
            return self.models.get(f"{name}:{versions[-1]}")
        return None

    def list_models(self) -> List[ModelInfo]:
        return list(self.models.values())

    def update_status(self, name: str, version: str, status: ModelStatus):
        key = f"{name}:{version}"
        if key in self.models:
            self.models[key].status = status


class LoadBalancer:
    """Load balancer for model replicas."""
    def __init__(self, strategy: str = "round_robin"):
        self.strategy = strategy
        self.servers: List[ServerInstance] = []
        self.current_idx = 0

    def add_server(self, server: ServerInstance):
        self.servers.append(server)

    def remove_server(self, server_id: str):
        self.servers = [s for s in self.servers if s.id != server_id]

    def _round_robin(self, model_name: str) -> Optional[ServerInstance]:
        eligible = [s for s in self.servers if s.status == "healthy" and model_name in s.models]
        if not eligible:
            return None
        server = eligible[self.current_idx % len(eligible)]
        self.current_idx += 1
        return server

    def _least_load(self, model_name: str) -> Optional[ServerInstance]:
        eligible = [s for s in self.servers if s.status == "healthy" and model_name in s.models]
        if not eligible:
            return None
        return min(eligible, key=lambda s: s.load)

    def route(self, model_name: str) -> Optional[ServerInstance]:
        if self.strategy == "round_robin":
            return self._round_robin(model_name)
        elif self.strategy == "least_load":
            return self._least_load(model_name)
        return self._round_robin(model_name)


class HealthMonitor:
    """Monitor model and server health."""
    def __init__(self):
        self.checks: Dict[str, List[Dict]] = {}
        self.thresholds = {'latency_ms': 1000, 'error_rate': 0.1, 'memory_pct': 90}

    def record_check(self, server_id: str, result: Dict):
        if server_id not in self.checks:
            self.checks[server_id] = []
        self.checks[server_id].append({**result, 'timestamp': datetime.now()})
        # Keep last 100
        self.checks[server_id] = self.checks[server_id][-100:]

    def get_status(self, server_id: str) -> str:
        if server_id not in self.checks or not self.checks[server_id]:
            return "unknown"
        recent = self.checks[server_id][-10:]
        errors = sum(1 for c in recent if c.get('error'))
        if errors > 5:
            return "unhealthy"
        avg_latency = sum(c.get('latency_ms', 0) for c in recent) / len(recent)
        if avg_latency > self.thresholds['latency_ms']:
            return "degraded"
        return "healthy"


class ModelServer:
    """Complete model serving system."""
    def __init__(self):
        self.registry = ModelRegistry()
        self.balancer = LoadBalancer()
        self.monitor = HealthMonitor()
        self.request_count = 0

    def deploy(self, model: ModelInfo, replicas: int = 1):
        model.replicas = replicas
        model.status = ModelStatus.READY
        model.loaded_at = datetime.now()
        self.registry.register(model)
        
        # Create server instances
        for i in range(replicas):
            server = ServerInstance(
                id=f"{model.name}-{model.version}-{i}",
                host="localhost",
                port=8000 + i,
                models=[model.name]
            )
            self.balancer.add_server(server)

    def infer(self, model_name: str, inputs: Dict) -> Dict:
        server = self.balancer.route(model_name)
        if not server:
            return {'error': 'No available server'}
        
        start = time.time()
        # Simulate inference
        result = {'output': f"Result from {server.id}", 'model': model_name}
        latency = (time.time() - start) * 1000 + random.uniform(10, 100)
        
        # Update stats
        self.request_count += 1
        server.load = min(1.0, server.load + 0.01)
        self.monitor.record_check(server.id, {'latency_ms': latency, 'error': False})
        
        model = self.registry.get(model_name)
        if model:
            model.requests_served += 1
            model.avg_latency_ms = (model.avg_latency_ms * 0.9) + (latency * 0.1)
        
        return {**result, 'latency_ms': latency, 'server': server.id}

    def status(self) -> Dict:
        return {
            'models': len(self.registry.models),
            'servers': len(self.balancer.servers),
            'total_requests': self.request_count,
            'healthy_servers': sum(1 for s in self.balancer.servers if s.status == "healthy")
        }
