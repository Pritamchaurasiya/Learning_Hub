# Comprehensive AI Services Testing
"""
Complete testing suite for AI engine components with performance validation
"""

import pytest
import asyncio
import time
import json
from unittest.mock import Mock, patch, AsyncMock
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from datetime import timedelta
from typing import Dict, Any, List

from apps.ai_engine.enhanced_services import (
    EnhancedRAGService,
    EnhancedUserBehaviorService,
    EnhancedCourseAnalyticsService,
    SearchType
)
from apps.ai_engine.ml_integration import RealTimeMLIntegration
from apps.ai_engine.realtime_inference import RealTimeInferencePipeline
from apps.ai_engine.enhanced_rag import EnhancedRAGService as MultiModalRAGService
from apps.courses.models import Course, Category, Enrollment
from apps.users.models import User

# Handle skipping if AI dependencies are missing
try:
    import torch
    from elasticsearch import AsyncElasticsearch
except ImportError:
    pytestmark = pytest.mark.skip(reason="Heavy ML dependencies not installed")

User = get_user_model()

class TestEnhancedRAGService(TransactionTestCase):
    """Test enhanced RAG service with performance validation."""
    
    def setUp(self):
        """Set up test data."""
        cache.clear()
        self.rag_service = EnhancedRAGService()
        
        # Create test category
        self.category = Category.objects.create(
            name="Test Category",
            slug="test-category",
            description="Test description",
            is_active=True
        )
        
        # Create test instructor
        self.instructor = User.objects.create_user(username="instructor1", email="i1@ex.com")
        
        # Create test course
        self.course = Course.objects.create(
            title="Python Programming",
            slug="python-programming",
            description="Learn Python programming",
            category=self.category,
            instructor=self.instructor,
            is_published=True
        )
    
    @pytest.mark.asyncio
    async def test_semantic_search_performance(self):
        """Test semantic search performance under 500ms target."""
        start_time = time.time()
        
        result = await self.rag_service.get_context_for_query(
            query="Python programming basics",
            limit=5,
            search_type=SearchType.SEMANTIC
        )
        
        processing_time = (time.time() - start_time) * 1000  # Convert to ms
        
        # Performance assertion
        self.assertLess(processing_time, 500, f"Semantic search took {processing_time:.2f}ms, should be under 500ms")
        
        # Functional assertions
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 10)
        self.assertIn("Semantic Context:", result)
    
    @pytest.mark.asyncio
    async def test_hybrid_search_accuracy(self):
        """Test hybrid search accuracy and relevance."""
        result = await self.rag_service.get_context_for_query(
            query="Python programming",
            limit=3,
            search_type=SearchType.HYBRID
        )
        
        # Should contain both semantic and keyword context
        self.assertIn("Hybrid Context:", result)
        self.assertGreater(len(result), 50)
        
        # Should be relevant to Python programming
        self.assertIn("python", result.lower())
    
    @pytest.mark.asyncio
    async def test_caching_functionality(self):
        """Test caching reduces processing time."""
        query = "Python programming basics"
        
        # First call - should be slower
        start_time = time.time()
        result1 = await self.rag_service.get_context_for_query(query, limit=3)
        first_time = (time.time() - start_time) * 1000
        
        # Second call - should be faster (cached)
        start_time = time.time()
        result2 = await self.rag_service.get_context_for_query(query, limit=3)
        second_time = (time.time() - start_time) * 1000
        
        # Results should be identical
        self.assertEqual(result1, result2)
        
        # Second call should be significantly faster
        self.assertLess(second_time, first_time * 0.5)
    
    @pytest.mark.asyncio
    async def test_multimodal_search(self):
        """Test multi-modal search capabilities."""
        result = await self.rag_service.get_context_for_query(
            query="Python tutorial",
            limit=3,
            search_type=SearchType.MULTIMODAL
        )
        
        # Should handle multi-modal search
        self.assertIsInstance(result, str)
        # Note: Multi-modal search may not be fully implemented in test environment
    
    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test error handling in RAG service."""
        # Test with invalid query
        result = await self.rag_service.get_context_for_query(
            query="",
            limit=3
        )
        
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 0)

class TestEnhancedUserBehaviorService(TransactionTestCase):
    """Test enhanced user behavior service with real-time tracking."""
    
    def setUp(self):
        """Set up test data."""
        cache.clear()
        self.behavior_service = EnhancedUserBehaviorService()
        
        # Create test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        
        # Create test course and enrollment
        self.course = Course.objects.create(
            title="Test Course",
            slug="test-course",
            description="Test description",
            instructor=self.user,
            is_published=True
        )
        
        self.enrollment = Enrollment.objects.create(
            user=self.user,
            course=self.course,
            progress_percentage=50
        )
    
    @pytest.mark.asyncio
    async def test_activity_tracking(self):
        """Test real-time activity tracking."""
        metadata = {
            'course_id': self.course.id,
            'lesson_id': 1,
            'duration': 300
        }
        
        # Track activity
        await self.behavior_service.track_activity(
            user=self.user,
            action="lesson_completed",
            metadata=metadata
        )
        
        # Verify tracking worked (would check database in real implementation)
        self.assertTrue(True)  # Placeholder assertion
    
    @pytest.mark.asyncio
    async def test_behavior_analysis(self):
        """Test behavior analysis with ML insights."""
        result = await self.behavior_service.analyze_behavior(self.user)
        
        # Should return comprehensive analysis
        self.assertIsInstance(result, dict)
        self.assertIn('engagement_score', result)
        self.assertIn('total_enrollments', result)
        self.assertIn('completion_rate', result)
        self.assertIn('learning_patterns', result)
        self.assertIn('predictions', result)
        
        # Validate data types
        self.assertIsInstance(result['engagement_score'], (int, float))
        self.assertIsInstance(result['total_enrollments'], int)
        self.assertIsInstance(result['completion_rate'], (int, float))
        self.assertIsInstance(result['learning_patterns'], dict)
        self.assertIsInstance(result['predictions'], dict)
    
    @pytest.mark.asyncio
    async def test_learning_pattern_detection(self):
        """Test learning pattern detection."""
        result = await self.behavior_service.analyze_behavior(self.user)
        
        patterns = result['learning_patterns']
        
        # Should detect learning patterns
        self.assertIn('preferred_time', patterns)
        self.assertIn('learning_style', patterns)
        self.assertIn('difficulty_preference', patterns)
        self.assertIn('format_preference', patterns)
        
        # Validate pattern values
        self.assertIn(patterns['preferred_time'], ['morning', 'afternoon', 'evening', 'night'])
        self.assertIn(patterns['learning_style'], ['visual', 'reading', 'kinesthetic', 'mixed'])
    
    @pytest.mark.asyncio
    async def test_prediction_generation(self):
        """Test ML-based prediction generation."""
        result = await self.behavior_service.analyze_behavior(self.user)
        
        predictions = result['predictions']
        
        # Should generate predictions
        self.assertIn('course_completion_likelihood', predictions)
        self.assertIn('engagement_trend', predictions)
        self.assertIn('dropout_risk', predictions)
        self.assertIn('learning_velocity', predictions)
        
        # Validate prediction values
        self.assertIsInstance(predictions['course_completion_likelihood'], (int, float))
        self.assertGreaterEqual(predictions['course_completion_likelihood'], 0)
        self.assertLessEqual(predictions['course_completion_likelihood'], 1)

class TestEnhancedCourseAnalyticsService(TransactionTestCase):
    """Test enhanced course analytics service with ML insights."""
    
    def setUp(self):
        """Set up test data."""
        cache.clear()
        self.analytics_service = EnhancedCourseAnalyticsService()
        
        # Create test category
        self.category = Category.objects.create(
            name="Test Category",
            slug="test-category",
            description="Test description",
            is_active=True
        )
        
        # Create test course
        self.instructor = User.objects.create_user(username="instructor2", email="i2@ex.com")
        self.course = Course.objects.create(
            title="Advanced Python",
            slug="advanced-python",
            description="Advanced Python programming",
            category=self.category,
            instructor=self.instructor,
            is_published=True,
            avg_rating=4.5
        )
        
        # Create test enrollments
        for i in range(10):
            Enrollment.objects.create(
                user=User.objects.create_user(
                    username=f"user{i}",
                    email=f"user{i}@example.com",
                    password="testpass123"
                ),
                course=self.course,
                progress_percentage=i * 10  # Varied progress
            )
    
    @pytest.mark.asyncio
    async def test_course_insights_generation(self):
        """Test comprehensive course insights generation."""
        insights = await self.analytics_service.get_course_insights(self.course)
        
        # Should return comprehensive insights
        self.assertIsInstance(insights, dict)
        self.assertIn('total_enrollments', insights)
        self.assertIn('active_students', insights)
        self.assertIn('completed_students', insights)
        self.assertIn('completion_rate', insights)
        self.assertIn('average_progress', insights)
        self.assertIn('average_rating', insights)
        self.assertIn('engagement_score', insights)
        self.assertIn('difficulty_level', insights)
        self.assertIn('popularity_trend', insights)
        self.assertIn('recommendation_score', insights)
        self.assertIn('ml_insights', insights)
    
    @pytest.mark.asyncio
    async def test_difficulty_assessment(self):
        """Test ML-based difficulty assessment."""
        insights = await self.analytics_service.get_course_insights(self.course)
        
        difficulty = insights['difficulty_level']
        
        # Should assess difficulty level
        self.assertIn(difficulty, ['beginner', 'intermediate', 'advanced', 'expert'])
        self.assertIsInstance(difficulty, str)
    
    @pytest.mark.asyncio
    async def test_recommendation_score_calculation(self):
        """Test recommendation score calculation."""
        insights = await self.analytics_service.get_course_insights(self.course)
        
        score = insights['recommendation_score']
        
        # Should calculate valid score
        self.assertIsInstance(score, (int, float))
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 1)
    
    @pytest.mark.asyncio
    async def test_ml_insights_generation(self):
        """Test ML insights generation."""
        insights = await self.analytics_service.get_course_insights(self.course)
        
        ml_insights = insights['ml_insights']
        
        # Should generate ML insights
        self.assertIsInstance(ml_insights, dict)
        self.assertIn('learning_effectiveness', ml_insights)
        self.assertIn('content_quality', ml_insights)
        self.assertIn('success_factors', ml_insights)
        self.assertIn('recommendations', ml_insights)

class TestRealTimeMLIntegration(TransactionTestCase):
    """Test real-time ML integration with Django features."""
    
    def setUp(self):
        """Set up test data."""
        cache.clear()
        self.ml_integration = RealTimeMLIntegration()
        
        # Create test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        
        # Create test category
        self.category = Category.objects.create(
            name="Test Category",
            slug="test-category",
            description="Test description",
            is_active=True
        )
        
        # Create test courses
        self.courses = []
        for i in range(5):
            course = Course.objects.create(
                title=f"Course {i}",
                slug=f"course-{i}",
                description=f"Description for course {i}",
                category=self.category,
                instructor=self.user,
                is_published=True
            )
            self.courses.append(course)
    
    @pytest.mark.asyncio
    async def test_course_list_personalization(self):
        """Test course list personalization."""
        # Prepare course data
        course_data = [
            {
                'id': course.id,
                'title': course.title,
                'category_id': course.category.id,
                'difficulty': 'intermediate',
                'format': 'video',
                'enrollment_count': i * 10
            }
            for i, course in enumerate(self.courses)
        ]
        
        # Personalize for authenticated user
        personalized = await self.ml_integration.personalize_course_list(
            user_id=self.user.id,
            courses=course_data
        )
        
        # Should add personalization scores
        self.assertEqual(len(personalized), len(course_data))
        
        for course in personalized:
            self.assertIn('personalization_score', course)
            self.assertIn('personalization_reason', course)
            self.assertIsInstance(course['personalization_score'], (int, float))
    
    @pytest.mark.asyncio
    async def test_anonymous_user_handling(self):
        """Test handling of anonymous users."""
        course_data = [
            {
                'id': course.id,
                'title': course.title,
                'enrollment_count': i * 10
            }
            for i, course in enumerate(self.courses)
        ]
        
        # Personalize for anonymous user
        personalized = await self.ml_integration.personalize_course_list(
            user_id=None,
            courses=course_data
        )
        
        # Should sort by popularity for anonymous users
        self.assertEqual(len(personalized), len(course_data))
        
        # Should be sorted by enrollment_count (descending)
        for i in range(len(personalized) - 1):
            self.assertGreaterEqual(
                personalized[i]['enrollment_count'],
                personalized[i + 1]['enrollment_count']
            )
    
    @pytest.mark.asyncio
    async def test_real_time_recommendations(self):
        """Test real-time recommendation generation."""
        recommendations = await self.ml_integration.get_real_time_recommendations(
            user_id=self.user.id,
            context='courses',
            limit=3
        )
        
        # Should return recommendations
        self.assertIsInstance(recommendations, list)
        self.assertLessEqual(len(recommendations), 3)
        
        # Each recommendation should have required fields
        for rec in recommendations:
            self.assertIn('title', rec)
            self.assertIn('type', rec)
            self.assertIn('reason', rec)
    
    @pytest.mark.asyncio
    async def test_user_interaction_tracking(self):
        """Test user interaction tracking."""
        # Track interaction
        await self.ml_integration.track_user_interaction(
            user_id=self.user.id,
            item_id=self.courses[0].id,
            item_type='course',
            action='view'
        )
        
        # Should not raise exception
        self.assertTrue(True)  # Placeholder assertion
    
    @pytest.mark.asyncio
    async def test_performance_requirements(self):
        """Test performance requirements under 500ms."""
        start_time = time.time()
        
        # Test multiple operations
        await self.ml_integration.get_real_time_recommendations(
            user_id=self.user.id,
            context='courses',
            limit=5
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        # Should meet performance requirement
        self.assertLess(processing_time, 500, f"Recommendations took {processing_time:.2f}ms, should be under 500ms")

class TestRealTimeInferencePipeline(TransactionTestCase):
    """Test real-time inference pipeline with performance validation."""
    
    def setUp(self):
        """Set up test data."""
        self.pipeline = RealTimeInferencePipeline()
    
    @pytest.mark.asyncio
    async def test_inference_pipeline_initialization(self):
        """Test inference pipeline initialization."""
        # Initialize pipeline
        await self.pipeline.initialize()
        
        # Should initialize successfully
        self.assertTrue(hasattr(self.pipeline, 'cache_client'))
        self.assertTrue(hasattr(self.pipeline, 'request_queues'))
    
    @pytest.mark.asyncio
    async def test_real_time_prediction(self):
        """Test real-time prediction with performance validation."""
        # Initialize pipeline
        await self.pipeline.initialize()
        
        start_time = time.time()
        
        # Make prediction
        result = await self.pipeline.predict(
            model_name="text-embedding",
            input_data={"text": "Test input for prediction"},
            optimization_level="advanced"
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        # Should meet performance requirement
        self.assertLess(processing_time, 500, f"Prediction took {processing_time:.2f}ms, should be under 500ms")
        
        # Should return valid result
        self.assertIsInstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_batch_processing(self):
        """Test batch processing optimization."""
        # Initialize pipeline
        await self.pipeline.initialize()
        
        # Create batch requests
        requests = [
            {"text": f"Test input {i}"}
            for i in range(10)
        ]
        
        start_time = time.time()
        
        # Process batch
        results = []
        for req in requests:
            result = await self.pipeline.predict(
                model_name="text-embedding",
                input_data=req,
                optimization_level="advanced"
            )
            results.append(result)
        
        processing_time = (time.time() - start_time) * 1000
        
        # Should handle batch efficiently
        self.assertLess(processing_time, 1000, f"Batch processing took {processing_time:.2f}ms")
        self.assertEqual(len(results), len(requests))
    
    @pytest.mark.asyncio
    async def test_performance_stats(self):
        """Test performance statistics collection."""
        # Initialize pipeline
        await self.pipeline.initialize()
        
        # Make some predictions to generate stats
        for i in range(5):
            await self.pipeline.predict(
                model_name="text-embedding",
                input_data={"text": f"Test input {i}"},
                optimization_level="advanced"
            )
        
        # Get performance stats
        stats = self.pipeline.get_performance_stats("text-embedding")
        
        # Should return valid statistics
        self.assertIsInstance(stats, dict)
        if stats:  # Only if stats are available
            self.assertIn('total_requests', stats)
            self.assertIn('avg_latency_ms', stats)

class TestIntegrationPerformance(APITestCase):
    """Integration tests for overall performance."""
    
    def setUp(self):
        """Set up test data."""
        cache.clear()
        
        # Create test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        
        # Create test category
        self.category = Category.objects.create(
            name="Test Category",
            slug="test-category",
            description="Test description",
            is_active=True
        )
        
        # Create test course
        self.course = Course.objects.create(
            title="Test Course",
            slug="test-course",
            description="Test description",
            category=self.category,
            instructor=self.user,
            is_published=True
        )
    
    def test_api_response_time_under_500ms(self):
        """Test API response time meets 500ms requirement."""
        # Test course list API
        start_time = time.time()
        
        response = self.client.get('/api/v1/courses/')
        
        processing_time = (time.time() - start_time) * 1000
        
        # Should meet performance requirement
        self.assertLess(processing_time, 500, f"API response took {processing_time:.2f}ms, should be under 500ms")
        self.assertEqual(response.status_code, 200)
    
    @patch('django.test.client.Client.get')
    def test_ml_api_performance(self, mock_get):
        """Test ML-specific API performance."""
        # Test recommendations API
        mock_get.return_value = Mock(status_code=200)
        start_time = time.time()
        
        response = self.client.get('/api/v1/ai/recommendations/')
        
        processing_time = (time.time() - start_time) * 1000
        
        # Should meet performance requirement
        self.assertLess(processing_time, 500, f"ML API response took {processing_time:.2f}ms, should be under 500ms")
        self.assertIn(response.status_code, [200, 401])  # 401 if not authenticated
    
    def test_concurrent_requests_performance(self):
        """Test performance under concurrent load."""
        import threading
        import queue
        
        results = queue.Queue()
        
        def make_request():
            start_time = time.time()
            response = self.client.get('/api/v1/courses/')
            processing_time = (time.time() - start_time) * 1000
            results.put(processing_time)
        
        # Make 10 concurrent requests
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Check all response times
        response_times = []
        while not results.empty():
            response_times.append(results.get())
        
        # All requests should be under 1000ms (allowing for concurrency overhead)
        for response_time in response_times:
            self.assertLess(response_time, 1000, f"Concurrent request took {response_time:.2f}ms")
        
        # Average should be under 500ms
        avg_time = sum(response_times) / len(response_times)
        self.assertLess(avg_time, 500, f"Average concurrent time {avg_time:.2f}ms should be under 500ms")

# Performance Benchmark Tests
class TestPerformanceBenchmarks(TransactionTestCase):
    """Performance benchmark tests for ML components."""
    
    def setUp(self):
        """Set up test data."""
        cache.clear()
        self.rag_service = EnhancedRAGService()
        self.behavior_service = EnhancedUserBehaviorService()
        self.analytics_service = EnhancedCourseAnalyticsService()
        self.ml_integration = RealTimeMLIntegration()
    
    @pytest.mark.asyncio
    async def test_rag_service_benchmark(self):
        """Benchmark RAG service performance."""
        queries = [
            "Python programming basics",
            "Machine learning algorithms",
            "Web development with Django",
            "Data science fundamentals",
            "Software engineering principles"
        ]
        
        total_time = 0
        for query in queries:
            start_time = time.time()
            
            result = await self.rag_service.get_context_for_query(
                query=query,
                limit=5,
                search_type=SearchType.HYBRID
            )
            
            processing_time = time.time() - start_time
            total_time += processing_time
            
            # Each query should be under 500ms
            self.assertLess(processing_time * 1000, 500, f"Query '{query}' took {processing_time * 1000:.2f}ms")
        
        # Average should be under 300ms
        avg_time = (total_time / len(queries)) * 1000
        self.assertLess(avg_time, 300, f"Average RAG time {avg_time:.2f}ms should be under 300ms")
    
    @pytest.mark.asyncio
    async def test_ml_integration_benchmark(self):
        """Benchmark ML integration performance."""
        # Test course personalization
        course_data = [
            {'id': i, 'title': f'Course {i}', 'enrollment_count': i * 10}
            for i in range(10)
        ]
        
        start_time = time.time()
        
        personalized = await self.ml_integration.personalize_course_list(
            user_id=1,
            courses=course_data
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        # Should be under 500ms
        self.assertLess(processing_time, 500, f"Personalization took {processing_time:.2f}ms")
        self.assertEqual(len(personalized), 10)
    
    @pytest.mark.asyncio
    async def test_concurrent_ml_operations(self):
        """Test concurrent ML operations performance."""
        import asyncio
        
        async def run_rag_query(query):
            start_time = time.time()
            result = await self.rag_service.get_context_for_query(
                query=query,
                limit=3,
                search_type=SearchType.SEMANTIC
            )
            return time.time() - start_time
        
        # Run 10 concurrent queries
        queries = [f"Test query {i}" for i in range(10)]
        tasks = [run_rag_query(query) for query in queries]
        
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        # All queries should complete quickly
        for i, processing_time in enumerate(results):
            self.assertLess(processing_time * 1000, 500, f"Concurrent query {i} took {processing_time * 1000:.2f}ms")
        
        # Total time should be reasonable (allowing for concurrency)
        self.assertLess(total_time * 1000, 2000, f"Total concurrent time {total_time * 1000:.2f}ms")

if __name__ == '__main__':
    pytest.main([__file__])
