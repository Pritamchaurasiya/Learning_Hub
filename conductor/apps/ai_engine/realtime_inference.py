# Real-time ML Inference Pipeline Optimization
# Sub-100ms inference with advanced caching, batching, and optimization

import asyncio
import time
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import hashlib
from collections import defaultdict, deque
import threading
from concurrent.futures import ThreadPoolExecutor
import queue
try:
    import numpy as np
    import torch
    import onnxruntime as ort
except ImportError:
    np = None
    torch = None
    ort = None
from prometheus_client import Counter, Histogram, Gauge
import redis.asyncio as redis

logger = logging.getLogger(__name__)

# Performance Metrics
try:
    INFERENCE_COUNT = Counter('ml_inference_total', 'Total inference requests', ['model', 'optimized'])
    INFERENCE_LATENCY = Histogram('ml_inference_latency_ms', 'Inference latency in milliseconds', ['model', 'optimized'])
    BATCH_SIZE_HISTOGRAM = Histogram('ml_batch_size', 'Batch size distribution', ['model'])
    CACHE_EFFICIENCY = Gauge('ml_cache_efficiency', 'Cache hit rate')
    QUEUE_SIZE = Gauge('ml_queue_size', 'Current queue size', ['model'])
except ValueError:
    from prometheus_client import REGISTRY
    INFERENCE_COUNT = REGISTRY._names_to_collectors.get('ml_inference_total')
    INFERENCE_LATENCY = REGISTRY._names_to_collectors.get('ml_inference_latency_ms')
    BATCH_SIZE_HISTOGRAM = REGISTRY._names_to_collectors.get('ml_batch_size')
    CACHE_EFFICIENCY = REGISTRY._names_to_collectors.get('ml_cache_efficiency')
    QUEUE_SIZE = REGISTRY._names_to_collectors.get('ml_queue_size')

class OptimizationLevel(Enum):
    NONE = "none"
    BASIC = "basic"
    ADVANCED = "advanced"
    ULTRA = "ultra"

@dataclass
class InferenceRequest:
    id: str
    model_name: str
    input_data: Dict[str, Any]
    timestamp: float
    priority: int = 1
    callback: Optional[callable] = None

@dataclass
class BatchRequest:
    requests: List[InferenceRequest] = field(default_factory=list)
    model_name: str = ""
    created_at: float = field(default_factory=time.time)
    max_wait_time: float = 0.05  # 50ms max wait for batching

class ModelOptimizer:
    """Advanced model optimization for real-time inference."""
    
    def __init__(self):
        self.optimized_models: Dict[str, Any] = {}
        self.session_pool: Dict[str, List] = {}
        self.tensor_cache: Dict[str, torch.Tensor] = {}
        
    def optimize_model(self, model_path: str, optimization_level: OptimizationLevel = OptimizationLevel.ADVANCED):
        """Optimize model for inference performance."""
        model_name = model_path.split('/')[-1].split('.')[0]
        
        if optimization_level == OptimizationLevel.NONE:
            return self._load_baseline_model(model_path)
        
        elif optimization_level == OptimizationLevel.BASIC:
            return self._basic_optimization(model_path)
        
        elif optimization_level == OptimizationLevel.ADVANCED:
            return self._advanced_optimization(model_path)
        
        elif optimization_level == OptimizationLevel.ULTRA:
            return self._ultra_optimization(model_path)
    
    def _load_baseline_model(self, model_path: str):
        """Load baseline model without optimization."""
        # Load ONNX model
        session = ort.InferenceSession(model_path)
        return session
    
    def _basic_optimization(self, model_path: str):
        """Basic optimization: ONNX with graph optimizations."""
        # Enable all graph optimizations
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        
        session = ort.InferenceSession(model_path, sess_options=sess_options)
        return session
    
    def _advanced_optimization(self, model_path: str):
        """Advanced optimization: quantization and parallel execution."""
        # Create providers with GPU support
        providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        
        # Session options for advanced optimization
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.execution_mode = ort.ExecutionMode.ORT_PARALLEL
        sess_options.inter_op_num_threads = 4
        sess_options.intra_op_num_threads = 4
        
        # Enable memory optimization
        sess_options.enable_cpu_mem_arena = True
        sess_options.enable_mem_pattern = True
        sess_options.enable_mem_reuse = True
        
        session = ort.InferenceSession(model_path, sess_options=sess_options, providers=providers)
        return session
    
    def _ultra_optimization(self, model_path: str):
        """Ultra optimization: dynamic quantization and tensor caching."""
        # Load with maximum optimization
        providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.execution_mode = ort.ExecutionMode.ORT_PARALLEL
        sess_options.inter_op_num_threads = 8
        sess_options.intra_op_num_threads = 8
        
        # Enable all memory optimizations
        sess_options.enable_cpu_mem_arena = True
        sess_options.enable_mem_pattern = True
        sess_options.enable_mem_reuse = True
        sess_options.enable_profiling = False
        
        # Set optimization level
        sess_options.optimized_model_filepath = model_path.replace('.onnx', '_optimized.onnx')
        
        session = ort.InferenceSession(model_path, sess_options=sess_options, providers=providers)
        
        # Pre-allocate tensor cache
        self._preallocate_tensors(session, model_path)
        
        return session
    
    def _preallocate_tensors(self, session, model_path: str):
        """Pre-allocate commonly used tensors."""
        try:
            # Get input info
            input_info = session.get_inputs()
            model_name = model_path.split('/')[-1].split('.')[0]
            
            # Pre-allocate common tensor sizes
            for input_meta in input_info:
                shape = input_meta.shape
                dtype = input_meta.type
                
                # Create pre-allocated tensors for common sizes
                if 'batch_size' in str(shape):
                    # Pre-allocate for batch sizes 1, 4, 8, 16, 32
                    for batch_size in [1, 4, 8, 16, 32]:
                        dynamic_shape = [batch_size if s == 'batch_size' else s for s in shape]
                        tensor = torch.zeros(dynamic_shape)
                        cache_key = f"{model_name}_{input_meta.name}_{batch_size}"
                        self.tensor_cache[cache_key] = tensor
                        
        except Exception as e:
            logger.warning(f"Failed to pre-allocate tensors: {e}")

class RealTimeInferencePipeline:
    """High-performance real-time inference pipeline."""
    
    def __init__(self):
        self.model_optimizer = ModelOptimizer()
        self.request_queues: Dict[str, queue.Queue] = defaultdict(queue.Queue)
        self.batch_processors: Dict[str, asyncio.Task] = {}
        self.cache_client: Optional[redis.Redis] = None
        self.executor = ThreadPoolExecutor(max_workers=8)
        self.performance_stats: Dict[str, Dict] = defaultdict(dict)
        
        # Configuration
        self.max_batch_sizes = {
            'text-embedding': 64,
            'recommendation': 32,
            'adaptive-learning': 16,
            'content-classification': 128,
            'sentiment-analysis': 256
        }
        
        self.batch_wait_times = {
            'text-embedding': 0.02,  # 20ms
            'recommendation': 0.05,   # 50ms
            'adaptive-learning': 0.03,  # 30ms
            'content-classification': 0.01,  # 10ms
            'sentiment-analysis': 0.01  # 10ms
        }
    
    async def initialize(self):
        """Initialize the inference pipeline."""
        # Connect to Redis
        try:
            self.cache_client = redis.from_url(
                "redis://redis-service:6379/2",
                encoding="utf-8",
                decode_responses=True
            )
            await self.cache_client.ping()
            logger.info("Connected to Redis for inference cache")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
        
        # Start batch processors for each model
        for model_name in self.max_batch_sizes.keys():
            self.batch_processors[model_name] = asyncio.create_task(
                self._batch_processor(model_name)
            )
        
        logger.info("Real-time inference pipeline initialized")
    
    async def shutdown(self):
        """Shutdown the inference pipeline."""
        # Cancel batch processors
        for task in self.batch_processors.values():
            task.cancel()
        
        # Wait for tasks to complete
        await asyncio.gather(*self.batch_processors.values(), return_exceptions=True)
        
        # Shutdown executor
        self.executor.shutdown(wait=True)
        
        # Close Redis connection
        if self.cache_client:
            await self.cache_client.close()
        
        logger.info("Real-time inference pipeline shutdown")
    
    async def predict(self, model_name: str, input_data: Dict[str, Any], 
                     optimization_level: OptimizationLevel = OptimizationLevel.ADVANCED) -> Dict[str, Any]:
        """Make prediction with real-time optimization."""
        start_time = time.time()
        
        # Generate request ID
        request_id = hashlib.md5(
            f"{model_name}_{time.time()}_{str(input_data)}".encode()
        ).hexdigest()
        
        # Check cache first
        cache_key = f"rt_inference:{model_name}:{hashlib.md5(json.dumps(input_data).encode()).hexdigest()}"
        cached_result = await self._get_cache(cache_key)
        if cached_result:
            INFERENCE_COUNT.labels(model=model_name, optimized="cached").inc()
            return cached_result
        
        # Create inference request
        request = InferenceRequest(
            id=request_id,
            model_name=model_name,
            input_data=input_data,
            timestamp=start_time
        )
        
        # Add to queue
        self.request_queues[model_name].put(request)
        QUEUE_SIZE.labels(model=model_name).set(self.request_queues[model_name].qsize())
        
        # Wait for result (with timeout)
        result = await self._wait_for_result(request, timeout=0.1)  # 100ms timeout
        
        # Cache result
        await self._set_cache(cache_key, result, ttl=300)  # 5 minutes cache
        
        # Update metrics
        latency_ms = (time.time() - start_time) * 1000
        INFERENCE_COUNT.labels(model=model_name, optimized="realtime").inc()
        INFERENCE_LATENCY.labels(model=model_name, optimized="realtime").observe(latency_ms)
        
        # Update performance stats
        self._update_performance_stats(model_name, latency_ms)
        
        return result
    
    async def _wait_for_result(self, request: InferenceRequest, timeout: float) -> Dict[str, Any]:
        """Wait for inference result with timeout."""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Check if result is ready (in a real implementation, this would use futures/callbacks)
            if hasattr(request, 'result'):
                return request.result
            
            await asyncio.sleep(0.001)  # 1ms sleep
        
        raise TimeoutError(f"Inference timeout for request {request.id}")
    
    async def _batch_processor(self, model_name: str):
        """Process inference requests in batches for optimal performance."""
        max_batch_size = self.max_batch_sizes.get(model_name, 16)
        batch_wait_time = self.batch_wait_times.get(model_name, 0.02)
        
        logger.info(f"Starting batch processor for {model_name}")
        
        while True:
            try:
                batch = BatchRequest(model_name=model_name)
                batch_start_time = time.time()
                
                # Collect requests for batching
                while (len(batch.requests) < max_batch_size and 
                       time.time() - batch_start_time < batch_wait_time):
                    
                    try:
                        request = self.request_queues[model_name].get(timeout=0.001)
                        batch.requests.append(request)
                    except queue.Empty:
                        continue
                
                if batch.requests:
                    # Process batch
                    await self._process_batch(batch)
                    
                    # Update metrics
                    BATCH_SIZE_HISTOGRAM.labels(model=model_name).observe(len(batch.requests))
                    QUEUE_SIZE.labels(model=model_name).set(self.request_queues[model_name].qsize())
                
            except Exception as e:
                logger.error(f"Batch processor error for {model_name}: {e}")
                await asyncio.sleep(0.01)
    
    async def _process_batch(self, batch: BatchRequest):
        """Process a batch of inference requests."""
        try:
            # Prepare batch input
            batch_inputs = []
            for request in batch.requests:
                batch_inputs.append(request.input_data)
            
            # Run batch inference
            batch_results = await self._run_batch_inference(batch.model_name, batch_inputs)
            
            # Set results for each request
            for i, request in enumerate(batch.requests):
                if i < len(batch_results):
                    request.result = batch_results[i]
                else:
                    request.result = {"error": "Batch processing error"}
        
        except Exception as e:
            logger.error(f"Batch processing error: {e}")
            # Set error results for all requests
            for request in batch.requests:
                request.result = {"error": str(e)}
    
    async def _run_batch_inference(self, model_name: str, batch_inputs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Run batch inference with optimized model."""
        try:
            # Get or create optimized model
            if model_name not in self.model_optimizer.optimized_models:
                model_path = f"/models/{model_name}_optimized.onnx"
                self.model_optimizer.optimized_models[model_name] = (
                    self.model_optimizer.optimize_model(model_path, OptimizationLevel.ULTRA)
                )
            
            session = self.model_optimizer.optimized_models[model_name]
            
            # Prepare batch data
            # This would be model-specific preprocessing
            batched_data = self._prepare_batch_data(batch_inputs, model_name)
            
            # Run inference
            outputs = session.run(None, batched_data)
            
            # Post-process results
            results = self._post_process_batch_outputs(outputs, model_name)
            
            return results
        
        except Exception as e:
            logger.error(f"Batch inference error for {model_name}: {e}")
            return [{"error": str(e)} for _ in batch_inputs]
    
    def _prepare_batch_data(self, batch_inputs: List[Dict[str, Any]], model_name: str) -> Dict[str, np.ndarray]:
        """Prepare batch data for inference."""
        # This is model-specific preprocessing
        # Example implementation for text embedding model
        if model_name == "text-embedding":
            # Assume inputs contain 'text' field
            texts = [inp.get('text', '') for inp in batch_inputs]
            
            # Tokenize and create batch (simplified)
            # In real implementation, this would use proper tokenization
            batch_size = len(texts)
            seq_length = 512
            
            # Create dummy input_ids (replace with actual tokenization)
            input_ids = np.random.randint(0, 30000, (batch_size, seq_length), dtype=np.int64)
            attention_mask = np.ones((batch_size, seq_length), dtype=np.int64)
            
            return {
                'input_ids': input_ids,
                'attention_mask': attention_mask
            }
        
        # Default preparation
        return {"inputs": np.array(batch_inputs)}
    
    def _post_process_batch_outputs(self, outputs: List[np.ndarray], model_name: str) -> List[Dict[str, Any]]:
        """Post-process batch outputs."""
        results = []
        
        # Model-specific post-processing
        if model_name == "text-embedding":
            # Assume first output is embeddings
            embeddings = outputs[0]
            
            for i in range(embeddings.shape[0]):
                results.append({
                    "embedding": embeddings[i].tolist(),
                    "model": model_name,
                    "timestamp": time.time()
                })
        
        elif model_name == "recommendation":
            # Assume outputs contain scores
            scores = outputs[0]
            
            for i in range(scores.shape[0]):
                results.append({
                    "scores": scores[i].tolist(),
                    "model": model_name,
                    "timestamp": time.time()
                })
        
        else:
            # Generic post-processing
            for output in outputs:
                results.append({
                    "output": output.tolist() if hasattr(output, 'tolist') else output,
                    "model": model_name,
                    "timestamp": time.time()
                })
        
        return results
    
    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """Get result from cache."""
        if not self.cache_client:
            return None
        
        try:
            cached = await self.cache_client.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        
        return None
    
    async def _set_cache(self, key: str, value: Dict[str, Any], ttl: int = 300):
        """Set result in cache."""
        if not self.cache_client:
            return
        
        try:
            await self.cache_client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    def _update_performance_stats(self, model_name: str, latency_ms: float):
        """Update performance statistics."""
        if model_name not in self.performance_stats:
            self.performance_stats[model_name] = {
                'total_requests': 0,
                'total_latency': 0.0,
                'min_latency': float('inf'),
                'max_latency': 0.0,
                'latencies': deque(maxlen=1000)  # Keep last 1000 latencies
            }
        
        stats = self.performance_stats[model_name]
        stats['total_requests'] += 1
        stats['total_latency'] += latency_ms
        stats['min_latency'] = min(stats['min_latency'], latency_ms)
        stats['max_latency'] = max(stats['max_latency'], latency_ms)
        stats['latencies'].append(latency_ms)
    
    def get_performance_stats(self, model_name: str) -> Dict[str, Any]:
        """Get performance statistics for a model."""
        if model_name not in self.performance_stats:
            return {}
        
        stats = self.performance_stats[model_name]
        total_requests = stats['total_requests']
        
        if total_requests == 0:
            return {}
        
        avg_latency = stats['total_latency'] / total_requests
        
        # Calculate percentiles
        latencies = sorted(stats['latencies'])
        p50 = latencies[len(latencies) // 2] if latencies else 0
        p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0
        p99 = latencies[int(len(latencies) * 0.99)] if latencies else 0
        
        return {
            'total_requests': total_requests,
            'avg_latency_ms': avg_latency,
            'min_latency_ms': stats['min_latency'],
            'max_latency_ms': stats['max_latency'],
            'p50_latency_ms': p50,
            'p95_latency_ms': p95,
            'p99_latency_ms': p99,
            'cache_efficiency': CACHE_EFFICIENCY._value.get() if hasattr(CACHE_EFFICIENCY, '_value') else 0
        }

# Global pipeline instance
inference_pipeline = RealTimeInferencePipeline()

async def initialize_inference_pipeline():
    """Initialize the global inference pipeline."""
    await inference_pipeline.initialize()

async def shutdown_inference_pipeline():
    """Shutdown the global inference pipeline."""
    await inference_pipeline.shutdown()
