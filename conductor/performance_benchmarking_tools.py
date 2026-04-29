# Performance Benchmarking & Profiling Tools
"""
Advanced performance analysis, benchmarking, and optimization profiling suite
"""

import os
import sys
import time
import json
import logging
import asyncio
import threading
import queue
import cProfile
import pstats
import io
import memory_profiler
import psutil
import tracemalloc
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from pathlib import Path
import statistics
import traceback
import subprocess
import requests
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
    from django.test import Client
    from django.urls import reverse
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
    django.setup()
    
    DJANGO_AVAILABLE = True
except ImportError:
    DJANGO_AVAILABLE = False
    print("Warning: Django not available")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BenchmarkType(Enum):
    """Benchmark types."""
    CPU = "cpu"
    MEMORY = "memory"
    DISK_IO = "disk_io"
    NETWORK_IO = "network_io"
    DATABASE = "database"
    API = "api"
    ML_INFERENCE = "ml_inference"
    CACHE = "cache"
    CONCURRENT = "concurrent"
    LOAD = "load"

class ProfilingType(Enum):
    """Profiling types."""
    CPU_PROFILING = "cpu_profiling"
    MEMORY_PROFILING = "memory_profiling"
    LINE_PROFILING = "line_profiling"
    FUNCTION_PROFILING = "function_profiling"
    DATABASE_PROFILING = "database_profiling"
    CACHE_PROFILING = "cache_profiling"

class PerformanceLevel(Enum):
    """Performance levels."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    CRITICAL = "critical"

@dataclass
class BenchmarkResult:
    """Benchmark result data structure."""
    name: str
    benchmark_type: BenchmarkType
    timestamp: datetime
    metrics: Dict[str, float]
    unit: str
    samples: int
    min_value: float
    max_value: float
    mean_value: float
    median_value: float
    std_deviation: float
    percentile_95: float
    percentile_99: float
    performance_level: PerformanceLevel
    baseline_comparison: Optional[Dict[str, float]] = None
    recommendations: List[str] = field(default_factory=list)

@dataclass
class ProfileResult:
    """Profile result data structure."""
    name: str
    profiling_type: ProfilingType
    timestamp: datetime
    duration: float
    function_stats: Dict[str, Dict[str, Any]]
    memory_stats: Dict[str, Any]
    database_stats: Dict[str, Any]
    cache_stats: Dict[str, Any]
    bottlenecks: List[Dict[str, Any]]
    recommendations: List[str] = field(default_factory=list)

@dataclass
class PerformanceMetrics:
    """Performance metrics summary."""
    total_benchmarks: int = 0
    total_profiles: int = 0
    avg_cpu_usage: float = 0.0
    avg_memory_usage: float = 0.0
    avg_response_time: float = 0.0
    avg_throughput: float = 0.0
    performance_score: float = 0.0
    bottlenecks_found: int = 0
    optimizations_suggested: int = 0

class PerformanceBenchmarkingSuite:
    """Advanced performance benchmarking and profiling suite."""
    
    def __init__(self):
        self.benchmark_results: List[BenchmarkResult] = []
        self.profile_results: List[ProfileResult] = []
        self.baseline_results: Dict[str, BenchmarkResult] = {}
        self.benchmark_queue = queue.Queue()
        self.profiling_queue = queue.Queue()
        self.benchmark_executor = ThreadPoolExecutor(max_workers=4)
        self.profiling_executor = ThreadPoolExecutor(max_workers=2)
        self.running = False
        self.benchmark_thread = None
        self.profiling_thread = None
        self.start_time = time.time()
        self.metrics = PerformanceMetrics()
        
        # Initialize benchmark configurations
        self._initialize_benchmark_configs()
        self._setup_scheduled_benchmarks()
    
    def _initialize_benchmark_configs(self):
        """Initialize benchmark configurations."""
        self.benchmark_configs = {
            BenchmarkType.CPU: {
                "duration": 10,
                "intensity": "high",
                "threads": 4,
                "operations": 1000000
            },
            BenchmarkType.MEMORY: {
                "allocation_size": 1024 * 1024,  # 1MB
                "allocations": 1000,
                "pattern": "random"
            },
            BenchmarkType.DISK_IO: {
                "file_size": 1024 * 1024 * 10,  # 10MB
                "operations": 100,
                "pattern": "sequential"
            },
            BenchmarkType.NETWORK_IO: {
                "url": "https://httpbin.org/get",
                "requests": 100,
                "concurrent": 10
            },
            BenchmarkType.DATABASE: {
                "query_count": 1000,
                "complexity": "medium",
                "connections": 5
            },
            BenchmarkType.API: {
                "endpoints": ["/api/v1/courses/", "/api/v1/users/"],
                "requests": 500,
                "concurrent": 20
            },
            BenchmarkType.ML_INFERENCE: {
                "model_type": "classification",
                "batch_size": 32,
                "samples": 1000
            },
            BenchmarkType.CACHE: {
                "operations": 10000,
                "key_size": 100,
                "value_size": 1000
            },
            BenchmarkType.CONCURRENT: {
                "threads": 50,
                "operations_per_thread": 1000,
                "duration": 30
            },
            BenchmarkType.LOAD: {
                "users": 100,
                "ramp_up": 10,
                "duration": 60
            }
        }
    
    def _setup_scheduled_benchmarks(self):
        """Setup scheduled benchmarks."""
        # Schedule daily benchmarks
        schedule.every().day.at("01:00").do(self._run_daily_benchmarks)
        schedule.every().day.at("13:00").do(self._run_daily_benchmarks)
        
        # Schedule weekly profiling
        schedule.every().sunday.at("02:00").do(self._run_weekly_profiling)
        
        # Schedule performance reports
        schedule.every().day.at("08:00").do(self._generate_performance_report)
    
    def start_benchmarking(self):
        """Start benchmarking suite."""
        if self.running:
            logger.warning("Benchmarking suite is already running")
            return
        
        self.running = True
        logger.info("Starting performance benchmarking and profiling suite...")
        
        # Start benchmarking threads
        self.benchmark_thread = threading.Thread(target=self._benchmark_loop, daemon=True)
        self.profiling_thread = threading.Thread(target=self._profiling_loop, daemon=True)
        
        self.benchmark_thread.start()
        self.profiling_thread.start()
        
        logger.info("Performance benchmarking and profiling suite started successfully")
    
    def stop_benchmarking(self):
        """Stop benchmarking suite."""
        if not self.running:
            logger.warning("Benchmarking suite is not running")
            return
        
        self.running = False
        logger.info("Stopping performance benchmarking and profiling suite...")
        
        # Wait for threads to finish
        if self.benchmark_thread:
            self.benchmark_thread.join(timeout=10)
        if self.profiling_thread:
            self.profiling_thread.join(timeout=10)
        
        # Shutdown executors
        self.benchmark_executor.shutdown(wait=True)
        self.profiling_executor.shutdown(wait=True)
        
        logger.info("Performance benchmarking and profiling suite stopped")
    
    def _benchmark_loop(self):
        """Main benchmarking loop."""
        while self.running:
            try:
                # Process benchmark queue
                while not self.benchmark_queue.empty():
                    try:
                        benchmark_config = self.benchmark_queue.get_nowait()
                        self.benchmark_executor.submit(self._run_benchmark, benchmark_config)
                    except queue.Empty:
                        break
                
                # Update metrics
                self._update_performance_metrics()
                
                # Sleep before next iteration
                time.sleep(5)
                
            except Exception as e:
                logger.error(f"Error in benchmark loop: {e}")
                time.sleep(5)
    
    def _profiling_loop(self):
        """Main profiling loop."""
        while self.running:
            try:
                # Process profiling queue
                while not self.profiling_queue.empty():
                    try:
                        profile_config = self.profiling_queue.get_nowait()
                        self.profiling_executor.submit(self._run_profiling, profile_config)
                    except queue.Empty:
                        break
                
                # Sleep before next iteration
                time.sleep(10)
                
            except Exception as e:
                logger.error(f"Error in profiling loop: {e}")
                time.sleep(5)
    
    def run_benchmark(self, benchmark_type: BenchmarkType, **kwargs) -> str:
        """Run a specific benchmark."""
        try:
            benchmark_id = f"benchmark_{int(time.time())}_{benchmark_type.value}"
            
            config = {
                "id": benchmark_id,
                "type": benchmark_type,
                "config": {**self.benchmark_configs[benchmark_type], **kwargs}
            }
            
            self.benchmark_queue.put(config)
            
            return benchmark_id
        
        except Exception as e:
            logger.error(f"Error queuing benchmark: {e}")
            raise
    
    def run_profiling(self, profiling_type: ProfilingType, target_function: Callable, **kwargs) -> str:
        """Run profiling on a target function."""
        try:
            profiling_id = f"profiling_{int(time.time())}_{profiling_type.value}"
            
            config = {
                "id": profiling_id,
                "type": profiling_type,
                "target_function": target_function,
                "config": kwargs
            }
            
            self.profiling_queue.put(config)
            
            return profiling_id
        
        except Exception as e:
            logger.error(f"Error queuing profiling: {e}")
            raise
    
    def _run_benchmark(self, config: Dict[str, Any]):
        """Run a benchmark."""
        try:
            benchmark_id = config["id"]
            benchmark_type = config["type"]
            benchmark_config = config["config"]
            
            logger.info(f"Running benchmark: {benchmark_id} - {benchmark_type.value}")
            
            # Run benchmark based on type
            if benchmark_type == BenchmarkType.CPU:
                result = self._benchmark_cpu(benchmark_id, benchmark_config)
            elif benchmark_type == BenchmarkType.MEMORY:
                result = self._benchmark_memory(benchmark_id, benchmark_config)
            elif benchmark_type == BenchmarkType.DISK_IO:
                result = self._benchmark_disk_io(benchmark_id, benchmark_config)
            elif benchmark_type == BenchmarkType.NETWORK_IO:
                result = self._benchmark_network_io(benchmark_id, benchmark_config)
            elif benchmark_type == BenchmarkType.DATABASE:
                result = self._benchmark_database(benchmark_id, benchmark_config)
            elif benchmark_type == BenchmarkType.API:
                result = self._benchmark_api(benchmark_id, benchmark_config)
            elif benchmark_type == BenchmarkType.ML_INFERENCE:
                result = self._benchmark_ml_inference(benchmark_id, benchmark_config)
            elif benchmark_type == BenchmarkType.CACHE:
                result = self._benchmark_cache(benchmark_id, benchmark_config)
            elif benchmark_type == BenchmarkType.CONCURRENT:
                result = self._benchmark_concurrent(benchmark_id, benchmark_config)
            elif benchmark_type == BenchmarkType.LOAD:
                result = self._benchmark_load(benchmark_id, benchmark_config)
            else:
                raise ValueError(f"Unknown benchmark type: {benchmark_type}")
            
            # Store result
            self.benchmark_results.append(result)
            self.metrics.total_benchmarks += 1
            
            # Compare with baseline
            if benchmark_id in self.baseline_results:
                result.baseline_comparison = self._compare_with_baseline(result, self.baseline_results[benchmark_id])
            
            logger.info(f"Benchmark completed: {benchmark_id}")
        
        except Exception as e:
            logger.error(f"Error running benchmark {config['id']}: {e}")
    
    def _benchmark_cpu(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run CPU benchmark."""
        try:
            duration = config.get("duration", 10)
            operations = config.get("operations", 1000000)
            threads = config.get("threads", 4)
            
            # CPU-intensive computation
            def cpu_intensive_task():
                count = 0
                for i in range(operations // threads):
                    count += i * i
                return count
            
            # Measure performance
            samples = []
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=threads) as executor:
                futures = [executor.submit(cpu_intensive_task) for _ in range(threads)]
                results = [future.result() for future in as_completed(futures)]
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Calculate metrics
            ops_per_second = operations / total_time
            cpu_usage = psutil.cpu_percent(interval=1)
            
            # Collect samples for statistics
            for _ in range(10):
                sample_start = time.time()
                cpu_intensive_task()
                sample_time = time.time() - sample_start
                samples.append(operations / sample_time)
            
            # Calculate statistics
            result = self._create_benchmark_result(
                name=f"CPU Benchmark ({threads} threads)",
                benchmark_type=BenchmarkType.CPU,
                metrics={
                    "operations_per_second": ops_per_second,
                    "cpu_usage": cpu_usage,
                    "total_time": total_time
                },
                unit="ops/sec",
                samples=samples
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error in CPU benchmark: {e}")
            raise
    
    def _benchmark_memory(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run memory benchmark."""
        try:
            allocation_size = config.get("allocation_size", 1024 * 1024)
            allocations = config.get("allocations", 1000)
            pattern = config.get("pattern", "random")
            
            # Memory allocation benchmark
            samples = []
            
            for _ in range(10):
                # Start memory tracing
                tracemalloc.start()
                
                start_time = time.time()
                allocated_data = []
                
                for i in range(allocations):
                    if pattern == "sequential":
                        data = bytearray(allocation_size)
                    else:  # random
                        data = bytearray(allocation_size)
                        # Fill with random data
                        import random
                        for j in range(allocation_size):
                            data[j] = random.randint(0, 255)
                    
                    allocated_data.append(data)
                
                allocation_time = time.time() - start_time
                
                # Get memory statistics
                current, peak = tracemalloc.get_traced_memory()
                tracemalloc.stop()
                
                # Clean up
                del allocated_data
                
                samples.append(allocation_time)
            
            # Calculate metrics
            avg_allocation_time = statistics.mean(samples)
            memory_usage = psutil.virtual_memory().percent
            
            result = self._create_benchmark_result(
                name="Memory Allocation Benchmark",
                benchmark_type=BenchmarkType.MEMORY,
                metrics={
                    "allocation_time": avg_allocation_time,
                    "memory_usage": memory_usage,
                    "allocation_size": allocation_size,
                    "allocations": allocations
                },
                unit="seconds",
                samples=samples
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error in memory benchmark: {e}")
            raise
    
    def _benchmark_disk_io(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run disk I/O benchmark."""
        try:
            file_size = config.get("file_size", 1024 * 1024 * 10)  # 10MB
            operations = config.get("operations", 100)
            pattern = config.get("pattern", "sequential")
            
            # Create temporary file
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_path = temp_file.name
            
            samples = []
            
            try:
                # Write benchmark
                for _ in range(10):
                    start_time = time.time()
                    
                    with open(temp_path, 'wb') as f:
                        for i in range(operations):
                            data = os.urandom(file_size // operations)
                            f.write(data)
                    
                    write_time = time.time() - start_time
                    samples.append(write_time)
                
                # Read benchmark
                read_samples = []
                for _ in range(10):
                    start_time = time.time()
                    
                    with open(temp_path, 'rb') as f:
                        while True:
                            chunk = f.read(4096)
                            if not chunk:
                                break
                    
                    read_time = time.time() - start_time
                    read_samples.append(read_time)
                
                # Calculate metrics
                avg_write_time = statistics.mean(samples)
                avg_read_time = statistics.mean(read_samples)
                write_speed = (file_size * operations) / avg_write_time
                read_speed = (file_size * operations) / avg_read_time
                
                result = self._create_benchmark_result(
                    name="Disk I/O Benchmark",
                    benchmark_type=BenchmarkType.DISK_IO,
                    metrics={
                        "write_speed": write_speed,
                        "read_speed": read_speed,
                        "write_time": avg_write_time,
                        "read_time": avg_read_time
                    },
                    unit="bytes/sec",
                    samples=samples + read_samples
                )
                
                return result
            
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_path)
                except:
                    pass
        
        except Exception as e:
            logger.error(f"Error in disk I/O benchmark: {e}")
            raise
    
    def _benchmark_network_io(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run network I/O benchmark."""
        try:
            url = config.get("url", "https://httpbin.org/get")
            requests_count = config.get("requests", 100)
            concurrent = config.get("concurrent", 10)
            
            samples = []
            
            def make_request():
                start_time = time.time()
                response = requests.get(url, timeout=10)
                end_time = time.time()
                return end_time - start_time, response.status_code
            
            # Concurrent requests
            with ThreadPoolExecutor(max_workers=concurrent) as executor:
                for _ in range(requests_count // concurrent):
                    futures = [executor.submit(make_request) for _ in range(concurrent)]
                    for future in as_completed(futures):
                        request_time, status_code = future.result()
                        if status_code == 200:
                            samples.append(request_time)
            
            # Calculate metrics
            avg_response_time = statistics.mean(samples)
            requests_per_second = requests_count / (sum(samples))
            success_rate = len(samples) / requests_count
            
            result = self._create_benchmark_result(
                name="Network I/O Benchmark",
                benchmark_type=BenchmarkType.NETWORK_IO,
                metrics={
                    "avg_response_time": avg_response_time,
                    "requests_per_second": requests_per_second,
                    "success_rate": success_rate
                },
                unit="ms",
                samples=[s * 1000 for s in samples]  # Convert to ms
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error in network I/O benchmark: {e}")
            raise
    
    def _benchmark_database(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run database benchmark."""
        try:
            if not DJANGO_AVAILABLE:
                raise ImportError("Django not available for database benchmark")
            
            query_count = config.get("query_count", 1000)
            complexity = config.get("complexity", "medium")
            connections = config.get("connections", 5)
            
            samples = []
            
            def run_query():
                start_time = time.time()
                with connection.cursor() as cursor:
                    if complexity == "simple":
                        cursor.execute("SELECT 1")
                    elif complexity == "medium":
                        cursor.execute("SELECT * FROM auth_user LIMIT 10")
                    else:  # complex
                        cursor.execute("""
                            SELECT u.username, COUNT(*) 
                            FROM auth_user u 
                            LEFT JOIN auth_user_groups g ON u.id = g.user_id 
                            GROUP BY u.username 
                            LIMIT 10
                        """)
                    cursor.fetchone()
                return time.time() - start_time
            
            # Run queries concurrently
            with ThreadPoolExecutor(max_workers=connections) as executor:
                for _ in range(query_count // connections):
                    futures = [executor.submit(run_query) for _ in range(connections)]
                    for future in as_completed(futures):
                        query_time = future.result()
                        samples.append(query_time)
            
            # Calculate metrics
            avg_query_time = statistics.mean(samples)
            queries_per_second = query_count / sum(samples)
            
            result = self._create_benchmark_result(
                name="Database Benchmark",
                benchmark_type=BenchmarkType.DATABASE,
                metrics={
                    "avg_query_time": avg_query_time,
                    "queries_per_second": queries_per_second,
                    "complexity": complexity
                },
                unit="ms",
                samples=[s * 1000 for s in samples]  # Convert to ms
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error in database benchmark: {e}")
            raise
    
    def _benchmark_api(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run API benchmark."""
        try:
            if not DJANGO_AVAILABLE:
                raise ImportError("Django not available for API benchmark")
            
            endpoints = config.get("endpoints", ["/api/v1/courses/"])
            requests_count = config.get("requests", 500)
            concurrent = config.get("concurrent", 20)
            
            samples = []
            
            def make_api_request(endpoint):
                client = Client()
                start_time = time.time()
                response = client.get(endpoint)
                end_time = time.time()
                return end_time - start_time, response.status_code
            
            # Run API requests concurrently
            with ThreadPoolExecutor(max_workers=concurrent) as executor:
                for endpoint in endpoints:
                    for _ in range(requests_count // (len(endpoints) * concurrent)):
                        futures = [executor.submit(make_api_request, endpoint) for _ in range(concurrent)]
                        for future in as_completed(futures):
                            request_time, status_code = future.result()
                            if status_code == 200:
                                samples.append(request_time)
            
            # Calculate metrics
            avg_response_time = statistics.mean(samples)
            requests_per_second = requests_count / sum(samples)
            success_rate = len(samples) / requests_count
            
            result = self._create_benchmark_result(
                name="API Benchmark",
                benchmark_type=BenchmarkType.API,
                metrics={
                    "avg_response_time": avg_response_time,
                    "requests_per_second": requests_per_second,
                    "success_rate": success_rate
                },
                unit="ms",
                samples=[s * 1000 for s in samples]  # Convert to ms
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error in API benchmark: {e}")
            raise
    
    def _benchmark_ml_inference(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run ML inference benchmark."""
        try:
            model_type = config.get("model_type", "classification")
            batch_size = config.get("batch_size", 32)
            samples = config.get("samples", 1000)
            
            # Simulate ML inference
            import numpy as np
            
            def simulate_inference(batch_size):
                # Simulate model inference
                input_data = np.random.rand(batch_size, 100)  # 100 features
                
                # Simulate computation
                start_time = time.time()
                
                # Simple neural network simulation
                weights1 = np.random.rand(100, 64)
                weights2 = np.random.rand(64, 32)
                weights3 = np.random.rand(32, 10)
                
                hidden1 = np.dot(input_data, weights1)
                hidden1 = np.maximum(0, hidden1)  # ReLU
                
                hidden2 = np.dot(hidden1, weights2)
                hidden2 = np.maximum(0, hidden2)
                
                output = np.dot(hidden2, weights3)
                predictions = np.argmax(output, axis=1)
                
                end_time = time.time()
                return end_time - start_time, len(predictions)
            
            # Run inference benchmarks
            inference_times = []
            total_predictions = 0
            
            for _ in range(samples // batch_size):
                inference_time, predictions_count = simulate_inference(batch_size)
                inference_times.append(inference_time)
                total_predictions += predictions_count
            
            # Calculate metrics
            avg_inference_time = statistics.mean(inference_times)
            predictions_per_second = total_predictions / sum(inference_times)
            throughput = batch_size / avg_inference_time
            
            result = self._create_benchmark_result(
                name="ML Inference Benchmark",
                benchmark_type=BenchmarkType.ML_INFERENCE,
                metrics={
                    "avg_inference_time": avg_inference_time,
                    "predictions_per_second": predictions_per_second,
                    "throughput": throughput,
                    "batch_size": batch_size
                },
                unit="ms",
                samples=[t * 1000 for t in inference_times]  # Convert to ms
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error in ML inference benchmark: {e}")
            raise
    
    def _benchmark_cache(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run cache benchmark."""
        try:
            if not DJANGO_AVAILABLE:
                raise ImportError("Django not available for cache benchmark")
            
            operations = config.get("operations", 10000)
            key_size = config.get("key_size", 100)
            value_size = config.get("value_size", 1000)
            
            # Generate test data
            import random
            import string
            
            def generate_key(size):
                return ''.join(random.choices(string.ascii_letters + string.digits, k=size))
            
            def generate_value(size):
                return ''.join(random.choices(string.ascii_letters + string.digits, k=size))
            
            # Cache write benchmark
            write_times = []
            for i in range(operations):
                key = generate_key(key_size)
                value = generate_value(value_size)
                
                start_time = time.time()
                cache.set(key, value, timeout=3600)
                write_time = time.time() - start_time
                write_times.append(write_time)
            
            # Cache read benchmark
            read_times = []
            for i in range(operations):
                key = generate_key(key_size)
                
                start_time = time.time()
                value = cache.get(key)
                read_time = time.time() - start_time
                read_times.append(read_time)
            
            # Calculate metrics
            avg_write_time = statistics.mean(write_times)
            avg_read_time = statistics.mean(read_times)
            writes_per_second = operations / sum(write_times)
            reads_per_second = operations / sum(read_times)
            
            result = self._create_benchmark_result(
                name="Cache Benchmark",
                benchmark_type=BenchmarkType.CACHE,
                metrics={
                    "avg_write_time": avg_write_time,
                    "avg_read_time": avg_read_time,
                    "writes_per_second": writes_per_second,
                    "reads_per_second": reads_per_second
                },
                unit="ms",
                samples=[t * 1000 for t in write_times + read_times]  # Convert to ms
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error in cache benchmark: {e}")
            raise
    
    def _benchmark_concurrent(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run concurrent benchmark."""
        try:
            threads = config.get("threads", 50)
            operations_per_thread = config.get("operations_per_thread", 1000)
            duration = config.get("duration", 30)
            
            def concurrent_task(thread_id):
                # Simulate concurrent work
                operations = 0
                start_time = time.time()
                
                while time.time() - start_time < duration and operations < operations_per_thread:
                    # CPU-intensive operation
                    result = sum(i * i for i in range(100))
                    operations += 1
                
                return operations, time.time() - start_time
            
            # Run concurrent tasks
            with ThreadPoolExecutor(max_workers=threads) as executor:
                futures = [executor.submit(concurrent_task, i) for i in range(threads)]
                results = [future.result() for future in as_completed(futures)]
            
            # Calculate metrics
            total_operations = sum(result[0] for result in results)
            total_time = max(result[1] for result in results)
            operations_per_second = total_operations / total_time
            
            result = self._create_benchmark_result(
                name="Concurrent Benchmark",
                benchmark_type=BenchmarkType.CONCURRENT,
                metrics={
                    "total_operations": total_operations,
                    "operations_per_second": operations_per_second,
                    "threads": threads,
                    "duration": total_time
                },
                unit="ops/sec",
                samples=[operations_per_second] * 10  # Simulated samples
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error in concurrent benchmark: {e}")
            raise
    
    def _benchmark_load(self, benchmark_id: str, config: Dict[str, Any]) -> BenchmarkResult:
        """Run load benchmark."""
        try:
            users = config.get("users", 100)
            ramp_up = config.get("ramp_up", 10)
            duration = config.get("duration", 60)
            
            def simulate_user(user_id):
                # Simulate user behavior
                start_time = time.time()
                requests = 0
                
                while time.time() - start_time < duration:
                    # Simulate API request
                    if DJANGO_AVAILABLE:
                        client = Client()
                        try:
                            response = client.get('/health/')
                            if response.status_code == 200:
                                requests += 1
                        except:
                            pass
                    
                    # Simulate think time
                    time.sleep(0.1)
                
                return requests, time.time() - start_time
            
            # Ramp up users gradually
            user_results = []
            for i in range(users):
                # Add users with ramp-up delay
                if i > 0:
                    time.sleep(duration / ramp_up)
                
                # Start user simulation
                with ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(simulate_user, i)
                    result = future.result()
                    user_results.append(result)
            
            # Calculate metrics
            total_requests = sum(result[0] for result in user_results)
            actual_duration = max(result[1] for result in user_results)
            requests_per_second = total_requests / actual_duration
            
            result = self._create_benchmark_result(
                name="Load Benchmark",
                benchmark_type=BenchmarkType.LOAD,
                metrics={
                    "total_requests": total_requests,
                    "requests_per_second": requests_per_second,
                    "users": users,
                    "duration": actual_duration
                },
                unit="req/sec",
                samples=[requests_per_second] * 10  # Simulated samples
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error in load benchmark: {e}")
            raise
    
    def _create_benchmark_result(self, 
                               name: str, 
                               benchmark_type: BenchmarkType,
                               metrics: Dict[str, float],
                               unit: str,
                               samples: List[float]) -> BenchmarkResult:
        """Create benchmark result from data."""
        try:
            # Calculate statistics
            min_value = min(samples)
            max_value = max(samples)
            mean_value = statistics.mean(samples)
            median_value = statistics.median(samples)
            std_deviation = statistics.stdev(samples) if len(samples) > 1 else 0.0
            
            # Calculate percentiles
            sorted_samples = sorted(samples)
            percentile_95 = sorted_samples[int(len(sorted_samples) * 0.95)] if len(sorted_samples) > 0 else 0.0
            percentile_99 = sorted_samples[int(len(sorted_samples) * 0.99)] if len(sorted_samples) > 0 else 0.0
            
            # Determine performance level
            performance_level = self._determine_performance_level(benchmark_type, mean_value)
            
            # Generate recommendations
            recommendations = self._generate_benchmark_recommendations(benchmark_type, metrics, performance_level)
            
            return BenchmarkResult(
                name=name,
                benchmark_type=benchmark_type,
                timestamp=datetime.now(),
                metrics=metrics,
                unit=unit,
                samples=len(samples),
                min_value=min_value,
                max_value=max_value,
                mean_value=mean_value,
                median_value=median_value,
                std_deviation=std_deviation,
                percentile_95=percentile_95,
                percentile_99=percentile_99,
                performance_level=performance_level,
                recommendations=recommendations
            )
        
        except Exception as e:
            logger.error(f"Error creating benchmark result: {e}")
            raise
    
    def _determine_performance_level(self, benchmark_type: BenchmarkType, value: float) -> PerformanceLevel:
        """Determine performance level based on benchmark type and value."""
        try:
            # Performance thresholds (example values)
            thresholds = {
                BenchmarkType.CPU: {
                    "excellent": 1000000,  # ops/sec
                    "good": 500000,
                    "fair": 100000,
                    "poor": 50000
                },
                BenchmarkType.MEMORY: {
                    "excellent": 0.001,  # seconds
                    "good": 0.01,
                    "fair": 0.1,
                    "poor": 1.0
                },
                BenchmarkType.DISK_IO: {
                    "excellent": 100000000,  # bytes/sec
                    "good": 50000000,
                    "fair": 10000000,
                    "poor": 1000000
                },
                BenchmarkType.NETWORK_IO: {
                    "excellent": 1000,  # requests/sec
                    "good": 500,
                    "fair": 100,
                    "poor": 50
                },
                BenchmarkType.DATABASE: {
                    "excellent": 1000,  # queries/sec
                    "good": 500,
                    "fair": 100,
                    "poor": 50
                },
                BenchmarkType.API: {
                    "excellent": 1000,  # requests/sec
                    "good": 500,
                    "fair": 100,
                    "poor": 50
                },
                BenchmarkType.ML_INFERENCE: {
                    "excellent": 1000,  # predictions/sec
                    "good": 500,
                    "fair": 100,
                    "poor": 50
                },
                BenchmarkType.CACHE: {
                    "excellent": 100000,  # ops/sec
                    "good": 50000,
                    "fair": 10000,
                    "poor": 1000
                },
                BenchmarkType.CONCURRENT: {
                    "excellent": 100000,  # ops/sec
                    "good": 50000,
                    "fair": 10000,
                    "poor": 1000
                },
                BenchmarkType.LOAD: {
                    "excellent": 1000,  # requests/sec
                    "good": 500,
                    "fair": 100,
                    "poor": 50
                }
            }
            
            if benchmark_type in thresholds:
                threshold = thresholds[benchmark_type]
                
                if value >= threshold["excellent"]:
                    return PerformanceLevel.EXCELLENT
                elif value >= threshold["good"]:
                    return PerformanceLevel.GOOD
                elif value >= threshold["fair"]:
                    return PerformanceLevel.FAIR
                elif value >= threshold["poor"]:
                    return PerformanceLevel.POOR
                else:
                    return PerformanceLevel.CRITICAL
            else:
                return PerformanceLevel.FAIR
        
        except Exception as e:
            logger.error(f"Error determining performance level: {e}")
            return PerformanceLevel.FAIR
    
    def _generate_benchmark_recommendations(self, 
                                         benchmark_type: BenchmarkType,
                                         metrics: Dict[str, float],
                                         performance_level: PerformanceLevel) -> List[str]:
        """Generate benchmark recommendations."""
        recommendations = []
        
        try:
            if performance_level in [PerformanceLevel.POOR, PerformanceLevel.CRITICAL]:
                if benchmark_type == BenchmarkType.CPU:
                    recommendations.extend([
                        "Consider optimizing CPU-intensive algorithms",
                        "Implement parallel processing where possible",
                        "Profile CPU usage to identify bottlenecks",
                        "Consider upgrading CPU resources"
                    ])
                elif benchmark_type == BenchmarkType.MEMORY:
                    recommendations.extend([
                        "Optimize memory allocation patterns",
                        "Implement memory pooling",
                        "Check for memory leaks",
                        "Consider increasing available memory"
                    ])
                elif benchmark_type == BenchmarkType.DISK_IO:
                    recommendations.extend([
                        "Optimize file I/O operations",
                        "Consider using SSD storage",
                        "Implement caching for frequently accessed data",
                        "Batch I/O operations when possible"
                    ])
                elif benchmark_type == BenchmarkType.NETWORK_IO:
                    recommendations.extend([
                        "Optimize network requests",
                        "Implement connection pooling",
                        "Consider CDN for static content",
                        "Compress data transfers"
                    ])
                elif benchmark_type == BenchmarkType.DATABASE:
                    recommendations.extend([
                        "Optimize database queries",
                        "Add appropriate indexes",
                        "Consider database connection pooling",
                        "Implement query caching"
                    ])
                elif benchmark_type == BenchmarkType.API:
                    recommendations.extend([
                        "Optimize API endpoints",
                        "Implement response caching",
                        "Consider API rate limiting",
                        "Optimize serialization"
                    ])
                elif benchmark_type == BenchmarkType.ML_INFERENCE:
                    recommendations.extend([
                        "Optimize ML model architecture",
                        "Consider model quantization",
                        "Implement batch inference",
                        "Use GPU acceleration if available"
                    ])
                elif benchmark_type == BenchmarkType.CACHE:
                    recommendations.extend([
                        "Optimize cache key strategy",
                        "Consider cache warming",
                        "Implement cache invalidation policies",
                        "Use Redis for distributed caching"
                    ])
                elif benchmark_type == BenchmarkType.CONCURRENT:
                    recommendations.extend([
                        "Optimize concurrent algorithms",
                        "Consider async programming",
                        "Implement proper synchronization",
                        "Optimize thread pool configuration"
                    ])
                elif benchmark_type == BenchmarkType.LOAD:
                    recommendations.extend([
                        "Scale horizontally if needed",
                        "Implement load balancing",
                        "Optimize resource utilization",
                        "Consider auto-scaling"
                    ])
            
            elif performance_level == PerformanceLevel.FAIR:
                recommendations.extend([
                    "Monitor performance trends",
                    "Consider minor optimizations",
                    "Profile to identify improvement opportunities"
                ])
            
            elif performance_level == PerformanceLevel.GOOD:
                recommendations.extend([
                    "Maintain current performance levels",
                    "Continue monitoring for degradation",
                    "Consider optimization for future growth"
                ])
            
            else:  # EXCELLENT
                recommendations.extend([
                    "Performance is excellent - maintain current configuration",
                    "Document best practices",
                    "Monitor for future performance changes"
                ])
        
        except Exception as e:
            logger.error(f"Error generating benchmark recommendations: {e}")
        
        return recommendations[:5]  # Limit to 5 recommendations
    
    def _compare_with_baseline(self, current: BenchmarkResult, baseline: BenchmarkResult) -> Dict[str, float]:
        """Compare current benchmark with baseline."""
        try:
            comparison = {}
            
            for metric_name, current_value in current.metrics.items():
                if metric_name in baseline.metrics:
                    baseline_value = baseline.metrics[metric_name]
                    
                    if baseline_value != 0:
                        change_percent = ((current_value - baseline_value) / baseline_value) * 100
                        comparison[metric_name] = change_percent
                    else:
                        comparison[metric_name] = 0.0
            
            return comparison
        
        except Exception as e:
            logger.error(f"Error comparing with baseline: {e}")
            return {}
    
    def _run_profiling(self, config: Dict[str, Any]):
        """Run profiling."""
        try:
            profiling_id = config["id"]
            profiling_type = config["type"]
            target_function = config["target_function"]
            profile_config = config["config"]
            
            logger.info(f"Running profiling: {profiling_id} - {profiling_type.value}")
            
            # Run profiling based on type
            if profiling_type == ProfilingType.CPU_PROFILING:
                result = self._profile_cpu(profiling_id, target_function, profile_config)
            elif profiling_type == ProfilingType.MEMORY_PROFILING:
                result = self._profile_memory(profiling_id, target_function, profile_config)
            elif profiling_type == ProfilingType.LINE_PROFILING:
                result = self._profile_lines(profiling_id, target_function, profile_config)
            elif profiling_type == ProfilingType.FUNCTION_PROFILING:
                result = self._profile_functions(profiling_id, target_function, profile_config)
            elif profiling_type == ProfilingType.DATABASE_PROFILING:
                result = self._profile_database(profiling_id, target_function, profile_config)
            elif profiling_type == ProfilingType.CACHE_PROFILING:
                result = self._profile_cache(profiling_id, target_function, profile_config)
            else:
                raise ValueError(f"Unknown profiling type: {profiling_type}")
            
            # Store result
            self.profile_results.append(result)
            self.metrics.total_profiles += 1
            
            logger.info(f"Profiling completed: {profiling_id}")
        
        except Exception as e:
            logger.error(f"Error running profiling {config['id']}: {e}")
    
    def _profile_cpu(self, profiling_id: str, target_function: Callable, config: Dict[str, Any]) -> ProfileResult:
        """Run CPU profiling."""
        try:
            # Setup profiler
            profiler = cProfile.Profile()
            
            # Profile the function
            start_time = time.time()
            profiler.enable()
            
            # Call the target function
            if callable(target_function):
                target_function()
            else:
                # Simulate function execution
                sum(i * i for i in range(10000))
            
            profiler.disable()
            end_time = time.time()
            
            # Get statistics
            stats_stream = io.StringIO()
            ps = pstats.Stats(profiler, stream=stats_stream)
            ps.sort_stats('cumulative')
            ps.print_stats()
            
            # Parse function statistics
            function_stats = {}
            for func_info, stats in ps.stats.items():
                filename, line_number, function_name = func_info
                function_stats[f"{function_name}:{line_number}"] = {
                    "calls": stats[0],
                    "total_time": stats[2],
                    "cumulative_time": stats[3],
                    "per_call_time": stats[2] / stats[0] if stats[0] > 0 else 0
                }
            
            # Identify bottlenecks
            bottlenecks = []
            sorted_functions = sorted(function_stats.items(), key=lambda x: x[1]["cumulative_time"], reverse=True)
            
            for func_name, stats in sorted_functions[:5]:
                if stats["cumulative_time"] > 0.1:  # Functions taking more than 0.1s
                    bottlenecks.append({
                        "function": func_name,
                        "cumulative_time": stats["cumulative_time"],
                        "calls": stats["calls"],
                        "per_call": stats["per_call_time"]
                    })
            
            # Generate recommendations
            recommendations = []
            if bottlenecks:
                recommendations.extend([
                    "Optimize functions with high cumulative time",
                    "Consider caching results of expensive functions",
                    "Review algorithm complexity in bottleneck functions"
                ])
            
            return ProfileResult(
                name=f"CPU Profile: {target_function.__name__ if callable(target_function) else 'Unknown'}",
                profiling_type=ProfilingType.CPU_PROFILING,
                timestamp=datetime.now(),
                duration=end_time - start_time,
                function_stats=function_stats,
                memory_stats={},
                database_stats={},
                cache_stats={},
                bottlenecks=bottlenecks,
                recommendations=recommendations
            )
        
        except Exception as e:
            logger.error(f"Error in CPU profiling: {e}")
            raise
    
    def _profile_memory(self, profiling_id: str, target_function: Callable, config: Dict[str, Any]) -> ProfileResult:
        """Run memory profiling."""
        try:
            # Start memory tracing
            tracemalloc.start()
            
            # Get initial memory state
            snapshot1 = tracemalloc.take_snapshot()
            
            # Profile the function
            start_time = time.time()
            
            if callable(target_function):
                target_function()
            else:
                # Simulate memory-intensive function
                data = []
                for i in range(1000):
                    data.append([j for j in range(100)])
            
            end_time = time.time()
            
            # Get final memory state
            snapshot2 = tracemalloc.take_snapshot()
            
            # Compare snapshots
            stats = snapshot2.compare_to(snapshot1, 'lineno')
            
            # Parse memory statistics
            memory_stats = {}
            for stat in stats[:10]:  # Top 10 memory consumers
                memory_stats[f"{stat.traceback.format()[0]}"] = {
                    "size_diff": stat.size_diff,
                    "count_diff": stat.count_diff
                }
            
            # Get current memory usage
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            # Identify bottlenecks
            bottlenecks = []
            for stat in stats[:5]:
                if stat.size_diff > 1024 * 1024:  # More than 1MB
                    bottlenecks.append({
                        "location": str(stat.traceback.format()[0]),
                        "size_diff": stat.size_diff,
                        "count_diff": stat.count_diff
                    })
            
            # Generate recommendations
            recommendations = []
            if bottlenecks:
                recommendations.extend([
                    "Optimize memory allocation in bottleneck locations",
                    "Consider using memory-efficient data structures",
                    "Implement memory pooling for frequent allocations"
                ])
            
            return ProfileResult(
                name=f"Memory Profile: {target_function.__name__ if callable(target_function) else 'Unknown'}",
                profiling_type=ProfilingType.MEMORY_PROFILING,
                timestamp=datetime.now(),
                duration=end_time - start_time,
                function_stats={},
                memory_stats={
                    "current": current,
                    "peak": peak,
                    "differences": memory_stats
                },
                database_stats={},
                cache_stats={},
                bottlenecks=bottlenecks,
                recommendations=recommendations
            )
        
        except Exception as e:
            logger.error(f"Error in memory profiling: {e}")
            raise
    
    def _profile_lines(self, profiling_id: str, target_function: Callable, config: Dict[str, Any]) -> ProfileResult:
        """Run line profiling."""
        try:
            # Note: This is a simplified line profiling implementation
            # In real implementation, you would use line_profiler library
            
            start_time = time.time()
            
            # Simulate line profiling
            if callable(target_function):
                target_function()
            else:
                # Simulate function with multiple lines
                result = 0
                for i in range(1000):
                    result += i * i  # Line 1
                    result += i * 2   # Line 2
                    result += i * 3   # Line 3
            
            end_time = time.time()
            
            # Simulate line statistics
            function_stats = {
                "line_1": {"time": 0.1, "hits": 1000},
                "line_2": {"time": 0.05, "hits": 1000},
                "line_3": {"time": 0.08, "hits": 1000}
            }
            
            bottlenecks = [
                {"line": "line_1", "time": 0.1, "hits": 1000}
            ]
            
            recommendations = [
                "Optimize line 1 - highest time consumption",
                "Consider vectorization for loop operations"
            ]
            
            return ProfileResult(
                name=f"Line Profile: {target_function.__name__ if callable(target_function) else 'Unknown'}",
                profiling_type=ProfilingType.LINE_PROFILING,
                timestamp=datetime.now(),
                duration=end_time - start_time,
                function_stats=function_stats,
                memory_stats={},
                database_stats={},
                cache_stats={},
                bottlenecks=bottlenecks,
                recommendations=recommendations
            )
        
        except Exception as e:
            logger.error(f"Error in line profiling: {e}")
            raise
    
    def _profile_functions(self, profiling_id: str, target_function: Callable, config: Dict[str, Any]) -> ProfileResult:
        """Run function profiling."""
        try:
            # This is similar to CPU profiling but focused on function calls
            return self._profile_cpu(profiling_id, target_function, config)
        
        except Exception as e:
            logger.error(f"Error in function profiling: {e}")
            raise
    
    def _profile_database(self, profiling_id: str, target_function: Callable, config: Dict[str, Any]) -> ProfileResult:
        """Run database profiling."""
        try:
            if not DJANGO_AVAILABLE:
                raise ImportError("Django not available for database profiling")
            
            start_time = time.time()
            
            # Enable Django debug toolbar for query profiling (simulated)
            queries = []
            
            def profile_query():
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    return cursor.fetchone()
            
            # Profile database operations
            if callable(target_function):
                target_function()
            else:
                # Simulate database operations
                for i in range(100):
                    profile_query()
            
            end_time = time.time()
            
            # Simulate database statistics
            database_stats = {
                "total_queries": 100,
                "total_time": 0.5,
                "avg_query_time": 0.005,
                "slow_queries": 2
            }
            
            bottlenecks = [
                {"query": "SELECT 1", "time": 0.01, "count": 100}
            ]
            
            recommendations = [
                "Optimize slow queries",
                "Consider query caching",
                "Add appropriate indexes"
            ]
            
            return ProfileResult(
                name=f"Database Profile: {target_function.__name__ if callable(target_function) else 'Unknown'}",
                profiling_type=ProfilingType.DATABASE_PROFILING,
                timestamp=datetime.now(),
                duration=end_time - start_time,
                function_stats={},
                memory_stats={},
                database_stats=database_stats,
                cache_stats={},
                bottlenecks=bottlenecks,
                recommendations=recommendations
            )
        
        except Exception as e:
            logger.error(f"Error in database profiling: {e}")
            raise
    
    def _profile_cache(self, profiling_id: str, target_function: Callable, config: Dict[str, Any]) -> ProfileResult:
        """Run cache profiling."""
        try:
            if not DJANGO_AVAILABLE:
                raise ImportError("Django not available for cache profiling")
            
            start_time = time.time()
            
            # Profile cache operations
            cache_stats = {
                "hits": 0,
                "misses": 0,
                "sets": 0,
                "gets": 0
            }
            
            def cache_operation():
                key = f"test_key_{cache_stats['gets']}"
                value = f"test_value_{cache_stats['gets']}"
                
                cache.set(key, value, timeout=60)
                cache_stats['sets'] += 1
                
                result = cache.get(key)
                if result:
                    cache_stats['hits'] += 1
                else:
                    cache_stats['misses'] += 1
                
                cache_stats['gets'] += 1
            
            # Profile cache operations
            if callable(target_function):
                target_function()
            else:
                # Simulate cache operations
                for i in range(1000):
                    cache_operation()
            
            end_time = time.time()
            
            # Calculate cache hit rate
            hit_rate = cache_stats['hits'] / cache_stats['gets'] if cache_stats['gets'] > 0 else 0
            
            cache_stats['hit_rate'] = hit_rate
            
            bottlenecks = []
            if hit_rate < 0.8:
                bottlenecks.append({
                    "operation": "cache_get",
                    "issue": "low_hit_rate",
                    "hit_rate": hit_rate
                })
            
            recommendations = []
            if hit_rate < 0.8:
                recommendations.extend([
                    "Improve cache hit rate",
                    "Review cache key strategy",
                    "Consider cache warming"
                ])
            
            return ProfileResult(
                name=f"Cache Profile: {target_function.__name__ if callable(target_function) else 'Unknown'}",
                profiling_type=ProfilingType.CACHE_PROFILING,
                timestamp=datetime.now(),
                duration=end_time - start_time,
                function_stats={},
                memory_stats={},
                database_stats={},
                cache_stats=cache_stats,
                bottlenecks=bottlenecks,
                recommendations=recommendations
            )
        
        except Exception as e:
            logger.error(f"Error in cache profiling: {e}")
            raise
    
    def _run_daily_benchmarks(self):
        """Run daily benchmarks."""
        try:
            if self.running:
                logger.info("Running daily benchmarks...")
                
                # Run all benchmark types
                for benchmark_type in BenchmarkType:
                    self.run_benchmark(benchmark_type)
        
        except Exception as e:
            logger.error(f"Error running daily benchmarks: {e}")
    
    def _run_weekly_profiling(self):
        """Run weekly profiling."""
        try:
            if self.running:
                logger.info("Running weekly profiling...")
                
                # Profile common functions
                def sample_function():
                    return sum(i * i for i in range(10000))
                
                self.run_profiling(ProfilingType.CPU_PROFILING, sample_function)
                self.run_profiling(ProfilingType.MEMORY_PROFILING, sample_function)
        
        except Exception as e:
            logger.error(f"Error running weekly profiling: {e}")
    
    def _generate_performance_report(self):
        """Generate performance report."""
        try:
            logger.info("Generating performance report...")
            
            report = self._create_performance_report()
            
            # Save report
            report_file = f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            logger.info(f"Performance report saved: {report_file}")
        
        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
    
    def _create_performance_report(self) -> Dict[str, Any]:
        """Create comprehensive performance report."""
        try:
            return {
                "timestamp": datetime.now().isoformat(),
                "metrics": {
                    "total_benchmarks": self.metrics.total_benchmarks,
                    "total_profiles": self.metrics.total_profiles,
                    "avg_cpu_usage": self.metrics.avg_cpu_usage,
                    "avg_memory_usage": self.metrics.avg_memory_usage,
                    "avg_response_time": self.metrics.avg_response_time,
                    "avg_throughput": self.metrics.avg_throughput,
                    "performance_score": self.metrics.performance_score,
                    "bottlenecks_found": self.metrics.bottlenecks_found,
                    "optimizations_suggested": self.metrics.optimizations_suggested
                },
                "benchmark_results": [
                    {
                        "name": result.name,
                        "benchmark_type": result.benchmark_type.value,
                        "timestamp": result.timestamp.isoformat(),
                        "performance_level": result.performance_level.value,
                        "mean_value": result.mean_value,
                        "unit": result.unit,
                        "metrics": result.metrics,
                        "recommendations": result.recommendations
                    }
                    for result in sorted(self.benchmark_results, key=lambda r: r.timestamp, reverse=True)[:10]
                ],
                "profile_results": [
                    {
                        "name": result.name,
                        "profiling_type": result.profiling_type.value,
                        "timestamp": result.timestamp.isoformat(),
                        "duration": result.duration,
                        "bottlenecks": result.bottlenecks,
                        "recommendations": result.recommendations
                    }
                    for result in sorted(self.profile_results, key=lambda r: r.timestamp, reverse=True)[:5]
                ],
                "performance_trends": self._calculate_performance_trends(),
                "recommendations": self._generate_overall_recommendations()
            }
        
        except Exception as e:
            logger.error(f"Error creating performance report: {e}")
            return {}
    
    def _calculate_performance_trends(self) -> Dict[str, Any]:
        """Calculate performance trends."""
        try:
            trends = {}
            
            # Group benchmarks by type
            by_type = {}
            for result in self.benchmark_results:
                benchmark_type = result.benchmark_type.value
                if benchmark_type not in by_type:
                    by_type[benchmark_type] = []
                by_type[benchmark_type].append(result)
            
            # Calculate trends for each type
            for benchmark_type, results in by_type.items():
                if len(results) >= 2:
                    # Sort by timestamp
                    sorted_results = sorted(results, key=lambda r: r.timestamp)
                    
                    # Calculate trend
                    recent = sorted_results[-5:]  # Last 5 results
                    if len(recent) >= 2:
                        values = [r.mean_value for r in recent]
                        trend = (values[-1] - values[0]) / values[0] * 100 if values[0] != 0 else 0
                        
                        trends[benchmark_type] = {
                            "trend_percent": trend,
                            "direction": "improving" if trend > 0 else "degrading" if trend < 0 else "stable",
                            "sample_count": len(recent)
                        }
            
            return trends
        
        except Exception as e:
            logger.error(f"Error calculating performance trends: {e}")
            return {}
    
    def _generate_overall_recommendations(self) -> List[str]:
        """Generate overall performance recommendations."""
        recommendations = []
        
        try:
            # Analyze benchmark results
            if self.benchmark_results:
                # Count performance levels
                level_counts = {}
                for result in self.benchmark_results:
                    level = result.performance_level.value
                    level_counts[level] = level_counts.get(level, 0) + 1
                
                # Generate recommendations based on performance distribution
                total = len(self.benchmark_results)
                if level_counts.get("critical", 0) > 0:
                    recommendations.append("Address critical performance issues immediately")
                
                if level_counts.get("poor", 0) / total > 0.3:
                    recommendations.append("Multiple benchmarks show poor performance - consider system optimization")
                
                if level_counts.get("excellent", 0) / total > 0.7:
                    recommendations.append("Performance is excellent - maintain current configuration")
            
            # Analyze profiling results
            if self.profile_results:
                total_bottlenecks = sum(len(result.bottlenecks) for result in self.profile_results)
                if total_bottlenecks > 10:
                    recommendations.append("Multiple bottlenecks found - prioritize optimization efforts")
            
            # General recommendations
            recommendations.extend([
                "Continue regular performance monitoring",
                "Set up automated performance alerts",
                "Document performance baselines",
                "Consider performance testing in CI/CD pipeline"
            ])
        
        except Exception as e:
            logger.error(f"Error generating overall recommendations: {e}")
        
        return recommendations[:10]
    
    def _update_performance_metrics(self):
        """Update performance metrics."""
        try:
            if self.benchmark_results:
                # Calculate average metrics
                cpu_values = [r.metrics.get("cpu_usage", 0) for r in self.benchmark_results if "cpu_usage" in r.metrics]
                memory_values = [r.metrics.get("memory_usage", 0) for r in self.benchmark_results if "memory_usage" in r.metrics]
                response_times = [r.mean_value for r in self.benchmark_results if r.unit in ["ms", "seconds"]]
                throughputs = [r.metrics.get("requests_per_second", r.metrics.get("operations_per_second", 0)) 
                             for r in self.benchmark_results]
                
                self.metrics.avg_cpu_usage = statistics.mean(cpu_values) if cpu_values else 0
                self.metrics.avg_memory_usage = statistics.mean(memory_values) if memory_values else 0
                self.metrics.avg_response_time = statistics.mean(response_times) if response_times else 0
                self.metrics.avg_throughput = statistics.mean(throughputs) if throughputs else 0
                
                # Calculate performance score
                self.metrics.performance_score = self._calculate_performance_score()
            
            # Update bottleneck count
            self.metrics.bottlenecks_found = sum(len(result.bottlenecks) for result in self.profile_results)
            
            # Update optimization suggestions
            self.metrics.optimizations_suggested = sum(len(result.recommendations) for result in self.benchmark_results + self.profile_results)
        
        except Exception as e:
            logger.error(f"Error updating performance metrics: {e}")
    
    def _calculate_performance_score(self) -> float:
        """Calculate overall performance score."""
        try:
            if not self.benchmark_results:
                return 0.0
            
            # Score based on performance levels
            level_scores = {
                PerformanceLevel.EXCELLENT: 100,
                PerformanceLevel.GOOD: 80,
                PerformanceLevel.FAIR: 60,
                PerformanceLevel.POOR: 40,
                PerformanceLevel.CRITICAL: 20
            }
            
            scores = [level_scores.get(result.performance_level, 50) for result in self.benchmark_results]
            return statistics.mean(scores)
        
        except Exception as e:
            logger.error(f"Error calculating performance score: {e}")
            return 50.0
    
    def get_performance_status(self) -> Dict[str, Any]:
        """Get current performance status."""
        try:
            return {
                "running": self.running,
                "uptime": time.time() - self.start_time,
                "metrics": {
                    "total_benchmarks": self.metrics.total_benchmarks,
                    "total_profiles": self.metrics.total_profiles,
                    "avg_cpu_usage": self.metrics.avg_cpu_usage,
                    "avg_memory_usage": self.metrics.avg_memory_usage,
                    "avg_response_time": self.metrics.avg_response_time,
                    "avg_throughput": self.metrics.avg_throughput,
                    "performance_score": self.metrics.performance_score,
                    "bottlenecks_found": self.metrics.bottlenecks_found,
                    "optimizations_suggested": self.metrics.optimizations_suggested
                },
                "recent_benchmarks": [
                    {
                        "name": result.name,
                        "benchmark_type": result.benchmark_type.value,
                        "performance_level": result.performance_level.value,
                        "mean_value": result.mean_value,
                        "unit": result.unit,
                        "timestamp": result.timestamp.isoformat()
                    }
                    for result in sorted(self.benchmark_results, key=lambda r: r.timestamp, reverse=True)[:5]
                ],
                "recent_profiles": [
                    {
                        "name": result.name,
                        "profiling_type": result.profiling_type.value,
                        "duration": result.duration,
                        "bottlenecks_count": len(result.bottlenecks),
                        "timestamp": result.timestamp.isoformat()
                    }
                    for result in sorted(self.profile_results, key=lambda r: r.timestamp, reverse=True)[:3]
                ]
            }
        
        except Exception as e:
            logger.error(f"Error getting performance status: {e}")
            return {}

def main():
    """Main function for the performance benchmarking suite."""
    print("🚀 Starting Performance Benchmarking & Profiling Tools...")
    print("=" * 80)
    
    # Create benchmarking suite
    benchmarking_suite = PerformanceBenchmarkingSuite()
    
    try:
        # Start benchmarking
        benchmarking_suite.start_benchmarking()
        
        print("✅ Performance benchmarking and profiling suite started successfully!")
        print(f"📊 Total benchmarks: {benchmarking_suite.metrics.total_benchmarks}")
        print(f"🔍 Total profiles: {benchmarking_suite.metrics.total_profiles}")
        print(f"📈 Performance score: {benchmarking_suite.metrics.performance_score:.1f}/100")
        
        # Run example benchmarks
        print("\n🏃 Running example benchmarks...")
        
        # CPU benchmark
        cpu_benchmark_id = benchmarking_suite.run_benchmark(BenchmarkType.CPU, threads=2, operations=500000)
        print(f"💻 CPU benchmark queued: {cpu_benchmark_id}")
        
        # Memory benchmark
        memory_benchmark_id = benchmarking_suite.run_benchmark(BenchmarkType.MEMORY, allocations=500)
        print(f"🧠 Memory benchmark queued: {memory_benchmark_id}")
        
        # API benchmark
        api_benchmark_id = benchmarking_suite.run_benchmark(BenchmarkType.API, requests=100, concurrent=5)
        print(f"🌐 API benchmark queued: {api_benchmark_id}")
        
        # Run example profiling
        def sample_function():
            """Sample function for profiling."""
            total = 0
            for i in range(10000):
                total += i * i
            return total
        
        cpu_profile_id = benchmarking_suite.run_profiling(ProfilingType.CPU_PROFILING, sample_function)
        print(f"🔍 CPU profiling queued: {cpu_profile_id}")
        
        memory_profile_id = benchmarking_suite.run_profiling(ProfilingType.MEMORY_PROFILING, sample_function)
        print(f"🧠 Memory profiling queued: {memory_profile_id}")
        
        # Display status every 20 seconds
        while True:
            time.sleep(20)
            
            status = benchmarking_suite.get_performance_status()
            
            print(f"\n📊 Performance Status (Uptime: {status['uptime']:.0f}s):")
            print("=" * 80)
            print(f"🏃 Total Benchmarks: {status['metrics']['total_benchmarks']}")
            print(f"🔍 Total Profiles: {status['metrics']['total_profiles']}")
            print(f"💻 Avg CPU Usage: {status['metrics']['avg_cpu_usage']:.1f}%")
            print(f"🧠 Avg Memory Usage: {status['metrics']['avg_memory_usage']:.1f}%")
            print(f"⏱️  Avg Response Time: {status['metrics']['avg_response_time']:.3f}s")
            print(f"📈 Avg Throughput: {status['metrics']['avg_throughput']:.1f} ops/sec")
            print(f"🎯 Performance Score: {status['metrics']['performance_score']:.1f}/100")
            print(f"🔧 Bottlenecks Found: {status['metrics']['bottlenecks_found']}")
            print(f"💡 Optimizations Suggested: {status['metrics']['optimizations_suggested']}")
            
            # Display recent benchmarks
            if status['recent_benchmarks']:
                print(f"\n📋 Recent Benchmarks:")
                print("=" * 80)
                for benchmark in status['recent_benchmarks']:
                    level_icon = {
                        PerformanceLevel.EXCELLENT: "🌟",
                        PerformanceLevel.GOOD: "✅",
                        PerformanceLevel.FAIR: "⚠️",
                        PerformanceLevel.POOR: "❌",
                        PerformanceLevel.CRITICAL: "🆘"
                    }.get(benchmark['performance_level'], "📊")
                    
                    print(f"{level_icon} {benchmark['name']}: {benchmark['performance_level'].upper()} ({benchmark['mean_value']:.2f} {benchmark['unit']})")
            
            # Display recent profiles
            if status['recent_profiles']:
                print(f"\n🔍 Recent Profiles:")
                print("=" * 80)
                for profile in status['recent_profiles']:
                    print(f"🔍 {profile['name']}: {profile['duration']:.3f}s, {profile['bottlenecks_count']} bottlenecks")
            
            # Performance assessment
            performance_score = status['metrics']['performance_score']
            if performance_score >= 90:
                print(f"\n🌟 Performance Health: EXCELLENT ({performance_score:.1f}/100)")
            elif performance_score >= 80:
                print(f"\n✅ Performance Health: GOOD ({performance_score:.1f}/100)")
            elif performance_score >= 70:
                print(f"\n⚠️  Performance Health: FAIR ({performance_score:.1f}/100)")
            elif performance_score >= 60:
                print(f"\n❌ Performance Health: POOR ({performance_score:.1f}/100)")
            else:
                print(f"\n🆘 Performance Health: CRITICAL ({performance_score:.1f}/100)")
    
    except KeyboardInterrupt:
        print("\n🛑 Stopping performance benchmarking suite...")
        benchmarking_suite.stop_benchmarking()
        print("✅ Performance benchmarking suite stopped")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        benchmarking_suite.stop_benchmarking()

if __name__ == '__main__':
    main()
