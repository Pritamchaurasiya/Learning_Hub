"""
Comprehensive Tests for Core Security and Utility Modules.

Tests for:
- Security middleware
- Input validators
- Caching service
- Error tracking
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from django.test import RequestFactory, TestCase, override_settings
from django.http import JsonResponse
from django.contrib.auth import get_user_model

from apps.core.security_middleware import (
    SecurityHeadersMiddleware,
    SQLInjectionDetectionMiddleware,
    IPAnomalyDetectionMiddleware,
    JWTBlacklistMiddleware,
    sanitize_input,
    validate_uuid,
)
from apps.core.validators import (
    SecurityValidator,
    ThreatType,
    validate_safe_text,
    validate_safe_url,
)
from apps.core.cache_service import (
    CacheService,
    CacheConfig,
    cached,
)
from apps.core.error_tracking import (
    StructuredError,
    ErrorCategory,
    ErrorSeverity,
    RetryConfig,
    retry_on_failure,
    CircuitBreaker,
)

User = get_user_model()


class SecurityHeadersMiddlewareTest(TestCase):
    """Test SecurityHeadersMiddleware."""
    
    def setUp(self):
        from django.http import HttpResponse
        self.factory = RequestFactory()
        self.get_response = Mock(return_value=HttpResponse(status=200))
        self.middleware = SecurityHeadersMiddleware(self.get_response)
    
    def test_adds_csp_header(self):
        """Test CSP header is added."""
        request = self.factory.get('/')
        response = self.middleware(request)
        
        self.assertIn('Content-Security-Policy', response)
        self.assertIn("default-src 'self'", response['Content-Security-Policy'])
    
    def test_adds_xframe_options(self):
        """Test X-Frame-Options header is added."""
        request = self.factory.get('/')
        response = self.middleware(request)
        
        self.assertEqual(response['X-Frame-Options'], 'SAMEORIGIN')
    
    def test_adds_xss_protection(self):
        """Test X-XSS-Protection header is added."""
        request = self.factory.get('/')
        response = self.middleware(request)
        
        self.assertEqual(response['X-XSS-Protection'], '1; mode=block')
    
    def test_adds_content_type_options(self):
        """Test X-Content-Type-Options header is added."""
        request = self.factory.get('/')
        response = self.middleware(request)
        
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')


class SQLInjectionDetectionTest(TestCase):
    """Test SQLInjectionDetectionMiddleware."""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.get_response = Mock(return_value=Mock(status_code=200))
        self.middleware = SQLInjectionDetectionMiddleware(self.get_response)
    
    def test_allows_normal_request(self):
        """Test normal request passes through."""
        request = self.factory.get('/?search=python')
        response = self.middleware(request)
        
        self.assertEqual(response.status_code, 200)
    
    def test_blocks_union_injection(self):
        """Test blocks UNION SELECT injection."""
        request = self.factory.get('/?id=1 UNION SELECT * FROM users')
        response = self.middleware(request)
        
        self.assertEqual(response.status_code, 403)
    
    def test_blocks_or_injection(self):
        """Test blocks OR 1=1 injection."""
        request = self.factory.get("/?id=1' OR '1'='1")
        response = self.middleware(request)
        
        self.assertEqual(response.status_code, 403)
    
    def test_blocks_drop_table(self):
        """Test blocks DROP TABLE injection."""
        request = self.factory.get('/?cmd=DROP TABLE users')
        response = self.middleware(request)
        
        self.assertEqual(response.status_code, 403)


class SecurityValidatorTest(TestCase):
    """Test SecurityValidator class."""
    
    def setUp(self):
        self.validator = SecurityValidator()
    
    def test_validate_text_safe(self):
        """Test safe text passes validation."""
        result = self.validator.validate_text("Hello World")
        self.assertTrue(result.is_safe)
    
    def test_validate_text_xss(self):
        """Test XSS is detected."""
        result = self.validator.validate_text("<script>alert(1)</script>")
        self.assertFalse(result.is_safe)
        self.assertEqual(result.threat_type, ThreatType.XSS)
    
    def test_validate_text_sql(self):
        """Test SQL injection is detected."""
        result = self.validator.validate_text("1; DROP TABLE users--")
        self.assertFalse(result.is_safe)
        self.assertEqual(result.threat_type, ThreatType.SQL_INJECTION)
    
    def test_validate_url_safe(self):
        """Test safe URL passes validation."""
        result = self.validator.validate_url("https://example.com")
        self.assertTrue(result.is_safe)
    
    def test_validate_url_ssrf(self):
        """Test internal URL is blocked."""
        result = self.validator.validate_url("http://127.0.0.1/admin")
        self.assertFalse(result.is_safe)
        self.assertEqual(result.threat_type, ThreatType.SSRF)
    
    def test_validate_path_safe(self):
        """Test safe path passes validation."""
        result = self.validator.validate_path("/uploads/file.pdf")
        self.assertTrue(result.is_safe)
    
    def test_validate_path_traversal(self):
        """Test path traversal is detected."""
        result = self.validator.validate_path("../../etc/passwd")
        self.assertFalse(result.is_safe)
        self.assertEqual(result.threat_type, ThreatType.PATH_TRAVERSAL)


class CacheServiceTest(TestCase):
    """Test CacheService class."""
    
    def tearDown(self):
        CacheService.clear_stats()
    
    @patch('apps.core.cache_service.cache')
    def test_get_from_cache(self, mock_cache):
        """Test getting value from cache."""
        mock_cache.get.return_value = "cached_value"
        
        result = CacheService.get("test_key")
        
        self.assertEqual(result, "cached_value")
        mock_cache.get.assert_called()
    
    @patch('apps.core.cache_service.cache')
    def test_set_to_cache(self, mock_cache):
        """Test setting value in cache."""
        CacheService.set("test_key", "test_value", ttl=300)
        
        mock_cache.set.assert_called_once_with("test_key", "test_value", timeout=300)
    
    @patch('apps.core.cache_service.cache')
    def test_cache_stats(self, mock_cache):
        """Test cache statistics tracking."""
        mock_cache.get.return_value = None  # Miss
        
        CacheService.get("test_key")
        stats = CacheService.get_stats()
        
        self.assertIn('hits', stats)
        self.assertIn('misses', stats)
        self.assertIn('hit_rate_percent', stats)


class ErrorTrackingTest(TestCase):
    """Test Error Tracking module."""
    
    def test_structured_error_creation(self):
        """Test StructuredError creation."""
        error = StructuredError(
            message="Test error",
            code="TEST_ERROR",
            category=ErrorCategory.INTERNAL,
            severity=ErrorSeverity.ERROR,
        )
        
        self.assertEqual(error.message, "Test error")
        self.assertEqual(error.code, "TEST_ERROR")
        self.assertIsNotNone(error.timestamp)
    
    def test_structured_error_to_dict(self):
        """Test StructuredError serialization."""
        error = StructuredError(
            message="Test error",
            code="TEST_ERROR",
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.WARNING,
        )
        
        data = error.to_dict()
        
        self.assertEqual(data['message'], "Test error")
        self.assertEqual(data['code'], "TEST_ERROR")
        self.assertEqual(data['category'], "validation")
        self.assertEqual(data['severity'], "warning")
    
    def test_retry_on_failure_success(self):
        """Test retry decorator with successful call."""
        call_count = 0
        
        @retry_on_failure(RetryConfig(max_retries=3))
        def successful_func():
            nonlocal call_count
            call_count += 1
            return "success"
        
        result = successful_func()
        
        self.assertEqual(result, "success")
        self.assertEqual(call_count, 1)
    
    def test_retry_on_failure_retry(self):
        """Test retry decorator with failures then success."""
        call_count = 0
        
        @retry_on_failure(RetryConfig(max_retries=3, base_delay=0.01))
        def flaky_func():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Temporary failure")
            return "success"
        
        result = flaky_func()
        
        self.assertEqual(result, "success")
        self.assertEqual(call_count, 3)


class UtilityFunctionsTest(TestCase):
    """Test utility functions."""
    
    def test_sanitize_input_escapes_html(self):
        """Test HTML escaping."""
        result = sanitize_input("<script>alert('xss')</script>")
        
        self.assertNotIn('<', result)
        self.assertNotIn('>', result)
        self.assertIn('&lt;', result)
        self.assertIn('&gt;', result)
    
    def test_sanitize_input_empty(self):
        """Test empty input handling."""
        result = sanitize_input("")
        self.assertEqual(result, "")
    
    def test_validate_uuid_valid(self):
        """Test valid UUID."""
        result = validate_uuid("550e8400-e29b-41d4-a716-446655440000")
        self.assertTrue(result)
    
    def test_validate_uuid_invalid(self):
        """Test invalid UUID."""
        result = validate_uuid("not-a-uuid")
        self.assertFalse(result)


class CircuitBreakerTest(TestCase):
    """Test CircuitBreaker pattern."""
    
    @patch('apps.core.error_tracking.cache')
    def test_circuit_closed_on_success(self, mock_cache):
        """Test circuit stays closed on success."""
        mock_cache.get.return_value = 'CLOSED'
        
        breaker = CircuitBreaker('test_service')
        
        @breaker
        def success_func():
            return "success"
        
        result = success_func()
        self.assertEqual(result, "success")
    
    @patch('apps.core.error_tracking.cache')
    def test_circuit_opens_on_failures(self, mock_cache):
        """Test circuit opens after threshold failures."""
        mock_cache.get.side_effect = [
            'CLOSED',  # state check
            0,  # failures count
        ]
        
        breaker = CircuitBreaker('test_service', threshold=2)
        
        @breaker
        def failing_func():
            raise ValueError("Always fails")
        
        with self.assertRaises(ValueError):
            failing_func()


# Run with: pytest apps/core/tests/test_security.py -v
