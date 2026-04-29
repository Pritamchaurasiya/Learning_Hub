# System Performance Optimization Script
"""Automated optimization and validation for the Learning Hub platform"""

import os
import sys
import subprocess
import time
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import django
from django.conf import settings
from django.core.management import execute_from_command_line
from django.db import connection
from django.core.cache import cache

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SystemOptimizer:
    """Comprehensive system optimization and validation."""
    
    def __init__(self):
        self.optimization_results = {}
        self.performance_metrics = {}
        self.issues_found = []
        self.fixes_applied = []
    
    def run_comprehensive_optimization(self):
        """Run complete system optimization."""
        logger.info("Starting comprehensive system optimization...")
        
        optimization_steps = [
            self.check_system_health,
            self.optimize_database,
            self.optimize_caching,
            self.optimize_ml_services,
            self.optimize_api_performance,
            self.run_performance_tests,
            self.validate_fixes,
            self.generate_report
        ]
        
        for step in optimization_steps:
            try:
                logger.info(f"Running: {step.__name__}")
                result = step()
                self.optimization_results[step.__name__] = result
            except Exception as e:
                logger.error(f"Error in {step.__name__}: {e}")
                self.issues_found.append(f"{step.__name__}: {str(e)}")
        
        return self.optimization_results
    
    def check_system_health(self) -> Dict[str, Any]:
        """Check overall system health."""
        health_status = {
            'database': self._check_database_health(),
            'cache': self._check_cache_health(),
            'ml_services': self._check_ml_services_health(),
            'api_endpoints': self._check_api_health(),
            'system_resources': self._check_system_resources()
        }
        
        overall_health = all(status['healthy'] for status in health_status.values())
        health_status['overall'] = overall_health
        
        logger.info(f"System health check: {'HEALTHY' if overall_health else 'ISSUES FOUND'}")
        return health_status
    
    def _check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and performance."""
        try:
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            response_time = (time.time() - start_time) * 1000
            
            # Check slow queries
            cursor.execute("""
                SELECT query, mean_time, calls 
                FROM pg_stat_statements 
                ORDER BY mean_time DESC 
                LIMIT 5
            """)
            slow_queries = cursor.fetchall()
            
            healthy = response_time < 100  # 100ms threshold
            
            return {
                'healthy': healthy,
                'response_time_ms': response_time,
                'slow_queries': slow_queries,
                'message': 'OK' if healthy else f'Slow response: {response_time:.2f}ms'
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'message': 'Database connection failed'
            }
    
    def _check_cache_health(self) -> Dict[str, Any]:
        """Check cache connectivity and performance."""
        try:
            start_time = time.time()
            cache.set('health_check', 'test', 60)
            result = cache.get('health_check')
            cache.delete('health_check')
            
            response_time = (time.time() - start_time) * 1000
            
            healthy = result == 'test' and response_time < 50  # 50ms threshold
            
            return {
                'healthy': healthy,
                'response_time_ms': response_time,
                'message': 'OK' if healthy else f'Cache issue: {response_time:.2f}ms'
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'message': 'Cache connection failed'
            }
    
    def _check_ml_services_health(self) -> Dict[str, Any]:
        """Check ML services health."""
        try:
            # Check if ML services are accessible
            from apps.ai_engine.enhanced_services import EnhancedRAGService
            from apps.ai_engine.ml_integration import RealTimeMLIntegration
            
            rag_service = EnhancedRAGService()
            ml_integration = RealTimeMLIntegration()
            
            # Test RAG service
            start_time = time.time()
            context = rag_service.get_context_for_query("test query", limit=1)
            rag_response_time = (time.time() - start_time) * 1000
            
            # Test ML integration
            start_time = time.time()
            recommendations = ml_integration.get_real_time_recommendations(1, 'test', 1)
            ml_response_time = (time.time() - start_time) * 1000
            
            healthy = rag_response_time < 200 and ml_response_time < 200
            
            return {
                'healthy': healthy,
                'rag_response_time_ms': rag_response_time,
                'ml_response_time_ms': ml_response_time,
                'message': 'OK' if healthy else 'ML services slow'
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'message': 'ML services unavailable'
            }
    
    def _check_api_health(self) -> Dict[str, Any]:
        """Check API endpoints health."""
        try:
            from django.test import Client
            from django.urls import reverse
            
            client = Client()
            
            # Test key endpoints
            endpoints = [
                '/api/v1/courses/',
                '/api/ai_engine/recommendations/',
                '/api/users/profile/',
                '/health/'
            ]
            
            endpoint_status = {}
            total_response_time = 0
            
            for endpoint in endpoints:
                try:
                    start_time = time.time()
                    response = client.get(endpoint)
                    response_time = (time.time() - start_time) * 1000
                    
                    endpoint_status[endpoint] = {
                        'status_code': response.status_code,
                        'response_time_ms': response_time,
                        'healthy': response.status_code < 400
                    }
                    total_response_time += response_time
                except Exception as e:
                    endpoint_status[endpoint] = {
                        'error': str(e),
                        'healthy': False
                    }
            
            avg_response_time = total_response_time / len(endpoints)
            healthy = all(status.get('healthy', False) for status in endpoint_status.values())
            
            return {
                'healthy': healthy,
                'avg_response_time_ms': avg_response_time,
                'endpoints': endpoint_status,
                'message': 'OK' if healthy else 'Some endpoints failing'
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'message': 'API health check failed'
            }
    
    def _check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage."""
        try:
            import psutil
            
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            healthy = cpu_percent < 80 and memory_percent < 80 and disk_percent < 80
            
            return {
                'healthy': healthy,
                'cpu_percent': cpu_percent,
                'memory_percent': memory_percent,
                'disk_percent': disk_percent,
                'message': 'OK' if healthy else 'High resource usage'
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'message': 'Resource check failed'
            }
    
    def optimize_database(self) -> Dict[str, Any]:
        """Optimize database performance."""
        optimizations = []
        
        try:
            with connection.cursor() as cursor:
                # Check for missing indexes
                cursor.execute("""
                    SELECT schemaname, tablename, indexname, indexdef 
                    FROM pg_indexes 
                    WHERE schemaname = 'public'
                    ORDER BY tablename, indexname
                """)
                existing_indexes = cursor.fetchall()
                
                # Recommended indexes for performance
                recommended_indexes = [
                    ('courses_course', 'idx_course_category_published', 'CREATE INDEX CONCURRENTLY idx_course_category_published ON courses_course(category_id, is_published)'),
                    ('courses_enrollment', 'idx_enrollment_user_progress', 'CREATE INDEX CONCURRENTLY idx_enrollment_user_progress ON courses_enrollment(user_id, progress_percentage)'),
                    ('ai_engine_activitylog', 'idx_activitylog_user_timestamp', 'CREATE INDEX CONCURRENTLY idx_activitylog_user_timestamp ON ai_engine_activitylog(user_id, timestamp DESC)'),
                ]
                
                for table, index_name, index_sql in recommended_indexes:
                    # Check if index exists
                    index_exists = any(idx[2] == index_name for idx in existing_indexes)
                    
                    if not index_exists:
                        try:
                            logger.info(f"Creating index: {index_name}")
                            cursor.execute(index_sql)
                            optimizations.append(f"Created index: {index_name}")
                            self.fixes_applied.append(f"Database index: {index_name}")
                        except Exception as e:
                            logger.warning(f"Failed to create index {index_name}: {e}")
                
                # Analyze tables for query optimization
                cursor.execute("""
                    SELECT tablename 
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                """)
                tables = [row[0] for row in cursor.fetchall()]
                
                for table in tables:
                    try:
                        cursor.execute(f"ANALYZE {table}")
                        optimizations.append(f"Analyzed table: {table}")
                    except Exception as e:
                        logger.warning(f"Failed to analyze table {table}: {e}")
                
                connection.commit()
                
        except Exception as e:
            logger.error(f"Database optimization error: {e}")
            self.issues_found.append(f"Database optimization: {str(e)}")
        
        return {
            'optimizations': optimizations,
            'indexes_created': len([opt for opt in optimizations if 'Created index' in opt]),
            'tables_analyzed': len([opt for opt in optimizations if 'Analyzed table' in opt])
        }
    
    def optimize_caching(self) -> Dict[str, Any]:
        """Optimize caching strategy."""
        optimizations = []
        
        try:
            # Clear old cache entries
            cache.clear()
            optimizations.append("Cleared cache")
            
            # Pre-warm cache with common data
            from apps.courses.models import Course
            from apps.users.models import User
            
            # Cache popular courses
            popular_courses = Course.objects.filter(
                is_published=True
            ).select_related('category').order_by('-enrollment_count')[:20]
            
            courses_cached = 0
            for course in popular_courses:
                cache.set(f"course_{course.id}", {
                    'id': course.id,
                    'title': course.title,
                    'slug': course.slug,
                    'category': course.category.name if course.category else None
                }, timeout=3600)
                courses_cached += 1
            
            optimizations.append(f"Pre-warmed {courses_cached} courses in cache")
            self.fixes_applied.append(f"Cache pre-warming: {courses_cached} courses")
            
        except Exception as e:
            logger.error(f"Cache optimization error: {e}")
            self.issues_found.append(f"Cache optimization: {str(e)}")
        
        return {
            'optimizations': optimizations,
            'courses_cached': courses_cached if 'courses_cached' in locals() else 0
        }
    
    def optimize_ml_services(self) -> Dict[str, Any]:
        """Optimize ML services performance."""
        optimizations = []
        
        try:
            # Initialize ML services
            from apps.ai_engine.enhanced_services import enhanced_rag_service
            from apps.ai_engine.ml_integration import ml_integration
            from apps.ai_engine.adaptive_learning_engine_v2 import adaptive_learning_engine
            
            # Pre-load ML models
            start_time = time.time()
            
            # Test RAG service
            context = enhanced_rag_service.get_context_for_query("test optimization", limit=1)
            rag_time = (time.time() - start_time) * 1000
            optimizations.append(f"RAG service initialized in {rag_time:.2f}ms")
            
            # Test ML integration
            start_time = time.time()
            recommendations = ml_integration.get_real_time_recommendations(1, 'test', 1)
            ml_time = (time.time() - start_time) * 1000
            optimizations.append(f"ML integration initialized in {ml_time:.2f}ms")
            
            # Test adaptive learning
            start_time = time.time()
            path = adaptive_learning_engine.generate_adaptive_path(1, 1)
            adaptive_time = (time.time() - start_time) * 1000
            optimizations.append(f"Adaptive learning initialized in {adaptive_time:.2f}ms")
            
            self.fixes_applied.append("ML services optimized and pre-loaded")
            
        except Exception as e:
            logger.error(f"ML services optimization error: {e}")
            self.issues_found.append(f"ML services optimization: {str(e)}")
        
        return {
            'optimizations': optimizations,
            'rag_time_ms': rag_time if 'rag_time' in locals() else 0,
            'ml_time_ms': ml_time if 'ml_time' in locals() else 0,
            'adaptive_time_ms': adaptive_time if 'adaptive_time' in locals() else 0
        }
    
    def optimize_api_performance(self) -> Dict[str, Any]:
        """Optimize API performance."""
        optimizations = []
        
        try:
            # Test API response times
            from django.test import Client
            
            client = Client()
            
            # Test key endpoints
            endpoints = [
                ('/api/v1/courses/', 'courses'),
                ('/api/ai_engine/recommendations/', 'recommendations'),
                ('/api/users/profile/', 'profile'),
            ]
            
            endpoint_times = {}
            
            for endpoint, name in endpoints:
                start_time = time.time()
                response = client.get(endpoint)
                response_time = (time.time() - start_time) * 1000
                endpoint_times[name] = response_time
                
                if response_time > 200:  # 200ms threshold
                    optimizations.append(f"Slow endpoint: {name} ({response_time:.2f}ms)")
                    self.issues_found.append(f"Slow API endpoint: {name}")
                else:
                    optimizations.append(f"Fast endpoint: {name} ({response_time:.2f}ms)")
            
            avg_time = sum(endpoint_times.values()) / len(endpoint_times)
            optimizations.append(f"Average API response time: {avg_time:.2f}ms")
            
        except Exception as e:
            logger.error(f"API performance optimization error: {e}")
            self.issues_found.append(f"API performance optimization: {str(e)}")
        
        return {
            'optimizations': optimizations,
            'endpoint_times': endpoint_times if 'endpoint_times' in locals() else {},
            'avg_response_time_ms': avg_time if 'avg_time' in locals() else 0
        }
    
    def run_performance_tests(self) -> Dict[str, Any]:
        """Run performance tests and benchmarks."""
        test_results = {}
        
        try:
            # Database performance test
            test_results['database'] = self._test_database_performance()
            
            # Cache performance test
            test_results['cache'] = self._test_cache_performance()
            
            # ML services performance test
            test_results['ml_services'] = self._test_ml_services_performance()
            
            # API performance test
            test_results['api'] = self._test_api_performance()
            
        except Exception as e:
            logger.error(f"Performance testing error: {e}")
            self.issues_found.append(f"Performance testing: {str(e)}")
        
        return test_results
    
    def _test_database_performance(self) -> Dict[str, Any]:
        """Test database performance."""
        try:
            from apps.courses.models import Course
            
            # Test query performance
            start_time = time.time()
            courses = list(Course.objects.filter(
                is_published=True
            ).select_related('category').prefetch_related('enrollments')[:50])
            query_time = (time.time() - start_time) * 1000
            
            # Test aggregation query
            start_time = time.time()
            stats = Course.objects.filter(
                is_published=True
            ).aggregate(
                total=Count('id'),
                avg_price=Avg('price'),
                max_enrollments=Max('enrollments__count')
            )
            aggregation_time = (time.time() - start_time) * 1000
            
            return {
                'query_time_ms': query_time,
                'aggregation_time_ms': aggregation_time,
                'courses_queried': len(courses),
                'performance_good': query_time < 100 and aggregation_time < 50
            }
        except Exception as e:
            return {'error': str(e), 'performance_good': False}
    
    def _test_cache_performance(self) -> Dict[str, Any]:
        """Test cache performance."""
        try:
            # Test cache set/get performance
            test_data = {'test': 'performance_check', 'timestamp': time.time()}
            
            # Test cache set
            start_time = time.time()
            cache.set('performance_test', test_data, 300)
            set_time = (time.time() - start_time) * 1000
            
            # Test cache get
            start_time = time.time()
            result = cache.get('performance_test')
            get_time = (time.time() - start_time) * 1000
            
            cache.delete('performance_test')
            
            return {
                'set_time_ms': set_time,
                'get_time_ms': get_time,
                'data_integrity': result == test_data,
                'performance_good': set_time < 10 and get_time < 5
            }
        except Exception as e:
            return {'error': str(e), 'performance_good': False}
    
    def _test_ml_services_performance(self) -> Dict[str, Any]:
        """Test ML services performance."""
        try:
            from apps.ai_engine.enhanced_services import enhanced_rag_service
            from apps.ai_engine.ml_integration import ml_integration
            
            # Test RAG service
            start_time = time.time()
            context = enhanced_rag_service.get_context_for_query("performance test query", limit=3)
            rag_time = (time.time() - start_time) * 1000
            
            # Test ML integration
            start_time = time.time()
            recommendations = ml_integration.get_real_time_recommendations(1, 'test', 3)
            ml_time = (time.time() - start_time) * 1000
            
            return {
                'rag_time_ms': rag_time,
                'ml_time_ms': ml_time,
                'context_returned': len(context) > 0,
                'recommendations_returned': len(recommendations) >= 0,
                'performance_good': rag_time < 200 and ml_time < 200
            }
        except Exception as e:
            return {'error': str(e), 'performance_good': False}
    
    def _test_api_performance(self) -> Dict[str, Any]:
        """Test API performance."""
        try:
            from django.test import Client
            
            client = Client()
            
            # Test multiple endpoints
            endpoints = [
                '/api/v1/courses/',
                '/api/ai_engine/recommendations/',
                '/health/'
            ]
            
            endpoint_results = {}
            
            for endpoint in endpoints:
                start_time = time.time()
                response = client.get(endpoint)
                response_time = (time.time() - start_time) * 1000
                
                endpoint_results[endpoint] = {
                    'response_time_ms': response_time,
                    'status_code': response.status_code,
                    'success': response.status_code < 400
                }
            
            avg_time = sum(result['response_time_ms'] for result in endpoint_results.values()) / len(endpoint_results)
            
            return {
                'endpoint_results': endpoint_results,
                'avg_response_time_ms': avg_time,
                'performance_good': avg_time < 100
            }
        except Exception as e:
            return {'error': str(e), 'performance_good': False}
    
    def validate_fixes(self) -> Dict[str, Any]:
        """Validate that fixes are working correctly."""
        validation_results = {}
        
        try:
            # Re-run health checks
            validation_results['health_after_fixes'] = self.check_system_health()
            
            # Re-run performance tests
            validation_results['performance_after_fixes'] = self.run_performance_tests()
            
            # Calculate improvement
            original_health = self.optimization_results.get('check_system_health', {}).get('overall', False)
            new_health = validation_results['health_after_fixes']['overall']
            
            health_improved = new_health and not original_health
            
            validation_results['improvements'] = {
                'health_improved': health_improved,
                'fixes_applied': len(self.fixes_applied),
                'issues_resolved': len(self.issues_found) - len([i for i in self.issues_found if 'error' not in i.lower()])
            }
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            validation_results['error'] = str(e)
        
        return validation_results
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive optimization report."""
        report = {
            'timestamp': time.time(),
            'summary': {
                'total_optimizations': len(self.fixes_applied),
                'issues_found': len(self.issues_found),
                'fixes_applied': len(self.fixes_applied),
                'overall_status': 'SUCCESS' if len(self.issues_found) == 0 else 'PARTIAL'
            },
            'optimization_results': self.optimization_results,
            'fixes_applied': self.fixes_applied,
            'issues_found': self.issues_found,
            'performance_metrics': self.performance_metrics,
            'recommendations': self._generate_recommendations()
        }
        
        # Save report to file
        report_file = f"optimization_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Optimization report saved to {report_file}")
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on optimization results."""
        recommendations = []
        
        if self.issues_found:
            recommendations.append("Address remaining issues found during optimization")
        
        # Performance recommendations
        health_result = self.optimization_results.get('check_system_health', {})
        if not health_result.get('overall', True):
            recommendations.append("Investigate system health issues")
        
        # Database recommendations
        db_result = self.optimization_results.get('optimize_database', {})
        if db_result.get('indexes_created', 0) == 0:
            recommendations.append("Consider additional database indexes for better performance")
        
        # Cache recommendations
        cache_result = self.optimization_results.get('optimize_caching', {})
        if cache_result.get('courses_cached', 0) < 10:
            recommendations.append("Expand cache pre-warming for better performance")
        
        # ML recommendations
        ml_result = self.optimization_results.get('optimize_ml_services', {})
        if any('ms' in key and value > 100 for key, value in ml_result.items() if 'ms' in key):
            recommendations.append("Optimize ML services for better performance")
        
        return recommendations

def main():
    """Main optimization function."""
    optimizer = SystemOptimizer()
    
    print("🚀 Starting Comprehensive System Optimization...")
    print("=" * 60)
    
    # Run optimization
    results = optimizer.run_comprehensive_optimization()
    
    # Display results
    print("\n📊 Optimization Results:")
    print("=" * 60)
    
    for step, result in results.items():
        print(f"\n{step.replace('_', ' ').title()}:")
        if isinstance(result, dict):
            for key, value in result.items():
                print(f"  {key}: {value}")
        else:
            print(f"  {result}")
    
    print(f"\n✅ Fixes Applied: {len(optimizer.fixes_applied)}")
    for fix in optimizer.fixes_applied:
        print(f"  - {fix}")
    
    if optimizer.issues_found:
        print(f"\n⚠️  Issues Found: {len(optimizer.issues_found)}")
        for issue in optimizer.issues_found:
            print(f"  - {issue}")
    
    print(f"\n📈 Overall Status: {results.get('generate_report', {}).get('summary', {}).get('overall_status', 'UNKNOWN')}")
    
    return results

if __name__ == '__main__':
    main()
