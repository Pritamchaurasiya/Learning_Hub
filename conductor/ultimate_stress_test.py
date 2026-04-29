# ULTIMATE SYSTEM STRESS TESTING
"""
Next-level stress testing for Learning Hub platform.
Tests system limits under extreme load conditions.
"""

import asyncio
import aiohttp
import time
import statistics
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import List, Dict, Any
import json
import random

@dataclass
class StressTestMetrics:
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    max_response_time: float
    min_response_time: float
    requests_per_second: float
    error_rate: float

class UltimateStressTester:
    """Ultimate stress testing suite for production systems."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        self.metrics = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def extreme_concurrent_load(self, concurrent_users: int = 1000, 
                                    duration_seconds: int = 60) -> StressTestMetrics:
        """Test system under extreme concurrent load."""
        print(f"🔥 EXTREME LOAD TEST: {concurrent_users} concurrent users for {duration_seconds}s")
        
        endpoints = [
            "/api/v1/courses/",
            "/api/v1/courses/recommendations/",
            "/api/v1/gamification/leaderboard/",
            "/api/v1/dashboard/student_stats/",
            "/api/v1/ai/recommendations/",
        ]
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        response_times = []
        success_count = 0
        error_count = 0
        total_requests = 0
        
        async def make_request():
            nonlocal success_count, error_count, total_requests
            endpoint = random.choice(endpoints)
            request_start = time.time()
            
            try:
                async with self.session.get(f"{self.base_url}{endpoint}") as response:
                    await response.text()
                    request_time = time.time() - request_start
                    response_times.append(request_time)
                    
                    if response.status == 200:
                        success_count += 1
                    else:
                        error_count += 1
                    total_requests += 1
            except Exception:
                error_count += 1
                total_requests += 1
        
        # Create extreme concurrent load
        tasks = []
        while time.time() < end_time:
            # Launch batches of concurrent requests
            batch_tasks = [make_request() for _ in range(min(100, concurrent_users))]
            tasks.extend(batch_tasks)
            
            # Process batch
            await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Brief pause to prevent overwhelming the system
            await asyncio.sleep(0.01)
        
        # Calculate metrics
        total_time = time.time() - start_time
        avg_response_time = statistics.mean(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        rps = total_requests / total_time if total_time > 0 else 0
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        
        metrics = StressTestMetrics(
            total_requests=total_requests,
            successful_requests=success_count,
            failed_requests=error_count,
            avg_response_time=avg_response_time,
            max_response_time=max_response_time,
            min_response_time=min_response_time,
            requests_per_second=rps,
            error_rate=error_rate
        )
        
        print(f"✅ Load Test Complete: {rps:.2f} RPS, {error_rate:.2f}% error rate")
        return metrics
    
    async def websocket_stress_test(self, concurrent_connections: int = 500) -> Dict[str, Any]:
        """Test WebSocket under extreme connection load."""
        print(f"🔌 WEBSOCKET STRESS TEST: {concurrent_connections} concurrent connections")
        
        import websockets
        
        async def websocket_connection():
            try:
                uri = f"ws://localhost:8000/ws/social/"
                async with websockets.connect(uri) as websocket:
                    # Send test messages
                    for _ in range(10):
                        await websocket.send(json.dumps({"type": "ping"}))
                        response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        await asyncio.sleep(0.1)
                    return True
            except Exception:
                return False
        
        # Launch concurrent WebSocket connections
        tasks = [websocket_connection() for _ in range(concurrent_connections)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_connections = sum(1 for result in results if result is True)
        success_rate = (successful_connections / concurrent_connections) * 100
        
        print(f"✅ WebSocket Test Complete: {success_rate:.1f}% success rate")
        return {
            "total_connections": concurrent_connections,
            "successful_connections": successful_connections,
            "success_rate": success_rate
        }
    
    async def database_stress_test(self, concurrent_operations: int = 100) -> Dict[str, Any]:
        """Test database under extreme write load."""
        print(f"💾 DATABASE STRESS TEST: {concurrent_operations} concurrent operations")
        
        async def database_operation():
            try:
                # Simulate database write operations
                data = {
                    "title": f"Test Course {random.randint(1, 10000)}",
                    "description": "Stress test course",
                    "price": random.uniform(10.0, 100.0),
                    "category": random.choice(["programming", "design", "business"])
                }
                
                async with self.session.post(
                    f"{self.base_url}/api/v1/courses/",
                    json=data
                ) as response:
                    return response.status == 201
            except Exception:
                return False
        
        # Launch concurrent database operations
        tasks = [database_operation() for _ in range(concurrent_operations)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_operations = sum(1 for result in results if result is True)
        success_rate = (successful_operations / concurrent_operations) * 100
        
        print(f"✅ Database Test Complete: {success_rate:.1f}% success rate")
        return {
            "total_operations": concurrent_operations,
            "successful_operations": successful_operations,
            "success_rate": success_rate
        }
    
    async def memory_leak_test(self, iterations: int = 1000) -> Dict[str, Any]:
        """Test for memory leaks under sustained load."""
        print(f"🧠 MEMORY LEAK TEST: {iterations} iterations")
        
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        memory_samples = [initial_memory]
        
        for i in range(iterations):
            # Perform memory-intensive operations
            await self.extreme_concurrent_load(concurrent_users=50, duration_seconds=1)
            
            # Sample memory usage
            current_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_samples.append(current_memory)
            
            if i % 100 == 0:
                print(f"  Iteration {i}: {current_memory:.2f} MB")
        
        final_memory = memory_samples[-1]
        memory_growth = final_memory - initial_memory
        max_memory = max(memory_samples)
        
        print(f"✅ Memory Test Complete: {memory_growth:.2f} MB growth")
        return {
            "initial_memory_mb": initial_memory,
            "final_memory_mb": final_memory,
            "memory_growth_mb": memory_growth,
            "max_memory_mb": max_memory,
            "samples": len(memory_samples)
        }

async def run_ultimate_stress_tests():
    """Run the complete ultimate stress test suite."""
    print("🚀 STARTING ULTIMATE SYSTEM STRESS TESTING")
    print("=" * 60)
    
    async with UltimateStressTester() as tester:
        results = {}
        
        # 1. Extreme Concurrent Load Test
        results["extreme_load"] = await tester.extreme_concurrent_load(
            concurrent_users=1000, 
            duration_seconds=30
        )
        
        # 2. WebSocket Stress Test
        results["websocket_stress"] = await tester.websocket_stress_test(
            concurrent_connections=200
        )
        
        # 3. Database Stress Test
        results["database_stress"] = await tester.database_stress_test(
            concurrent_operations=100
        )
        
        # 4. Memory Leak Test
        results["memory_leak"] = await tester.memory_leak_test(
            iterations=200
        )
    
    print("\n" + "=" * 60)
    print("🎯 ULTIMATE STRESS TEST RESULTS")
    print("=" * 60)
    
    # Load Test Results
    load_result = results["extreme_load"]
    print(f"📊 EXTREME LOAD TEST:")
    print(f"   Total Requests: {load_result.total_requests:,}")
    print(f"   Success Rate: {100 - load_result.error_rate:.2f}%")
    print(f"   Requests/Second: {load_result.requests_per_second:.2f}")
    print(f"   Avg Response Time: {load_result.avg_response_time*1000:.2f}ms")
    print(f"   Max Response Time: {load_result.max_response_time*1000:.2f}ms")
    
    # WebSocket Results
    ws_result = results["websocket_stress"]
    print(f"\n🔌 WEBSOCKET STRESS TEST:")
    print(f"   Concurrent Connections: {ws_result['total_connections']}")
    print(f"   Success Rate: {ws_result['success_rate']:.2f}%")
    
    # Database Results
    db_result = results["database_stress"]
    print(f"\n💾 DATABASE STRESS TEST:")
    print(f"   Concurrent Operations: {db_result['total_operations']}")
    print(f"   Success Rate: {db_result['success_rate']:.2f}%")
    
    # Memory Results
    mem_result = results["memory_leak"]
    print(f"\n🧠 MEMORY LEAK TEST:")
    print(f"   Initial Memory: {mem_result['initial_memory_mb']:.2f} MB")
    print(f"   Final Memory: {mem_result['final_memory_mb']:.2f} MB")
    print(f"   Memory Growth: {mem_result['memory_growth_mb']:.2f} MB")
    print(f"   Peak Memory: {mem_result['max_memory_mb']:.2f} MB")
    
    # Overall Assessment
    print(f"\n🏆 OVERALL STRESS TEST ASSESSMENT:")
    
    load_score = 100 if load_result.error_rate < 5 and load_result.requests_per_second > 100 else 50
    ws_score = 100 if ws_result['success_rate'] > 95 else 50
    db_score = 100 if db_result['success_rate'] > 95 else 50
    mem_score = 100 if mem_result['memory_growth_mb'] < 100 else 50
    
    overall_score = (load_score + ws_score + db_score + mem_score) / 4
    
    if overall_score >= 90:
        status = "🟢 EXCELLENT"
    elif overall_score >= 70:
        status = "🟡 GOOD"
    else:
        status = "🔴 NEEDS IMPROVEMENT"
    
    print(f"   Load Performance: {load_score}/100")
    print(f"   WebSocket Performance: {ws_score}/100")
    print(f"   Database Performance: {db_score}/100")
    print(f"   Memory Management: {mem_score}/100")
    print(f"   Overall Score: {overall_score:.1f}/100 - {status}")
    
    return results, overall_score

if __name__ == "__main__":
    asyncio.run(run_ultimate_stress_tests())
