# Performance Benchmarking Suite
"""
Comprehensive performance testing and benchmarking for the Learning Hub platform
"""

import asyncio
import time
import json
import logging
import statistics
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import queue
import psutil
import django
from django.test import Client
from django.db import connection
from django.core.cache import cache

# Setup Django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PerformanceBenchmarkSuite:
    """Comprehensive performance testing suite."""
    
    def __init__(self):
        self.results = {}
        self.client = Client()
        self.metrics = {
            'api_response_times': [],
            'database_query_times': [],
            'cache_operation_times': [],
            'ml_service_times': [],
            'memory_usage': [],
            'cpu_usage': []
        }
    
    def run_comprehensive_benchmarks(self) -> Dict[str, Any]:
        """Run all performance benchmarks."""
        logger.info("Starting comprehensive performance benchmarks...")
        
        benchmarks = [
            ('API Performance', self.benchmark_api_performance),
            ('Database Performance', self.benchmark_database_performance),
            ('Cache Performance', self.benchmark_cache_performance),
            ('ML Services Performance', self.benchmark_ml_services),
            ('Concurrent Load Testing', self.benchmark_concurrent_load),
            ('Memory Usage Analysis', self.benchmark_memory_usage),
            ('CPU Usage Analysis', self.benchmark_cpu_usage),
            ('WebSocket Performance', self.benchmark_websocket_performance),
            ('File Upload Performance', self.benchmark_file_upload),
            ('Search Performance', self.benchmark_search_performance)
        ]
        
        for benchmark_name, benchmark_func in benchmarks:
            logger.info(f"Running {benchmark_name}...")
            try:
                result = benchmark_func()
                self.results[benchmark_name] = result
                logger.info(f"{benchmark_name} completed")
            except Exception as e:
                logger.error(f"{benchmark_name} failed: {e}")
                self.results[benchmark_name] = {'error': str(e)}
        
        return self.generate_performance_report()
    
    def benchmark_api_performance(self) -> Dict[str, Any]:
        """Benchmark API endpoint performance."""
        endpoints = [
            ('/api/v1/courses/', 'Course List'),
            ('/api/v1/courses/1/', 'Course Detail'),
            ('/api/ai_engine/recommendations/', 'AI Recommendations'),
            ('/api/users/profile/', 'User Profile'),
            ('/health/', 'Health Check'),
            ('/api/v1/categories/', 'Categories'),
            ('/api/ai_engine/learning-stats/', 'Learning Stats')
        ]
        
        endpoint_results = {}
        
        for endpoint, name in endpoints:
            times = []
            success_count = 0
            error_count = 0
            
            # Run 20 requests per endpoint
            for i in range(20):
                try:
                    start_time = time.time()
                    response = self.client.get(endpoint)
                    end_time = time.time()
                    
                    response_time = (end_time - start_time) * 1000
                    times.append(response_time)
                    
                    if response.status_code < 400:
                        success_count += 1
                    else:
                        error_count += 1
                        
                except Exception as e:
                    error_count += 1
                    logger.error(f"API endpoint {endpoint} error: {e}")
            
            if times:
                endpoint_results[name] = {
                    'endpoint': endpoint,
                    'avg_response_time_ms': statistics.mean(times),
                    'min_response_time_ms': min(times),
                    'max_response_time_ms': max(times),
                    'p95_response_time_ms': self._percentile(times, 95),
                    'p99_response_time_ms': self._percentile(times, 99),
                    'success_rate': success_count / 20,
                    'error_rate': error_count / 20,
                    'total_requests': 20
                }
                
                self.metrics['api_response_times'].extend(times)
        
        return {
            'endpoints': endpoint_results,
            'overall_avg_response_time': statistics.mean(self.metrics['api_response_times']) if self.metrics['api_response_times'] else 0,
            'overall_p95_response_time': self._percentile(self.metrics['api_response_times'], 95) if self.metrics['api_response_times'] else 0
        }
    
    def benchmark_database_performance(self) -> Dict[str, Any]:
        """Benchmark database query performance."""
        try:
            from apps.courses.models import Course, Category, Enrollment
            from apps.users.models import User
            
            query_results = {}
            
            # Test simple query
            times = []
            for i in range(20):
                start_time = time.time()
                courses = list(Course.objects.filter(is_published=True)[:50])
                end_time = time.time()
                times.append((end_time - start_time) * 1000)
            
            query_results['simple_query'] = {
                'avg_time_ms': statistics.mean(times),
                'min_time_ms': min(times),
                'max_time_ms': max(times),
                'p95_time_ms': self._percentile(times, 95),
                'records_returned': len(courses)
            }
            
            # Test complex query with joins
            times = []
            for i in range(20):
                start_time = time.time()
                courses = list(Course.objects.filter(
                    is_published=True
                ).select_related('category').prefetch_related('enrollments')[:20])
                end_time = time.time()
                times.append((end_time - start_time) * 1000)
            
            query_results['complex_query'] = {
                'avg_time_ms': statistics.mean(times),
                'min_time_ms': min(times),
                'max_time_ms': max(times),
                'p95_time_ms': self._percentile(times, 95),
                'records_returned': len(courses)
            }
            
            # Test aggregation query
            times = []
            for i in range(20):
                start_time = time.time()
                stats = Course.objects.filter(
                    is_published=True
                ).aggregate(
                    total=Count('id'),
                    avg_price=Avg('price'),
                    max_enrollments=Max('enrollments__count')
                )
                end_time = time.time()
                times.append((end_time - start_time) * 1000)
            
            query_results['aggregation_query'] = {
                'avg_time_ms': statistics.mean(times),
                'min_time_ms': min(times),
                'max_time_ms': max(times),
                'p95_time_ms': self._percentile(times, 95),
                'stats': stats
            }
            
            # Test write performance
            times = []
            test_category = Category.objects.create(
                name="Performance Test",
                slug="perf-test",
                description="Performance test category",
                is_active=True
            )
            
            for i in range(10):
                start_time = time.time()
                course = Course.objects.create(
                    title=f"Test Course {i}",
                    slug=f"test-course-{i}",
                    description="Test course for performance",
                    category=test_category,
                    is_published=True
                )
                end_time = time.time()
                times.append((end_time - start_time) * 1000)
            
            # Cleanup
            Course.objects.filter(category=test_category).delete()
            test_category.delete()
            
            query_results['write_query'] = {
                'avg_time_ms': statistics.mean(times),
                'min_time_ms': min(times),
                'max_time_ms': max(times),
                'p95_time_ms': self._percentile(times, 95),
                'records_inserted': 10
            }
            
            self.metrics['database_query_times'].extend(times)
            
            return query_results
            
        except Exception as e:
            return {'error': str(e)}
    
    def benchmark_cache_performance(self) -> Dict[str, Any]:
        """Benchmark cache performance."""
        cache_results = {}
        
        # Test cache set performance
        times = []
        test_data = {'test': 'performance', 'timestamp': time.time()}
        
        for i in range(100):
            start_time = time.time()
            cache.set(f'perf_test_{i}', test_data, 300)
            end_time = time.time()
            times.append((end_time - start_time) * 1000)
        
        cache_results['cache_set'] = {
            'avg_time_ms': statistics.mean(times),
            'min_time_ms': min(times),
            'max_time_ms': max(times),
            'p95_time_ms': self._percentile(times, 95),
            'operations': 100
        }
        
        # Test cache get performance
        times = []
        for i in range(100):
            start_time = time.time()
            result = cache.get(f'perf_test_{i}')
            end_time = time.time()
            times.append((end_time - start_time) * 1000)
        
        cache_results['cache_get'] = {
            'avg_time_ms': statistics.mean(times),
            'min_time_ms': min(times),
            'max_time_ms': max(times),
            'p95_time_ms': self._percentile(times, 95),
            'operations': 100,
            'hit_rate': sum(1 for result in [cache.get(f'perf_test_{i}') for i in range(100)] if result is not None) / 100
        }
        
        # Test cache delete performance
        times = []
        for i in range(50):
            start_time = time.time()
            cache.delete(f'perf_test_{i}')
            end_time = time.time()
            times.append((end_time - start_time) * 1000)
        
        cache_results['cache_delete'] = {
            'avg_time_ms': statistics.mean(times),
            'min_time_ms': min(times),
            'max_time_ms': max(times),
            'p95_time_ms': self._percentile(times, 95),
            'operations': 50
        }
        
        # Test bulk operations
        bulk_data = {f'bulk_{i}': f'value_{i}' for i in range(50)}
        
        start_time = time.time()
        for key, value in bulk_data.items():
            cache.set(key, value, 300)
        bulk_set_time = (time.time() - start_time) * 1000
        
        start_time = time.time()
        for key in bulk_data.keys():
            cache.get(key)
        bulk_get_time = (time.time() - start_time) * 1000
        
        cache_results['bulk_operations'] = {
            'bulk_set_time_ms': bulk_set_time,
            'bulk_get_time_ms': bulk_get_time,
            'avg_set_per_item': bulk_set_time / 50,
            'avg_get_per_item': bulk_get_time / 50,
            'items': 50
        }
        
        return cache_results
    
    def benchmark_ml_services(self) -> Dict[str, Any]:
        """Benchmark ML services performance."""
        try:
            from apps.ai_engine.enhanced_services import EnhancedRAGService
            from apps.ai_engine.ml_integration import RealTimeMLIntegration
            from apps.ai_engine.adaptive_learning_engine_v2 import AdaptiveLearningEngine
            
            ml_results = {}
            
            # Test RAG service
            rag_service = EnhancedRAGService()
            queries = [
                "Python programming basics",
                "Machine learning algorithms",
                "Web development with Django",
                "Data science fundamentals",
                "Software engineering principles"
            ]
            
            rag_times = []
            for query in queries:
                start_time = time.time()
                context = rag_service.get_context_for_query(query, limit=5)
                end_time = time.time()
                rag_times.append((end_time - start_time) * 1000)
            
            ml_results['rag_service'] = {
                'avg_time_ms': statistics.mean(rag_times),
                'min_time_ms': min(rag_times),
                'max_time_ms': max(rag_times),
                'p95_time_ms': self._percentile(rag_times, 95),
                'queries_processed': len(queries),
                'avg_context_length': statistics.mean([len(ctx) for ctx in [rag_service.get_context_for_query(q, limit=3) for q in queries[:3]]])
            }
            
            # Test ML integration
            ml_integration = RealTimeMLIntegration()
            
            ml_times = []
            for user_id in range(1, 6):
                start_time = time.time()
                recommendations = ml_integration.get_real_time_recommendations(user_id, 'courses', 5)
                end_time = time.time()
                ml_times.append((end_time - start_time) * 1000)
            
            ml_results['ml_integration'] = {
                'avg_time_ms': statistics.mean(ml_times),
                'min_time_ms': min(ml_times),
                'max_time_ms': max(ml_times),
                'p95_time_ms': self._percentile(ml_times, 95),
                'users_processed': len(ml_times),
                'avg_recommendations': statistics.mean([len(ml_integration.get_real_time_recommendations(uid, 'courses', 3)) for uid in range(1, 4)])
            }
            
            # Test adaptive learning engine
            adaptive_engine = AdaptiveLearningEngine()
            
            adaptive_times = []
            for user_id in range(1, 4):
                start_time = time.time()
                path = adaptive_engine.generate_adaptive_path(user_id, 1)
                end_time = time.time()
                adaptive_times.append((end_time - start_time) * 1000)
            
            ml_results['adaptive_learning'] = {
                'avg_time_ms': statistics.mean(adaptive_times),
                'min_time_ms': min(adaptive_times),
                'max_time_ms': max(adaptive_times),
                'p95_time_ms': self._percentile(adaptive_times, 95),
                'paths_generated': len(adaptive_times)
            }
            
            return ml_results
            
        except Exception as e:
            return {'error': str(e)}
    
    def benchmark_concurrent_load(self) -> Dict[str, Any]:
        """Benchmark concurrent load performance."""
        load_results = {}
        
        # Test API concurrent load
        def api_request():
            start_time = time.time()
            try:
                response = self.client.get('/api/v1/courses/')
                end_time = time.time()
                return {
                    'success': response.status_code < 400,
                    'response_time_ms': (end_time - start_time) * 1000,
                    'status_code': response.status_code
                }
            except Exception as e:
                return {
                    'success': False,
                    'error': str(e),
                    'response_time_ms': 0
                }
        
        # Test with different concurrency levels
        concurrency_levels = [1, 5, 10, 20, 50]
        
        for concurrency in concurrency_levels:
            with ThreadPoolExecutor(max_workers=concurrency) as executor:
                start_time = time.time()
                
                # Submit tasks
                futures = [executor.submit(api_request) for _ in range(concurrency * 2)]
                
                # Collect results
                results = [future.result() for future in as_completed(futures)]
                
                end_time = time.time()
                total_time = end_time - start_time
                
                successful_requests = [r for r in results if r['success']]
                response_times = [r['response_time_ms'] for r in successful_requests]
                
                load_results[f'concurrency_{concurrency}'] = {
                    'total_requests': len(results),
                    'successful_requests': len(successful_requests),
                    'success_rate': len(successful_requests) / len(results),
                    'total_time_s': total_time,
                    'requests_per_second': len(results) / total_time,
                    'avg_response_time_ms': statistics.mean(response_times) if response_times else 0,
                    'p95_response_time_ms': self._percentile(response_times, 95) if response_times else 0
                }
        
        return load_results
    
    def benchmark_memory_usage(self) -> Dict[str, Any]:
        """Benchmark memory usage."""
        memory_results = {}
        
        # Get initial memory usage
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Test memory usage during API operations
        memory_samples = []
        
        for i in range(50):
            # Perform API operation
            response = self.client.get('/api/v1/courses/')
            
            # Sample memory
            memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_samples.append(memory)
        
        memory_results['api_operations'] = {
            'initial_memory_mb': initial_memory,
            'final_memory_mb': memory_samples[-1],
            'peak_memory_mb': max(memory_samples),
            'avg_memory_mb': statistics.mean(memory_samples),
            'memory_increase_mb': memory_samples[-1] - initial_memory,
            'samples': len(memory_samples)
        }
        
        # Test memory usage during ML operations
        try:
            from apps.ai_engine.enhanced_services import EnhancedRAGService
            rag_service = EnhancedRAGService()
            
            ml_memory_samples = []
            
            for i in range(20):
                # Perform ML operation
                context = rag_service.get_context_for_query(f"test query {i}", limit=3)
                
                # Sample memory
                memory = process.memory_info().rss / 1024 / 1024  # MB
                ml_memory_samples.append(memory)
            
            memory_results['ml_operations'] = {
                'initial_memory_mb': ml_memory_samples[0] if ml_memory_samples else 0,
                'final_memory_mb': ml_memory_samples[-1] if ml_memory_samples else 0,
                'peak_memory_mb': max(ml_memory_samples) if ml_memory_samples else 0,
                'avg_memory_mb': statistics.mean(ml_memory_samples) if ml_memory_samples else 0,
                'memory_increase_mb': (ml_memory_samples[-1] - ml_memory_samples[0]) if len(ml_memory_samples) > 1 else 0,
                'samples': len(ml_memory_samples)
            }
            
        except Exception as e:
            memory_results['ml_operations'] = {'error': str(e)}
        
        return memory_results
    
    def benchmark_cpu_usage(self) -> Dict[str, Any]:
        """Benchmark CPU usage."""
        cpu_results = {}
        
        # Get initial CPU usage
        initial_cpu = psutil.cpu_percent(interval=1)
        
        # Test CPU usage during API operations
        cpu_samples = []
        
        for i in range(30):
            # Perform CPU-intensive operation
            response = self.client.get('/api/v1/courses/')
            
            # Sample CPU
            cpu = psutil.cpu_percent(interval=0.1)
            cpu_samples.append(cpu)
        
        cpu_results['api_operations'] = {
            'initial_cpu_percent': initial_cpu,
            'avg_cpu_percent': statistics.mean(cpu_samples),
            'peak_cpu_percent': max(cpu_samples),
            'min_cpu_percent': min(cpu_samples),
            'samples': len(cpu_samples)
        }
        
        # Test CPU usage during ML operations
        try:
            from apps.ai_engine.enhanced_services import EnhancedRAGService
            rag_service = EnhancedRAGService()
            
            ml_cpu_samples = []
            
            for i in range(15):
                # Perform ML operation
                context = rag_service.get_context_for_query(f"cpu test query {i}", limit=5)
                
                # Sample CPU
                cpu = psutil.cpu_percent(interval=0.1)
                ml_cpu_samples.append(cpu)
            
            cpu_results['ml_operations'] = {
                'avg_cpu_percent': statistics.mean(ml_cpu_samples),
                'peak_cpu_percent': max(ml_cpu_samples),
                'min_cpu_percent': min(ml_cpu_samples),
                'samples': len(ml_cpu_samples)
            }
            
        except Exception as e:
            cpu_results['ml_operations'] = {'error': str(e)}
        
        return cpu_results
    
    def benchmark_websocket_performance(self) -> Dict[str, Any]:
        """Benchmark WebSocket performance."""
        try:
            from channels.testing import WebsocketCommunicator
            from channels.routing import URLRouter
            from apps.core.routing import websocket_urlpatterns
            
            ws_results = {}
            
            # Test WebSocket connection time
            connection_times = []
            
            for i in range(10):
                application = URLRouter(websocket_urlpatterns)
                communicator = WebsocketCommunicator(
                    application,
                    f"/ws/notifications/"
                )
                
                start_time = time.time()
                connected, subprotocol = communicator.connect()
                end_time = time.time()
                
                if connected:
                    connection_times.append((end_time - start_time) * 1000)
                    communicator.disconnect()
                else:
                    connection_times.append(1000)  # Timeout
            
            ws_results['connection_performance'] = {
                'avg_connection_time_ms': statistics.mean(connection_times),
                'min_connection_time_ms': min(connection_times),
                'max_connection_time_ms': max(connection_times),
                'success_rate': sum(1 for t in connection_times if t < 1000) / len(connection_times),
                'attempts': len(connection_times)
            }
            
            # Test message round-trip time
            if connection_times and min(connection_times) < 1000:
                application = URLRouter(websocket_urlpatterns)
                communicator = WebsocketCommunicator(
                    application,
                    f"/ws/notifications/"
                )
                
                connected, subprotocol = communicator.connect()
                
                if connected:
                    round_trip_times = []
                    
                    for i in range(5):
                        start_time = time.time()
                        communicator.send_json_to_json({
                            'type': 'test_message',
                            'data': {'test': i}
                        })
                        
                        try:
                            response = communicator.receive_json_from_json(timeout=1)
                            end_time = time.time()
                            round_trip_times.append((end_time - start_time) * 1000)
                        except:
                            round_trip_times.append(1000)  # Timeout
                    
                    communicator.disconnect()
                    
                    ws_results['message_performance'] = {
                        'avg_round_trip_ms': statistics.mean(round_trip_times),
                        'min_round_trip_ms': min(round_trip_times),
                        'max_round_trip_ms': max(round_trip_times),
                        'messages_sent': len(round_trip_times)
                    }
            
            return ws_results
            
        except Exception as e:
            return {'error': str(e)}
    
    def benchmark_file_upload(self) -> Dict[str, Any]:
        """Benchmark file upload performance."""
        upload_results = {}
        
        # Test different file sizes
        file_sizes = [
            (1024, '1KB'),
            (10240, '10KB'),
            (102400, '100KB'),
            (1024000, '1MB')
        ]
        
        for size, size_name in file_sizes:
            # Create test file content
            test_content = 'x' * size
            
            upload_times = []
            
            for i in range(5):
                start_time = time.time()
                
                # Simulate file upload
                response = self.client.post(
                    '/api/uploads/',
                    data={'file': test_content},
                    format='multipart'
                )
                
                end_time = time.time()
                upload_times.append((end_time - start_time) * 1000)
            
            upload_results[size_name] = {
                'avg_upload_time_ms': statistics.mean(upload_times),
                'min_upload_time_ms': min(upload_times),
                'max_upload_time_ms': max(upload_times),
                'p95_upload_time_ms': self._percentile(upload_times, 95),
                'file_size_bytes': size,
                'upload_rate_mb_per_s': (size / 1024 / 1024) / (statistics.mean(upload_times) / 1000) if statistics.mean(upload_times) > 0 else 0
            }
        
        return upload_results
    
    def benchmark_search_performance(self) -> Dict[str, Any]:
        """Benchmark search performance."""
        try:
            from apps.courses.models import Course
            
            search_results = {}
            
            # Test different search complexities
            search_queries = [
                ('python', 'Simple term'),
                ('python programming', 'Two terms'),
                ('python programming advanced', 'Three terms'),
                ('python programming advanced tutorial', 'Four terms'),
                ('python programming advanced tutorial comprehensive', 'Five terms')
            ]
            
            for query, complexity in search_queries:
                search_times = []
                
                for i in range(10):
                    start_time = time.time()
                    
                    # Perform search
                    courses = Course.objects.filter(
                        title__icontains=query,
                        is_published=True
                    )[:20]
                    
                    end_time = time.time()
                    search_times.append((end_time - start_time) * 1000)
                
                search_results[complexity] = {
                    'avg_search_time_ms': statistics.mean(search_times),
                    'min_search_time_ms': min(search_times),
                    'max_search_time_ms': max(search_times),
                    'p95_search_time_ms': self._percentile(search_times, 95),
                    'query': query,
                    'avg_results': statistics.mean([len(list(Course.objects.filter(title__icontains=q, is_published=True)[:20])) for q, _ in [search_queries[0]]])
                }
            
            return search_results
            
        except Exception as e:
            return {'error': str(e)}
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data."""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * (percentile / 100))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        report = {
            'timestamp': time.time(),
            'summary': {
                'total_benchmarks': len(self.results),
                'successful_benchmarks': len([r for r in self.results.values() if 'error' not in r]),
                'failed_benchmarks': len([r for r in self.results.values() if 'error' in r])
            },
            'performance_targets': {
                'api_response_time_target_ms': 100,
                'database_query_time_target_ms': 50,
                'cache_operation_time_target_ms': 10,
                'ml_service_time_target_ms': 200,
                'memory_usage_target_mb': 1024,
                'cpu_usage_target_percent': 70
            },
            'benchmarks': self.results,
            'overall_metrics': self._calculate_overall_metrics(),
            'recommendations': self._generate_performance_recommendations()
        }
        
        # Save report to file
        report_file = f"performance_benchmark_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Performance benchmark report saved to {report_file}")
        
        return report
    
    def _calculate_overall_metrics(self) -> Dict[str, Any]:
        """Calculate overall performance metrics."""
        overall = {}
        
        # API performance
        if 'API Performance' in self.results and 'endpoints' in self.results['API Performance']:
            endpoints = self.results['API Performance']['endpoints']
            if endpoints:
                overall['api'] = {
                    'avg_response_time_ms': statistics.mean([ep['avg_response_time_ms'] for ep in endpoints.values()]),
                    'p95_response_time_ms': statistics.mean([ep['p95_response_time_ms'] for ep in endpoints.values()]),
                    'overall_success_rate': statistics.mean([ep['success_rate'] for ep in endpoints.values()])
                }
        
        # Database performance
        if 'Database Performance' in self.results:
            db_results = self.results['Database Performance']
            if 'simple_query' in db_results:
                overall['database'] = {
                    'avg_query_time_ms': db_results['simple_query']['avg_time_ms'],
                    'complex_query_time_ms': db_results.get('complex_query', {}).get('avg_time_ms', 0),
                    'write_query_time_ms': db_results.get('write_query', {}).get('avg_time_ms', 0)
                }
        
        # Cache performance
        if 'Cache Performance' in self.results:
            cache_results = self.results['Cache Performance']
            if 'cache_get' in cache_results:
                overall['cache'] = {
                    'avg_get_time_ms': cache_results['cache_get']['avg_time_ms'],
                    'avg_set_time_ms': cache_results['cache_set']['avg_time_ms'],
                    'hit_rate': cache_results['cache_get']['hit_rate']
                }
        
        # ML performance
        if 'ML Services Performance' in self.results:
            ml_results = self.results['ML Services Performance']
            overall['ml'] = {
                'rag_avg_time_ms': ml_results.get('rag_service', {}).get('avg_time_ms', 0),
                'ml_integration_avg_time_ms': ml_results.get('ml_integration', {}).get('avg_time_ms', 0),
                'adaptive_learning_avg_time_ms': ml_results.get('adaptive_learning', {}).get('avg_time_ms', 0)
            }
        
        return overall
    
    def _generate_performance_recommendations(self) -> List[str]:
        """Generate performance recommendations based on benchmark results."""
        recommendations = []
        
        # API recommendations
        if 'API Performance' in self.results and 'endpoints' in self.results['API Performance']:
            endpoints = self.results['API Performance']['endpoints']
            slow_endpoints = [name for name, ep in endpoints.items() if ep['p95_response_time_ms'] > 100]
            if slow_endpoints:
                recommendations.append(f"Optimize slow API endpoints: {', '.join(slow_endpoints)}")
        
        # Database recommendations
        if 'Database Performance' in self.results:
            db_results = self.results['Database Performance']
            if 'complex_query' in db_results and db_results['complex_query']['p95_time_ms'] > 50:
                recommendations.append("Optimize complex database queries with better indexing")
        
        # Cache recommendations
        if 'Cache Performance' in self.results:
            cache_results = self.results['Cache Performance']
            if 'cache_get' in cache_results and cache_results['cache_get']['hit_rate'] < 0.8:
                recommendations.append("Improve cache hit rate with better caching strategies")
        
        # ML recommendations
        if 'ML Services Performance' in self.results:
            ml_results = self.results['ML Services Performance']
            if 'rag_service' in ml_results and ml_results['rag_service']['p95_time_ms'] > 200:
                recommendations.append("Optimize RAG service performance with better caching")
        
        # Memory recommendations
        if 'Memory Usage Analysis' in self.results:
            memory_results = self.results['Memory Usage Analysis']
            if 'api_operations' in memory_results and memory_results['api_operations']['memory_increase_mb'] > 100:
                recommendations.append("Investigate memory leaks in API operations")
        
        # CPU recommendations
        if 'CPU Usage Analysis' in self.results:
            cpu_results = self.results['CPU Usage Analysis']
            if 'api_operations' in cpu_results and cpu_results['api_operations']['peak_cpu_percent'] > 80:
                recommendations.append("Optimize CPU-intensive operations")
        
        return recommendations

def main():
    """Main benchmarking function."""
    benchmark_suite = PerformanceBenchmarkSuite()
    
    print("🚀 Starting Comprehensive Performance Benchmarks...")
    print("=" * 60)
    
    # Run benchmarks
    results = benchmark_suite.run_comprehensive_benchmarks()
    
    # Display results
    print("\n📊 Performance Benchmark Results:")
    print("=" * 60)
    
    for benchmark_name, result in results['benchmarks'].items():
        print(f"\n{benchmark_name}:")
        if 'error' in result:
            print(f"  ❌ Error: {result['error']}")
        else:
            print(f"  ✅ Success")
            # Display key metrics
            if 'endpoints' in result:
                print(f"  📈 API Endpoints: {len(result['endpoints'])}")
            if 'overall_avg_response_time' in result:
                print(f"  ⏱️  Avg Response Time: {result['overall_avg_response_time']:.2f}ms")
    
    print(f"\n📈 Overall Metrics:")
    print("=" * 60)
    overall = results.get('overall_metrics', {})
    for category, metrics in overall.items():
        print(f"\n{category.title()}:")
        for metric, value in metrics.items():
            print(f"  {metric}: {value:.2f}")
    
    print(f"\n🎯 Performance Recommendations:")
    print("=" * 60)
    recommendations = results.get('recommendations', [])
    if recommendations:
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec}")
    else:
        print("✅ No performance issues detected!")
    
    print(f"\n📋 Summary:")
    print("=" * 60)
    summary = results.get('summary', {})
    print(f"Total Benchmarks: {summary.get('total_benchmarks', 0)}")
    print(f"Successful: {summary.get('successful_benchmarks', 0)}")
    print(f"Failed: {summary.get('failed_benchmarks', 0)}")
    
    return results

if __name__ == '__main__':
    main()
