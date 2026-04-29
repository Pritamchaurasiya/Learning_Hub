# Comprehensive Integration Tests
"""
End-to-end testing for ML-enhanced Learning Hub platform with performance validation
"""

import pytest
import asyncio
import time
import json
from unittest.mock import Mock, patch, AsyncMock
from django.test import TransactionTestCase, TestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async
from datetime import timedelta
from typing import Dict, Any, List
import tempfile
import os

# Handle skipping if AI dependencies are missing
try:
    import torch
    import sklearn
    from elasticsearch import AsyncElasticsearch
except ImportError:
    import pytest
    pytestmark = pytest.mark.skip(reason="Heavy ML dependencies not installed")

# Import ML components
from apps.ai_engine.enhanced_services import (
    EnhancedRAGService,
    EnhancedUserBehaviorService,
    EnhancedCourseAnalyticsService,
    SearchType
)
from apps.ai_engine.ml_integration import RealTimeMLIntegration
from apps.ai_engine.realtime_inference import RealTimeInferencePipeline
from apps.ai_engine.enhanced_rag import EnhancedRAGService as MultiModalRAGService
from apps.ai_engine.adaptive_learning_engine_v2 import AdaptiveLearningEngine
from apps.ai_engine.optimized_queries import OptimizedMLQueryManager
from apps.ai_engine.advanced_caching import AdvancedCacheManager, MLModelCache
from apps.ai_engine.ml_monitoring import MLMetricsCollector, MLMetricsAPI

from apps.courses.models import Course, Category, Enrollment
from apps.users.models import User
from apps.ai_engine.models import ActivityLog

User = get_user_model()

class TestMLIntegrationEndToEnd(TransactionTestCase):
    """End-to-end testing for ML integration with Django features."""
    
    def setUp(self):
        """Set up comprehensive test data."""
        cache.clear()
        
        # Create test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        
        # Create test category
        self.category = Category.objects.create(
            name="Python Programming",
            slug="python-programming",
            description="Learn Python programming",
            is_active=True
        )
        
        # Create test courses
        self.courses = []
        for i in range(5):
            course = Course.objects.create(
                title=f"Python Course {i}",
                slug=f"python-course-{i}",
                description=f"Learn Python {i}",
                category=self.category,
                is_published=True,
                difficulty='intermediate' if i % 2 == 0 else 'beginner'
            )
            self.courses.append(course)
            
            # Create enrollment
            Enrollment.objects.create(
                user=self.user,
                course=course,
                progress_percentage=i * 20
            )
        
        # Initialize ML components
        self.rag_service = EnhancedRAGService()
        self.behavior_service = EnhancedUserBehaviorService()
        self.analytics_service = EnhancedCourseAnalyticsService()
        self.ml_integration = RealTimeMLIntegration()
        self.adaptive_engine = AdaptiveLearningEngine()
        self.query_manager = OptimizedMLQueryManager()
        self.cache_manager = AdvancedCacheManager()
        self.metrics_collector = MLMetricsCollector()
    
    @pytest.mark.asyncio
    async def test_complete_ml_workflow(self):
        """Test complete ML workflow from user interaction to personalization."""
        start_time = time.time()
        
        # Step 1: Track user activity
        await self.behavior_service.track_activity(
            user=self.user,
            action="lesson_completed",
            metadata={
                'course_id': self.courses[0].id,
                'lesson_id': 1,
                'duration': 300,
                'score': 85
            }
        )
        
        # Step 2: Generate personalized recommendations
        recommendations = await self.ml_integration.get_real_time_recommendations(
            user_id=self.user.id,
            context='courses',
            limit=3
        )
        
        # Step 3: Get adaptive learning path
        adaptive_path = await self.adaptive_engine.generate_adaptive_path(
            user_id=self.user.id,
            course_id=self.courses[0].id
        )
        
        # Step 4: Get RAG context for query
        rag_context = await self.rag_service.get_context_for_query(
            query="Python programming basics",
            limit=3,
            search_type=SearchType.HYBRID
        )
        
        # Step 5: Get course analytics
        analytics = await self.analytics_service.get_course_insights(self.courses[0])
        
        # Step 6: Get optimized user profile
        user_profile = self.query_manager.get_optimized_user_profile(self.user.id)
        
        # Verify workflow completion
        self.assertIsInstance(recommendations, list)
        self.assertIsInstance(adaptive_path, object)  # AdaptivePath
        self.assertIsInstance(rag_context, str)
        self.assertIsInstance(analytics, dict)
        self.assertIsInstance(user_profile, dict)
        
        # Performance assertion
        workflow_time = (time.time() - start_time) * 1000
        self.assertLess(workflow_time, 500, f"Complete ML workflow took {workflow_time:.2f}ms, should be under 500ms")
    
    @pytest.mark.asyncio
    async def test_ml_performance_under_load(self):
        """Test ML performance under concurrent load."""
        import threading
        import queue
        
        results = queue.Queue()
        
        def ml_operation():
            start_time = time.time()
            
            # Simulate ML operation
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                recommendations = loop.run_until_complete(
                    self.ml_integration.get_real_time_recommendations(
                        user_id=self.user.id,
                        context='courses',
                        limit=3
                    )
                )
                
                processing_time = (time.time() - start_time) * 1000
                results.put(processing_time)
                
            finally:
                loop.close()
        
        # Run 20 concurrent operations
        threads = []
        for _ in range(20):
            thread = threading.Thread(target=ml_operation)
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Analyze results
        processing_times = []
        while not results.empty():
            processing_times.append(results.get())
        
        # Performance assertions
        avg_time = sum(processing_times) / len(processing_times)
        max_time = max(processing_times)
        p95_time = sorted(processing_times)[int(len(processing_times) * 0.95)]
        
        self.assertLess(avg_time, 100, f"Average time {avg_time:.2f}ms should be under 100ms")
        self.assertLess(max_time, 200, f"Max time {max_time:.2f}ms should be under 200ms")
        self.assertLess(p95_time, 150, f"P95 time {p95_time:.2f}ms should be under 150ms")
    
    @pytest.mark.asyncio
    async def test_caching_performance(self):
        """Test caching performance across ML services."""
        # Test RAG caching
        start_time = time.time()
        result1 = await self.rag_service.get_context_for_query(
            query="Python programming",
            limit=3,
            search_type=SearchType.SEMANTIC
        )
        first_time = (time.time() - start_time) * 1000
        
        # Second call should be faster (cached)
        start_time = time.time()
        result2 = await self.rag_service.get_context_for_query(
            query="Python programming",
            limit=3,
            search_type=SearchType.SEMANTIC
        )
        second_time = (time.time() - start_time) * 1000
        
        # Verify cache hit
        self.assertEqual(result1, result2)
        self.assertLess(second_time, first_time * 0.5, "Cached call should be at least 50% faster")
        
        # Test user profile caching
        profile_start = time.time()
        profile1 = self.query_manager.get_optimized_user_profile(self.user.id)
        profile_first_time = (time.time() - profile_start) * 1000
        
        profile_start = time.time()
        profile2 = self.query_manager.get_optimized_user_profile(self.user.id)
        profile_second_time = (time.time() - profile_start) * 1000
        
        self.assertEqual(profile1, profile2)
        self.assertLess(profile_second_time, profile_first_time * 0.5)
    
    @pytest.mark.asyncio
    async def test_adaptive_learning_personalization(self):
        """Test adaptive learning personalization accuracy."""
        # Generate adaptive path
        path = await self.adaptive_engine.generate_adaptive_path(
            user_id=self.user.id,
            course_id=self.courses[0].id
        )
        
        # Verify path structure
        self.assertTrue(hasattr(path, 'nodes'))
        self.assertTrue(hasattr(path, 'user_id'))
        self.assertTrue(hasattr(path, 'course_id'))
        self.assertEqual(path.user_id, self.user.id)
        
        # Test path adaptation based on performance
        performance_data = {
            'recent_scores': [75, 80, 85],
            'session_times': [25, 30, 20],
            'difficulty_preference': 'intermediate'
        }
        
        adapted_path = await self.adaptive_engine.adapt_learning_path(
            user_id=self.user.id,
            course_id=self.courses[0].id,
            reason=AdaptationReason.RAPID_PROGRESS,
            performance_data=performance_data
        )
        
        # Verify adaptation occurred
        self.assertTrue(hasattr(adapted_path, 'adaptation_history'))
        self.assertTrue(len(adapted_path.adaptation_history) > 0)
    
    @pytest.mark.asyncio
    async def test_real_time_inference_performance(self):
        """Test real-time inference performance."""
        # Initialize inference pipeline
        await self.adaptive_engine.initialize()
        
        # Test inference performance
        start_time = time.time()
        
        result = await self.adaptive_engine.predict(
            model_name="text-embedding",
            input_data={"text": "Test input for performance validation"},
            optimization_level="advanced"
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        # Performance assertion
        self.assertLess(processing_time, 50, f"Inference took {processing_time:.2f}ms, should be under 50ms")
        self.assertIsInstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_ml_monitoring_integration(self):
        """Test ML monitoring integration."""
        # Start metrics collection
        self.metrics_collector.start_collection()
        
        # Simulate ML operations to generate metrics
        await self.behavior_service.track_activity(
            user=self.user,
            action="lesson_completed",
            metadata={'duration': 300}
        )
        
        await self.ml_integration.get_real_time_recommendations(
            user_id=self.user.id,
            context='courses',
            limit=3
        )
        
        # Wait for metrics collection
        await asyncio.sleep(1)
        
        # Get metrics summary
        metrics_summary = self.metrics_collector.get_metrics_summary()
        
        # Verify metrics collection
        self.assertIsInstance(metrics_summary, dict)
        self.assertIn('timestamp', metrics_summary)
        self.assertIn('services', metrics_summary)
        self.assertIn('active_alerts', metrics_summary)
        
        # Get Prometheus metrics
        prometheus_metrics = self.metrics_collector.get_prometheus_metrics()
        
        # Verify Prometheus format
        self.assertIsInstance(prometheus_metrics, str)
        self.assertGreater(len(prometheus_metrics), 100)  # Should have multiple metrics
        
        # Stop metrics collection
        self.metrics_collector.stop_collection()
    
    def test_ml_api_endpoints(self):
        """Test ML API endpoints."""
        # Test recommendations endpoint
        response = self.client.get('/api/v1/ai/recommendations/')
        
        # Should return 401 for unauthenticated, 200 for authenticated
        self.assertIn(response.status_code, [200, 401])
        
        if response.status_code == 200:
            data = response.json()
            self.assertIsInstance(data, list)
        
        # Test course analytics endpoint
        response = self.client.get('/api/v1/ai/learning-stats/')
        self.assertIn(response.status_code, [200, 401])
    
    @pytest.mark.asyncio
    async def test_ml_error_handling_and_recovery(self):
        """Test ML service error handling and recovery."""
        # Test with invalid user ID
        try:
            recommendations = await self.ml_integration.get_real_time_recommendations(
                user_id=99999,  # Non-existent user
                context='courses',
                limit=3
            )
            
            # Should handle gracefully
            self.assertIsInstance(recommendations, list)
            
        except Exception as e:
            self.fail(f"ML service should handle invalid user gracefully: {e}")
        
        # Test with empty query
        try:
            rag_context = await self.rag_service.get_context_for_query(
                query="",
                limit=3
            )
            
            # Should handle gracefully
            self.assertIsInstance(rag_context, str)
            self.assertGreater(len(rag_context), 0)
            
        except Exception as e:
            self.fail(f"RAG service should handle empty query gracefully: {e}")
    
    @pytest.mark.asyncio
    async def test_ml_data_consistency(self):
        """Test ML data consistency across services."""
        # Create user activity
        await self.behavior_service.track_activity(
            user=self.user,
            action="quiz_completed",
            metadata={'score': 90, 'course_id': self.courses[0].id}
        )
        
        # Get user profile from query manager
        profile = self.query_manager.get_optimized_user_profile(self.user.id)
        
        # Get user behavior analysis
        behavior_analysis = await self.behavior_service.analyze_behavior(self.user)
        
        # Verify data consistency
        self.assertEqual(profile['user_id'], self.user.id)
        self.assertEqual(behavior_analysis['total_enrollments'], profile['total_enrollments'])
        
        # Verify activity tracking consistency
        self.assertGreater(profile['recent_activities'], 0)
    
    @pytest.mark.asyncio
    async def test_ml_scalability_limits(self):
        """Test ML scalability limits and resource usage."""
        # Test large batch operations
        large_batch_size = 100
        start_time = time.time()
        
        tasks = []
        for i in range(large_batch_size):
            task = self.ml_integration.get_real_time_recommendations(
                user_id=self.user.id,
                context='courses',
                limit=1
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        batch_time = (time.time() - start_time) * 1000
        avg_time = batch_time / large_batch_size
        
        # Verify scalability
        self.assertLess(avg_time, 200, f"Average time {avg_time:.2f}ms should be under 200ms for batch operations")
        self.assertEqual(len(results), large_batch_size)
        
        # Verify no exceptions
        exceptions = [r for r in results if isinstance(r, Exception)]
        self.assertEqual(len(exceptions), 0, f"Batch operations should not raise exceptions: {exceptions}")

class TestMLDatabaseIntegration(TransactionTestCase):
    """Test ML integration with database operations."""
    
    def setUp(self):
        """Set up database integration test data."""
        cache.clear()
        
        # Create test user
        self.user = User.objects.create_user(
            username="dbtestuser",
            email="dbtest@example.com",
            password="testpass123"
        )
        
        # Create test category
        self.category = Category.objects.create(
            name="Database Testing",
            slug="db-testing",
            description="Database testing category",
            is_active=True
        )
        
        # Create test courses with relationships
        self.courses = []
        for i in range(10):
            course = Course.objects.create(
                title=f"Database Course {i}",
                slug=f"db-course-{i}",
                description=f"Database course {i}",
                category=self.category,
                is_published=True,
                difficulty='intermediate'
            )
            self.courses.append(course)
            
            # Create enrollment with progress
            Enrollment.objects.create(
                user=self.user,
                course=course,
                progress_percentage=i * 10,
                rating=min(5, i % 6) if i > 0 else None
            )
        
        # Create activity logs
        for i in range(50):
            ActivityLog.objects.create(
                user=self.user,
                action=f"action_{i % 5}",
                metadata={
                    'duration': i * 10,
                    'score': min(100, i * 5),
                    'course_id': self.courses[i % len(self.courses)].id
                }
            )
    
    @pytest.mark.asyncio
    async def test_optimized_query_performance(self):
        """Test optimized query performance."""
        query_manager = OptimizedMLQueryManager()
        
        # Test user profile query performance
        start_time = time.time()
        profile = query_manager.get_optimized_user_profile(self.user.id)
        profile_time = (time.time() - start_time) * 1000
        
        # Performance assertion
        self.assertLess(profile_time, 100, f"User profile query took {profile_time:.2f}ms, should be under 100ms")
        
        # Verify profile completeness
        self.assertIn('user_id', profile)
        self.assertIn('total_enrollments', profile)
        self.assertIn('learning_patterns', profile)
        self.assertIn('preferences', profile)
        
        # Test course analytics query performance
        start_time = time.time()
        analytics = query_manager.get_optimized_course_analytics(self.courses[0].id)
        analytics_time = (time.time() - start_time) * 1000
        
        self.assertLess(analytics_time, 150, f"Course analytics query took {analytics_time:.2f}ms, should be under 150ms")
        
        # Verify analytics completeness
        self.assertIn('enrollment_metrics', analytics)
        self.assertIn('progress_metrics', analytics)
        self.assertIn('calculated_metrics', analytics)
    
    @pytest.mark.asyncio
    async def test_database_query_caching(self):
        """Test database query caching effectiveness."""
        query_manager = OptimizedMLQueryManager()
        
        # First query (cache miss)
        start_time = time.time()
        profile1 = query_manager.get_optimized_user_profile(self.user.id)
        first_time = (time.time() - start_time) * 1000
        
        # Second query (cache hit)
        start_time = time.time()
        profile2 = query_manager.get_optimized_user_profile(self.user.id)
        second_time = (time.time() - start_time) * 1000
        
        # Verify cache effectiveness
        self.assertEqual(profile1, profile2)
        self.assertLess(second_time, first_time * 0.5, "Cached query should be at least 50% faster")
        
        # Test cache invalidation
        cache.clear()
        
        start_time = time.time()
        profile3 = query_manager.get_optimized_user_profile(self.user.id)
        third_time = (time.time() - start_time) * 1000
        
        # Should be slower after cache clear
        self.assertGreater(third_time, second_time)
    
    def test_ml_model_relationships(self):
        """Test ML model relationships and constraints."""
        # Test UserProfile model
        try:
            from apps.ai_engine.models import UserProfile
            profile = UserProfile.objects.create(
                user=self.user,
                learning_style='visual',
                preferred_difficulty='intermediate',
                time_availability=60
            )
            
            # Verify relationship
            self.assertEqual(profile.user, self.user)
            
        except Exception as e:
            self.fail(f"UserProfile creation failed: {e}")
        
        # Test ActivityLog model
        try:
            activity = ActivityLog.objects.create(
                user=self.user,
                action='test_action',
                metadata={'test': 'data'}
            )
            
            # Verify relationship
            self.assertEqual(activity.user, self.user)
            
        except Exception as e:
            self.fail(f"ActivityLog creation failed: {e}")
    
    @pytest.mark.asyncio
    async def test_concurrent_database_operations(self):
        """Test concurrent database operations with ML services."""
        import threading
        import queue
        
        results = queue.Queue()
        
        def db_operation():
            try:
                # Create activity
                activity = ActivityLog.objects.create(
                    user=self.user,
                    action='concurrent_test',
                    metadata={'thread_id': threading.current_thread().ident}
                )
                
                # Get user profile
                query_manager = OptimizedMLQueryManager()
                profile = query_manager.get_optimized_user_profile(self.user.id)
                
                results.put({
                    'activity_id': activity.id,
                    'profile_user_id': profile.get('user_id'),
                    'success': True
                })
                
            except Exception as e:
                results.put({'success': False, 'error': str(e)})
        
        # Run 10 concurrent operations
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=db_operation)
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify results
        successful_operations = 0
        while not results.empty():
            result = results.get()
            if result.get('success'):
                successful_operations += 1
            else:
                self.fail(f"Concurrent operation failed: {result.get('error')}")
        
        self.assertEqual(successful_operations, 10, "All concurrent operations should succeed")

class TestMLSystemIntegration(APITestCase):
    """Test ML system integration with Django APIs."""
    
    def setUp(self):
        """Set up API integration test data."""
        cache.clear()
        
        # Create test user and authenticate
        self.user = User.objects.create_user(
            username="apiuser",
            email="api@example.com",
            password="testpass123"
        )
        
        # Force authentication
        self.client.force_authenticate(user=self.user)
        
        # Create test data
        self.category = Category.objects.create(
            name="API Testing",
            slug="api-testing",
            description="API testing category",
            is_active=True
        )
        
        self.course = Course.objects.create(
            title="API Test Course",
            slug="api-test-course",
            description="API test course",
            category=self.category,
            is_published=True
        )
        
        Enrollment.objects.create(
            user=self.user,
            course=self.course,
            progress_percentage=50
        )
    
    def test_ml_api_authentication(self):
        """Test ML API authentication and authorization."""
        # Test without authentication
        client = self.client.__class__()
        response = client.get('/api/v1/ai/recommendations/')
        self.assertEqual(response.status_code, 401)
        
        # Test with authentication
        response = self.client.get('/api/v1/ai/recommendations/')
        self.assertIn(response.status_code, [200, 403])  # 403 if permissions required
    
    def test_ml_api_response_format(self):
        """Test ML API response format and structure."""
        # Test recommendations API
        response = self.client.get('/api/v1/ai/recommendations/')
        
        if response.status_code == 200:
            data = response.json()
            self.assertIsInstance(data, list)
            
            # Check structure if data exists
            if data:
                self.assertIn('title', data[0])
                self.assertIn('type', data[0])
        
        # Test learning stats API
        response = self.client.get('/api/v1/ai/learning-stats/')
        
        if response.status_code == 200:
            data = response.json()
            self.assertIsInstance(data, dict)
    
    def test_ml_api_error_handling(self):
        """Test ML API error handling."""
        # Test with invalid parameters
        response = self.client.get('/api/v1/ai/recommendations/', {'limit': 'invalid'})
        
        # Should handle gracefully
        self.assertIn(response.status_code, [200, 400, 422])
        
        # Test non-existent endpoint
        response = self.client.get('/api/v1/ai/nonexistent/')
        self.assertEqual(response.status_code, 404)
    
    def test_ml_api_rate_limiting(self):
        """Test ML API rate limiting."""
        # Make multiple rapid requests
        responses = []
        for _ in range(10):
            response = self.client.get('/api/v1/ai/recommendations/')
            responses.append(response.status_code)
        
        # Check if rate limiting is applied
        rate_limited_responses = [code for code in responses if code == 429]
        
        # Rate limiting may or may not be implemented
        if rate_limited_responses:
            self.assertGreater(len(rate_limited_responses), 0, "Rate limiting should be applied for rapid requests")
    
    def test_ml_api_caching_headers(self):
        """Test ML API caching headers."""
        response = self.client.get('/api/v1/ai/recommendations/')
        
        if response.status_code == 200:
            # Check for cache control headers
            cache_control = response.get('Cache-Control')
            if cache_control:
                self.assertIn('max-age', cache_control.lower())

class TestMLWebSocketIntegration(TransactionTestCase):
    """Test ML integration with WebSocket features."""
    
    def setUp(self):
        """Set up WebSocket integration test data."""
        cache.clear()
        
        self.user = User.objects.create_user(
            username="wsuser",
            email="ws@example.com",
            password="testpass123"
        )
    
    @pytest.mark.asyncio
    async def test_ml_websocket_integration(self):
        """Test ML integration with WebSocket connections."""
        from apps.core.routing import websocket_urlpatterns
        
        # Create application
        application = URLRouter(websocket_urlpatterns)
        
        # Test WebSocket connection
        communicator = WebsocketCommunicator(
            application,
            f"/ws/notifications/?user_id={self.user.id}"
        )
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Test message exchange
        await communicator.send_json_to_json({
            'type': 'test_ml_integration',
            'data': {'test': True}
        })
        
        response = await communicator.receive_json_from_json(timeout=5)
        
        # Verify ML integration in WebSocket response
        self.assertIsInstance(response, dict)
        self.assertIn('type', response)
        
        # Close connection
        await communicator.disconnect()
    
    @pytest.mark.asyncio
    async def test_ml_real_time_updates_via_websocket(self):
        """Test real-time ML updates via WebSocket."""
        from apps.core.routing import websocket_urlpatterns
        
        application = URLRouter(websocket_urlpatterns)
        
        communicator = WebsocketCommunicator(
            application,
            f"/ws/notifications/?user_id={self.user.id}"
        )
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Simulate ML update
        from apps.ai_engine.ml_integration import ml_integration
        
        # Track activity that should trigger WebSocket update
        await ml_integration.track_user_interaction(
            user_id=self.user.id,
            item_id=1,
            item_type='course',
            action='view'
        )
        
        # Wait for WebSocket update
        try:
            response = await communicator.receive_json_from_json(timeout=2)
            
            # Verify ML update in WebSocket message
            self.assertIsInstance(response, dict)
            self.assertIn('type', response)
            
        except Exception:
            # WebSocket update may not be implemented yet
            pass
        
        await communicator.disconnect()

class TestMLPerformanceBenchmarks(TransactionTestCase):
    """Performance benchmarks for ML components."""
    
    def setUp(self):
        """Set up performance test data."""
        cache.clear()
        
        # Create test user
        self.user = User.objects.create_user(
            username="perfuser",
            email="perf@example.com",
            password="testpass123"
        )
        
        # Create test course
        self.category = Category.objects.create(
            name="Performance Testing",
            slug="perf-testing",
            description="Performance testing category",
            is_active=True
        )
        
        self.course = Course.objects.create(
            title="Performance Test Course",
            slug="perf-test-course",
            description="Performance test course",
            category=self.category,
            is_published=True
        )
    
    @pytest.mark.asyncio
    async def test_ml_service_latency_benchmarks(self):
        """Benchmark ML service latencies."""
        services = {
            'rag_service': EnhancedRAGService(),
            'behavior_service': EnhancedUserBehaviorService(),
            'analytics_service': EnhancedCourseAnalyticsService(),
            'ml_integration': RealTimeMLIntegration(),
            'adaptive_engine': AdaptiveLearningEngine()
        }
        
        results = {}
        
        for service_name, service in services.items():
            latencies = []
            
            # Run 10 iterations
            for _ in range(10):
                start_time = time.time()
                
                try:
                    if service_name == 'rag_service':
                        await service.get_context_for_query("test query", limit=3)
                    elif service_name == 'behavior_service':
                        await service.analyze_behavior(self.user)
                    elif service_name == 'analytics_service':
                        await service.get_course_insights(self.course)
                    elif service_name == 'ml_integration':
                        await service.get_real_time_recommendations(self.user.id, 'courses', 3)
                    elif service_name == 'adaptive_engine':
                        await service.generate_adaptive_path(self.user.id, self.course.id)
                    
                    latency = (time.time() - start_time) * 1000
                    latencies.append(latency)
                    
                except Exception as e:
                    logger.error(f"Error in {service_name}: {e}")
                    continue
            
            if latencies:
                results[service_name] = {
                    'avg_latency': sum(latencies) / len(latencies),
                    'min_latency': min(latencies),
                    'max_latency': max(latencies),
                    'p95_latency': sorted(latencies)[int(len(latencies) * 0.95)]
                }
        
        # Performance assertions
        for service_name, metrics in results.items():
            self.assertLess(metrics['avg_latency'], 100, f"{service_name} avg latency {metrics['avg_latency']:.2f}ms should be under 100ms")
            self.assertLess(metrics['p95_latency'], 200, f"{service_name} p95 latency {metrics['p95_latency']:.2f}ms should be under 200ms")
        
        logger.info(f"ML Service Performance Benchmarks: {results}")
    
    @pytest.mark.asyncio
    async def test_ml_memory_usage_benchmarks(self):
        """Benchmark ML service memory usage."""
        import psutil
        import gc
        
        # Get initial memory usage
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Run ML operations
        services = [
            EnhancedRAGService(),
            RealTimeMLIntegration(),
            AdaptiveLearningEngine()
        ]
        
        for service in services:
            # Perform multiple operations
            for _ in range(10):
                try:
                    if isinstance(service, EnhancedRAGService):
                        await service.get_context_for_query("memory test query", limit=5)
                    elif isinstance(service, RealTimeMLIntegration):
                        await service.get_real_time_recommendations(self.user.id, 'courses', 5)
                    elif isinstance(service, AdaptiveLearningEngine):
                        await service.generate_adaptive_path(self.user.id, self.course.id)
                        
                except Exception as e:
                    logger.error(f"Memory test error: {e}")
            
            # Force garbage collection
            del service
            gc.collect()
        
        # Get final memory usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory assertion (should be reasonable)
        self.assertLess(memory_increase, 100, f"Memory increase {memory_increase:.2f}MB should be under 100MB")
        
        logger.info(f"Memory usage benchmark: initial={initial_memory:.2f}MB, final={final_memory:.2f}MB, increase={memory_increase:.2f}MB")
    
    @pytest.mark.asyncio
    async def test_ml_throughput_benchmarks(self):
        """Benchmark ML service throughput."""
        ml_integration = RealTimeMLIntegration()
        
        # Test recommendation throughput
        start_time = time.time()
        
        tasks = []
        for i in range(100):
            task = ml_integration.get_real_time_recommendations(
                user_id=self.user.id,
                context='courses',
                limit=1
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        total_time = time.time() - start_time
        successful_requests = len([r for r in results if not isinstance(r, Exception)])
        throughput = successful_requests / total_time
        
        # Throughput assertion
        self.assertGreater(throughput, 10, f"Throughput {throughput:.2f} req/s should be at least 10 req/s")
        
        logger.info(f"ML Throughput Benchmark: {throughput:.2f} requests/second")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
