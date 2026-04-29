# ENTERPRISE SCALABILITY TESTING
"""
Enterprise-level scalability testing for Learning Hub platform.
Tests system performance under massive scale and distributed load.
"""

import asyncio
import aiohttp
import json
import time
import statistics
import psutil
import random
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed

@dataclass
class ScalabilityTestResult:
    test_name: str
    concurrent_users: int
    requests_per_second: float
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    error_rate: float
    cpu_usage: float
    memory_usage: float
    success: bool
    description: str

class EnterpriseScalabilityTester:
    """Enterprise-level scalability testing suite."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        self.results = []
        self.system_monitor = SystemMonitor()
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        await self.system_monitor.start()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        await self.system_monitor.stop()
    
    def add_result(self, test_name: str, concurrent_users: int, rps: float,
                   avg_rt: float, p95_rt: float, p99_rt: float, error_rate: float,
                   cpu_usage: float, memory_usage: float, success: bool, description: str):
        """Add a scalability test result."""
        result = ScalabilityTestResult(
            test_name=test_name,
            concurrent_users=concurrent_users,
            requests_per_second=rps,
            avg_response_time=avg_rt,
            p95_response_time=p95_rt,
            p99_response_time=p99_rt,
            error_rate=error_rate,
            cpu_usage=cpu_usage,
            memory_usage=memory_usage,
            success=success,
            description=description
        )
        self.results.append(result)
    
    async def test_massive_concurrent_load(self, concurrent_users: int = 10000) -> ScalabilityTestResult:
        """Test system under massive concurrent load."""
        print(f"🚀 Testing Massive Concurrent Load: {concurrent_users:,} users")
        
        endpoints = [
            "/api/v1/courses/",
            "/api/v1/courses/recommendations/",
            "/api/v1/gamification/leaderboard/",
            "/api/v1/dashboard/student_stats/",
            "/api/v1/ai/recommendations/",
            "/health/",
        ]
        
        start_time = time.time()
        response_times = []
        success_count = 0
        error_count = 0
        total_requests = 0
        
        async def make_request_batch(batch_size: int):
            nonlocal success_count, error_count, total_requests
            
            batch_tasks = []
            for _ in range(batch_size):
                endpoint = random.choice(endpoints)
                task = self._make_single_request(endpoint)
                batch_tasks.append(task)
            
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            for result in batch_results:
                if isinstance(result, dict):
                    response_times.append(result["response_time"])
                    if result["success"]:
                        success_count += 1
                    else:
                        error_count += 1
                    total_requests += 1
        
        # Process in batches to avoid overwhelming the system
        batch_size = 100
        num_batches = concurrent_users // batch_size
        
        for batch_num in range(num_batches):
            await make_request_batch(batch_size)
            
            # Brief pause between batches
            if batch_num % 10 == 0:
                await asyncio.sleep(0.1)
        
        # Calculate metrics
        total_time = time.time() - start_time
        rps = total_requests / total_time if total_time > 0 else 0
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        
        # Get system metrics
        system_metrics = await self.system_monitor.get_metrics()
        
        # Calculate percentiles
        if response_times:
            avg_rt = statistics.mean(response_times)
            p95_rt = statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times)
            p99_rt = statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else max(response_times)
        else:
            avg_rt = p95_rt = p99_rt = 0
        
        # Success criteria
        success = (error_rate < 5 and avg_rt < 1.0 and system_metrics["cpu"] < 90 and system_metrics["memory"] < 90)
        
        self.add_result(
            "Massive Concurrent Load",
            concurrent_users,
            rps,
            avg_rt,
            p95_rt,
            p99_rt,
            error_rate,
            system_metrics["cpu"],
            system_metrics["memory"],
            success,
            f"Test with {concurrent_users:,} concurrent users"
        )
        
        return ScalabilityTestResult(
            "Massive Concurrent Load", concurrent_users, rps, avg_rt, p95_rt, p99_rt,
            error_rate, system_metrics["cpu"], system_metrics["memory"], success,
            "Massive load test completed"
        )
    
    async def _make_single_request(self, endpoint: str) -> Dict[str, Any]:
        """Make a single request and return metrics."""
        request_start = time.time()
        
        try:
            async with self.session.get(f"{self.base_url}{endpoint}", timeout=10) as response:
                await response.text()
                request_time = time.time() - request_start
                return {
                    "response_time": request_time,
                    "success": response.status == 200
                }
        except Exception:
            request_time = time.time() - request_start
            return {
                "response_time": request_time,
                "success": False
            }
    
    async def test_database_scalability(self, concurrent_operations: int = 5000) -> ScalabilityTestResult:
        """Test database scalability under massive concurrent operations."""
        print(f"💾 Testing Database Scalability: {concurrent_operations:,} operations")
        
        start_time = time.time()
        response_times = []
        success_count = 0
        error_count = 0
        total_requests = 0
        
        async def make_database_operation():
            nonlocal success_count, error_count, total_requests
            
            operation_start = time.time()
            
            try:
                # Simulate database write operations
                data = {
                    "title": f"Scalability Test Course {random.randint(1, 1000000)}",
                    "description": "Scalability test course description",
                    "price": random.uniform(10.0, 1000.0),
                    "category": random.choice(["programming", "design", "business", "data-science"])
                }
                
                async with self.session.post(f"{self.base_url}/api/v1/courses/", json=data, timeout=30) as response:
                    await response.text()
                    operation_time = time.time() - operation_start
                    response_times.append(operation_time)
                    
                    if response.status in [200, 201]:
                        success_count += 1
                    else:
                        error_count += 1
                    total_requests += 1
                    
            except Exception:
                operation_time = time.time() - operation_start
                response_times.append(operation_time)
                error_count += 1
                total_requests += 1
        
        # Process in batches
        batch_size = 50
        num_batches = concurrent_operations // batch_size
        
        for _ in range(num_batches):
            batch_tasks = [make_database_operation() for _ in range(batch_size)]
            await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Brief pause between batches
            await asyncio.sleep(0.05)
        
        # Calculate metrics
        total_time = time.time() - start_time
        rps = total_requests / total_time if total_time > 0 else 0
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        
        # Get system metrics
        system_metrics = await self.system_monitor.get_metrics()
        
        # Calculate percentiles
        if response_times:
            avg_rt = statistics.mean(response_times)
            p95_rt = statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times)
            p99_rt = statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else max(response_times)
        else:
            avg_rt = p95_rt = p99_rt = 0
        
        # Success criteria
        success = (error_rate < 10 and avg_rt < 2.0 and system_metrics["cpu"] < 95 and system_metrics["memory"] < 95)
        
        self.add_result(
            "Database Scalability",
            concurrent_operations,
            rps,
            avg_rt,
            p95_rt,
            p99_rt,
            error_rate,
            system_metrics["cpu"],
            system_metrics["memory"],
            success,
            f"Database test with {concurrent_operations:,} operations"
        )
        
        return ScalabilityTestResult(
            "Database Scalability", concurrent_operations, rps, avg_rt, p95_rt, p99_rt,
            error_rate, system_metrics["cpu"], system_metrics["memory"], success,
            "Database scalability test completed"
        )
    
    async def test_websocket_scalability(self, concurrent_connections: int = 5000) -> ScalabilityTestResult:
        """Test WebSocket scalability under massive concurrent connections."""
        print(f"🔌 Testing WebSocket Scalability: {concurrent_connections:,} connections")
        
        import websockets
        
        start_time = time.time()
        connection_times = []
        success_count = 0
        error_count = 0
        
        async def websocket_connection():
            nonlocal success_count, error_count
            
            connection_start = time.time()
            
            try:
                uri = f"ws://localhost:8000/ws/social/"
                async with websockets.connect(uri, timeout=10) as websocket:
                    # Send test messages
                    for _ in range(5):
                        await websocket.send(json.dumps({"type": "ping", "data": "test"}))
                        response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        await asyncio.sleep(0.01)
                    
                    connection_time = time.time() - connection_start
                    connection_times.append(connection_time)
                    success_count += 1
                    
            except Exception:
                connection_time = time.time() - connection_start
                connection_times.append(connection_time)
                error_count += 1
        
        # Process in batches
        batch_size = 100
        num_batches = concurrent_connections // batch_size
        
        for _ in range(num_batches):
            batch_tasks = [websocket_connection() for _ in range(batch_size)]
            await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Brief pause between batches
            await asyncio.sleep(0.1)
        
        # Calculate metrics
        total_time = time.time() - start_time
        rps = (success_count + error_count) / total_time if total_time > 0 else 0
        error_rate = (error_count / (success_count + error_count) * 100) if (success_count + error_count) > 0 else 0
        
        # Get system metrics
        system_metrics = await self.system_monitor.get_metrics()
        
        # Calculate percentiles
        if connection_times:
            avg_rt = statistics.mean(connection_times)
            p95_rt = statistics.quantiles(connection_times, n=20)[18] if len(connection_times) > 20 else max(connection_times)
            p99_rt = statistics.quantiles(connection_times, n=100)[98] if len(connection_times) > 100 else max(connection_times)
        else:
            avg_rt = p95_rt = p99_rt = 0
        
        # Success criteria
        success = (error_rate < 10 and avg_rt < 1.0 and system_metrics["cpu"] < 90 and system_metrics["memory"] < 90)
        
        self.add_result(
            "WebSocket Scalability",
            concurrent_connections,
            rps,
            avg_rt,
            p95_rt,
            p99_rt,
            error_rate,
            system_metrics["cpu"],
            system_metrics["memory"],
            success,
            f"WebSocket test with {concurrent_connections:,} connections"
        )
        
        return ScalabilityTestResult(
            "WebSocket Scalability", concurrent_connections, rps, avg_rt, p95_rt, p99_rt,
            error_rate, system_metrics["cpu"], system_metrics["memory"], success,
            "WebSocket scalability test completed"
        )
    
    async def test_cache_scalability(self, concurrent_requests: int = 20000) -> ScalabilityTestResult:
        """Test cache scalability under massive concurrent requests."""
        print(f"🗄️ Testing Cache Scalability: {concurrent_requests:,} requests")
        
        # Use cache-intensive endpoints
        cache_endpoints = [
            "/api/v1/categories/",
            "/api/v1/gamification/leaderboard/",
            "/api/v1/courses/popular/",
            "/api/v1/ai/trending/",
        ]
        
        start_time = time.time()
        response_times = []
        success_count = 0
        error_count = 0
        total_requests = 0
        
        async def make_cache_request():
            nonlocal success_count, error_count, total_requests
            
            endpoint = random.choice(cache_endpoints)
            request_start = time.time()
            
            try:
                async with self.session.get(f"{self.base_url}{endpoint}", timeout=5) as response:
                    await response.text()
                    request_time = time.time() - request_start
                    response_times.append(request_time)
                    
                    if response.status == 200:
                        success_count += 1
                    else:
                        error_count += 1
                    total_requests += 1
                    
            except Exception:
                request_time = time.time() - request_start
                response_times.append(request_time)
                error_count += 1
                total_requests += 1
        
        # Process in batches
        batch_size = 200
        num_batches = concurrent_requests // batch_size
        
        for _ in range(num_batches):
            batch_tasks = [make_cache_request() for _ in range(batch_size)]
            await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Very brief pause for cache-intensive operations
            await asyncio.sleep(0.01)
        
        # Calculate metrics
        total_time = time.time() - start_time
        rps = total_requests / total_time if total_time > 0 else 0
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        
        # Get system metrics
        system_metrics = await self.system_monitor.get_metrics()
        
        # Calculate percentiles
        if response_times:
            avg_rt = statistics.mean(response_times)
            p95_rt = statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times)
            p99_rt = statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else max(response_times)
        else:
            avg_rt = p95_rt = p99_rt = 0
        
        # Success criteria (cache should be very fast)
        success = (error_rate < 5 and avg_rt < 0.5 and system_metrics["cpu"] < 80 and system_metrics["memory"] < 80)
        
        self.add_result(
            "Cache Scalability",
            concurrent_requests,
            rps,
            avg_rt,
            p95_rt,
            p99_rt,
            error_rate,
            system_metrics["cpu"],
            system_metrics["memory"],
            success,
            f"Cache test with {concurrent_requests:,} requests"
        )
        
        return ScalabilityTestResult(
            "Cache Scalability", concurrent_requests, rps, avg_rt, p95_rt, p99_rt,
            error_rate, system_metrics["cpu"], system_metrics["memory"], success,
            "Cache scalability test completed"
        )
    
    async def test_horizontal_scalability(self) -> ScalabilityTestResult:
        """Test horizontal scalability by simulating multiple instances."""
        print("🌐 Testing Horizontal Scalability...")
        
        # Simulate load balancing across multiple instances
        instances = [f"http://localhost:800{i}" for i in range(8000, 8003)]  # 3 instances
        
        start_time = time.time()
        response_times = []
        success_count = 0
        error_count = 0
        total_requests = 0
        instance_stats = {instance: {"success": 0, "error": 0} for instance in instances}
        
        async def make_distributed_request():
            nonlocal success_count, error_count, total_requests
            
            instance = random.choice(instances)
            endpoint = "/health/"
            request_start = time.time()
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{instance}{endpoint}", timeout=5) as response:
                        await response.text()
                        request_time = time.time() - request_start
                        response_times.append(request_time)
                        
                        if response.status == 200:
                            success_count += 1
                            instance_stats[instance]["success"] += 1
                        else:
                            error_count += 1
                            instance_stats[instance]["error"] += 1
                        total_requests += 1
                        
            except Exception:
                request_time = time.time() - request_start
                response_times.append(request_time)
                error_count += 1
                instance_stats[instance]["error"] += 1
                total_requests += 1
        
        # Make distributed requests
        concurrent_requests = 5000
        batch_tasks = [make_distributed_request() for _ in range(concurrent_requests)]
        await asyncio.gather(*batch_tasks, return_exceptions=True)
        
        # Calculate metrics
        total_time = time.time() - start_time
        rps = total_requests / total_time if total_time > 0 else 0
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        
        # Get system metrics
        system_metrics = await self.system_monitor.get_metrics()
        
        # Calculate percentiles
        if response_times:
            avg_rt = statistics.mean(response_times)
            p95_rt = statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times)
            p99_rt = statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else max(response_times)
        else:
            avg_rt = p95_rt = p99_rt = 0
        
        # Check load distribution
        max_requests = max(stats["success"] + stats["error"] for stats in instance_stats.values())
        min_requests = min(stats["success"] + stats["error"] for stats in instance_stats.values())
        load_balance_ratio = min_requests / max_requests if max_requests > 0 else 0
        
        # Success criteria
        success = (error_rate < 10 and avg_rt < 1.0 and load_balance_ratio > 0.7)
        
        self.add_result(
            "Horizontal Scalability",
            concurrent_requests,
            rps,
            avg_rt,
            p95_rt,
            p99_rt,
            error_rate,
            system_metrics["cpu"],
            system_metrics["memory"],
            success,
            f"Horizontal scaling test with {len(instances)} instances"
        )
        
        return ScalabilityTestResult(
            "Horizontal Scalability", concurrent_requests, rps, avg_rt, p95_rt, p99_rt,
            error_rate, system_metrics["cpu"], system_metrics["memory"], success,
            f"Load balance ratio: {load_balance_ratio:.2f}"
        )
    
    async def run_enterprise_scalability_tests(self) -> Dict[str, Any]:
        """Run all enterprise scalability tests."""
        print("🚀 STARTING ENTERPRISE SCALABILITY TESTING")
        print("=" * 60)
        
        # Run all scalability tests
        tests = [
            self.test_massive_concurrent_load(concurrent_users=5000),
            self.test_database_scalability(concurrent_operations=1000),
            self.test_websocket_scalability(concurrent_connections=1000),
            self.test_cache_scalability(concurrent_requests=10000),
            self.test_horizontal_scalability(),
        ]
        
        results = await asyncio.gather(*tests, return_exceptions=True)
        
        # Calculate overall metrics
        total_tests = len(self.results)
        successful_tests = len([r for r in self.results if r.success])
        failed_tests = total_tests - successful_tests
        
        # Calculate performance metrics
        avg_rps = statistics.mean([r.requests_per_second for r in self.results]) if self.results else 0
        max_rps = max([r.requests_per_second for r in self.results]) if self.results else 0
        avg_response_time = statistics.mean([r.avg_response_time for r in self.results]) if self.results else 0
        avg_cpu_usage = statistics.mean([r.cpu_usage for r in self.results]) if self.results else 0
        avg_memory_usage = statistics.mean([r.memory_usage for r in self.results]) if self.results else 0
        
        # Calculate scalability score
        scalability_score = 0
        if successful_tests == total_tests:
            scalability_score += 40
        if avg_rps > 1000:
            scalability_score += 20
        if avg_response_time < 0.5:
            scalability_score += 20
        if avg_cpu_usage < 70:
            scalability_score += 10
        if avg_memory_usage < 70:
            scalability_score += 10
        
        print("\n" + "=" * 60)
        print("📈 ENTERPRISE SCALABILITY RESULTS")
        print("=" * 60)
        
        print(f"📊 SCALABILITY ASSESSMENT:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Successful Tests: {successful_tests}")
        print(f"   Failed Tests: {failed_tests}")
        print(f"   Success Rate: {successful_tests/total_tests*100:.1f}%")
        print(f"   Scalability Score: {scalability_score}/100")
        
        print(f"\n🚀 PERFORMANCE METRICS:")
        print(f"   Avg Requests/Second: {avg_rps:.2f}")
        print(f"   Max Requests/Second: {max_rps:.2f}")
        print(f"   Avg Response Time: {avg_response_time*1000:.2f}ms")
        print(f"   Avg CPU Usage: {avg_cpu_usage:.1f}%")
        print(f"   Avg Memory Usage: {avg_memory_usage:.1f}%")
        
        # Detailed results
        for result in self.results:
            status = "🟢 SUCCESS" if result.success else "🔴 FAILED"
            print(f"\n{status} - {result.test_name}")
            print(f"   Concurrent Users/Operations: {result.concurrent_users:,}")
            print(f"   Requests/Second: {result.requests_per_second:.2f}")
            print(f"   Avg Response Time: {result.avg_response_time*1000:.2f}ms")
            print(f"   P95 Response Time: {result.p95_response_time*1000:.2f}ms")
            print(f"   P99 Response Time: {result.p99_response_time*1000:.2f}ms")
            print(f"   Error Rate: {result.error_rate:.2f}%")
            print(f"   CPU Usage: {result.cpu_usage:.1f}%")
            print(f"   Memory Usage: {result.memory_usage:.1f}%")
            print(f"   Description: {result.description}")
        
        # Overall scalability rating
        if scalability_score >= 90:
            rating = "🟢 EXCELLENT - Enterprise Grade Scalability"
        elif scalability_score >= 70:
            rating = "🟡 GOOD - Scalable with Minor Optimizations"
        elif scalability_score >= 50:
            rating = "🟠 FAIR - Scalability Improvements Needed"
        else:
            rating = "🔴 POOR - Major Scalability Issues"
        
        print(f"\n🏆 OVERALL SCALABILITY RATING: {rating}")
        
        return {
            "scalability_score": scalability_score,
            "total_tests": total_tests,
            "successful_tests": successful_tests,
            "failed_tests": failed_tests,
            "avg_rps": avg_rps,
            "max_rps": max_rps,
            "avg_response_time": avg_response_time,
            "avg_cpu_usage": avg_cpu_usage,
            "avg_memory_usage": avg_memory_usage,
            "rating": rating,
            "detailed_results": self.results
        }

class SystemMonitor:
    """System resource monitoring."""
    
    def __init__(self):
        self.monitoring = False
        self.metrics_history = []
    
    async def start(self):
        """Start system monitoring."""
        self.monitoring = True
        asyncio.create_task(self._monitor_loop())
    
    async def stop(self):
        """Stop system monitoring."""
        self.monitoring = False
    
    async def _monitor_loop(self):
        """Monitor system resources."""
        while self.monitoring:
            try:
                cpu_percent = psutil.cpu_percent(interval=0.1)
                memory_percent = psutil.virtual_memory().percent
                
                self.metrics_history.append({
                    "timestamp": time.time(),
                    "cpu": cpu_percent,
                    "memory": memory_percent
                })
                
                # Keep only last 100 measurements
                if len(self.metrics_history) > 100:
                    self.metrics_history.pop(0)
                
                await asyncio.sleep(1)
            except Exception:
                await asyncio.sleep(1)
    
    async def get_metrics(self) -> Dict[str, float]:
        """Get current system metrics."""
        if not self.metrics_history:
            return {"cpu": 0, "memory": 0}
        
        latest = self.metrics_history[-1]
        return {"cpu": latest["cpu"], "memory": latest["memory"]}

async def run_enterprise_scalability_tests():
    """Run the complete enterprise scalability test suite."""
    async with EnterpriseScalabilityTester() as tester:
        return await tester.run_enterprise_scalability_tests()

if __name__ == "__main__":
    asyncio.run(run_enterprise_scalability_tests())
