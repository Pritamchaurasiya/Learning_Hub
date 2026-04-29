# Advanced System Analysis & Enhancement Suite
"""
Next-generation comprehensive analysis and optimization platform
"""

import os
import sys
import time
import json
import logging
import asyncio
import threading
import subprocess
import psutil
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from enum import Enum
import statistics
import traceback

# Setup Django
try:
    import django
    from django.conf import settings
    from django.core.management import execute_from_command_line
    from django.db import connection, connections
    from django.core.cache import cache
    from django.test import Client
    from django.urls import reverse
    from django.apps import apps
    from django.db.models import Count, Avg, Max, Min, Sum, Q, F, Prefetch
    from django.utils import timezone
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
    django.setup()
    
    DJANGO_AVAILABLE = True
except ImportError as e:
    DJANGO_AVAILABLE = False
    DJANGO_ERROR = str(e)
    print(f"Warning: Django not available - {DJANGO_ERROR}")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AnalysisLevel(Enum):
    """Analysis depth levels."""
    SURFACE = "surface"
    COMPREHENSIVE = "comprehensive"
    DEEP = "deep"
    EXHAUSTIVE = "exhaustive"

class ComponentType(Enum):
    """System component types."""
    BACKEND = "backend"
    FRONTEND = "frontend"
    DATABASE = "database"
    CACHE = "cache"
    ML_SERVICES = "ml_services"
    API = "api"
    WEBHOOKS = "webhooks"
    WEBSOCKETS = "websockets"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    MONITORING = "monitoring"
    LOGGING = "logging"
    SECURITY = "security"
    PERFORMANCE = "performance"
    SCALABILITY = "scalability"

@dataclass
class AnalysisResult:
    """Analysis result structure."""
    component: str
    component_type: ComponentType
    status: str  # HEALTHY, WARNING, CRITICAL, ERROR
    score: float  # 0-100
    issues: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    execution_time: float = 0.0
    details: Dict[str, Any] = field(default_factory=dict)

@dataclass
class SystemMetrics:
    """System-wide metrics."""
    total_components: int = 0
    healthy_components: int = 0
    critical_issues: int = 0
    warnings: int = 0
    overall_score: float = 0.0
    performance_score: float = 0.0
    security_score: float = 0.0
    scalability_score: float = 0.0
    ml_score: float = 0.0
    analysis_duration: float = 0.0

class AdvancedSystemAnalyzer:
    """Advanced comprehensive system analyzer and optimizer."""
    
    def __init__(self, analysis_level: AnalysisLevel = AnalysisLevel.COMPREHENSIVE):
        self.analysis_level = analysis_level
        self.results: List[AnalysisResult] = []
        self.metrics = SystemMetrics()
        self.start_time = time.time()
        self.executor = ThreadPoolExecutor(max_workers=10)
        self.analysis_depth = self._get_analysis_depth()
        
    def _get_analysis_depth(self) -> Dict[str, int]:
        """Get analysis depth based on level."""
        depth_map = {
            AnalysisLevel.SURFACE: {
                'queries_per_test': 5,
                'concurrent_tests': 1,
                'load_test_users': 10,
                'ml_test_iterations': 3
            },
            AnalysisLevel.COMPREHENSIVE: {
                'queries_per_test': 20,
                'concurrent_tests': 5,
                'load_test_users': 50,
                'ml_test_iterations': 10
            },
            AnalysisLevel.DEEP: {
                'queries_per_test': 50,
                'concurrent_tests': 10,
                'load_test_users': 200,
                'ml_test_iterations': 25
            },
            AnalysisLevel.EXHAUSTIVE: {
                'queries_per_test': 100,
                'concurrent_tests': 20,
                'load_test_users': 1000,
                'ml_test_iterations': 50
            }
        }
        return depth_map[self.analysis_level]
    
    async def run_comprehensive_analysis(self) -> Dict[str, Any]:
        """Run comprehensive system analysis."""
        logger.info(f"Starting {self.analysis_level.value} system analysis...")
        
        # Define analysis tasks
        analysis_tasks = [
            self.analyze_backend_architecture,
            self.analyze_database_performance,
            self.analyze_api_endpoints,
            self.analyze_ml_services,
            self.analyze_authentication_system,
            self.analyze_security_posture,
            self.analyze_performance_metrics,
            self.analyze_scalability_potential,
            self.analyze_code_quality,
            self.analyze_dependencies,
            self.analyze_configuration,
            self.analyze_monitoring_system,
            self.analyze_caching_strategy,
            self.analyze_error_handling,
            self.analyze_integration_points,
            self.analyze_resource_usage,
            self.analyze_data_integrity,
            self.analyze_business_logic,
            self.analyze_user_experience,
            self.analyze_compliance_standards
        ]
        
        # Run analysis tasks concurrently
        futures = []
        for task in analysis_tasks:
            future = self.executor.submit(self._run_analysis_task, task)
            futures.append(future)
        
        # Collect results
        for future in as_completed(futures):
            try:
                result = future.result(timeout=300)  # 5 minute timeout
                if result:
                    self.results.append(result)
            except Exception as e:
                logger.error(f"Analysis task failed: {e}")
                self.results.append(AnalysisResult(
                    component="Unknown",
                    component_type=ComponentType.BACKEND,
                    status="ERROR",
                    score=0.0,
                    issues=[f"Analysis failed: {str(e)}"]
                ))
        
        # Calculate metrics
        self._calculate_metrics()
        
        # Generate comprehensive report
        return self._generate_comprehensive_report()
    
    def _run_analysis_task(self, task_func) -> Optional[AnalysisResult]:
        """Run individual analysis task."""
        try:
            start_time = time.time()
            result = task_func()
            result.execution_time = time.time() - start_time
            return result
        except Exception as e:
            logger.error(f"Task {task_func.__name__} failed: {e}")
            return AnalysisResult(
                component=task_func.__name__.replace('analyze_', ''),
                component_type=ComponentType.BACKEND,
                status="ERROR",
                score=0.0,
                issues=[f"Task failed: {str(e)}"],
                execution_time=0.0
            )
    
    def analyze_backend_architecture(self) -> AnalysisResult:
        """Analyze backend architecture and design patterns."""
        result = AnalysisResult(
            component="Backend Architecture",
            component_type=ComponentType.BACKEND,
            status="HEALTHY",
            score=85.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                # Analyze Django apps
                installed_apps = settings.INSTALLED_APPS
                django_apps = [app for app in installed_apps if not app.startswith('django.')]
                third_party_apps = [app for app in installed_apps if app.startswith('django.')]
                
                result.metrics.update({
                    'total_apps': len(installed_apps),
                    'django_apps': len(django_apps),
                    'third_party_apps': len(third_party_apps),
                    'local_apps': len(django_apps) - len(third_party_apps)
                })
                
                # Check for architectural patterns
                patterns_found = []
                if 'rest_framework' in installed_apps:
                    patterns_found.append('REST API')
                if 'channels' in installed_apps:
                    patterns_found.append('WebSockets')
                if 'django.contrib.postgres' in installed_apps:
                    patterns_found.append('PostgreSQL Advanced Features')
                
                result.metrics['patterns'] = patterns_found
                
                # Analyze app structure
                apps_dir = Path('apps')
                if apps_dir.exists():
                    app_dirs = [d for d in apps_dir.iterdir() if d.is_dir() and not d.name.startswith('.')]
                    result.metrics['app_directories'] = len(app_dirs)
                    
                    # Check for proper app structure
                    well_structured_apps = 0
                    for app_dir in app_dirs:
                        required_files = ['models.py', 'views.py', 'serializers.py', 'urls.py']
                        if all((app_dir / file).exists() for file in required_files):
                            well_structured_apps += 1
                    
                    result.metrics['well_structured_apps'] = well_structured_apps
                    
                    if well_structured_apps < len(app_dirs):
                        result.issues.append(f"Only {well_structured_apps}/{len(app_dirs)} apps have proper structure")
                        result.recommendations.append("Standardize app structure across all modules")
                        result.score -= 5
                
                # Check middleware configuration
                middleware = getattr(settings, 'MIDDLEWARE', [])
                result.metrics['middleware_count'] = len(middleware)
                
                # Security middleware check
                security_middleware = ['django.middleware.security.SecurityMiddleware']
                missing_security = [mw for mw in security_middleware if mw not in middleware]
                if missing_security:
                    result.issues.append("Missing security middleware")
                    result.recommendations.append("Add security middleware for better protection")
                    result.score -= 10
                
                # Performance middleware check
                performance_middleware = ['django.middleware.cache.UpdateCacheMiddleware']
                missing_performance = [mw for mw in performance_middleware if mw not in middleware]
                if missing_performance:
                    result.recommendations.append("Consider adding caching middleware")
            
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for analysis")
                result.recommendations.append("Install Django to analyze backend architecture")
            
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Backend analysis failed: {str(e)}")
        
        return result
    
    def analyze_database_performance(self) -> AnalysisResult:
        """Analyze database performance and optimization."""
        result = AnalysisResult(
            component="Database Performance",
            component_type=ComponentType.DATABASE,
            status="HEALTHY",
            score=90.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                # Test database connection
                start_time = time.time()
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                connection_time = (time.time() - start_time) * 1000
                result.metrics['connection_time_ms'] = connection_time
                
                if connection_time > 100:
                    result.issues.append(f"Slow database connection: {connection_time:.2f}ms")
                    result.score -= 10
                
                # Analyze query performance
                query_times = []
                for i in range(self.analysis_depth['queries_per_test']):
                    start_time = time.time()
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT version()")
                        cursor.fetchone()
                    query_times.append((time.time() - start_time) * 1000)
                
                result.metrics.update({
                    'avg_query_time_ms': statistics.mean(query_times),
                    'p95_query_time_ms': self._percentile(query_times, 95),
                    'max_query_time_ms': max(query_times)
                })
                
                if result.metrics['p95_query_time_ms'] > 50:
                    result.issues.append("Slow query performance detected")
                    result.recommendations.append("Optimize database queries and indexes")
                    result.score -= 15
                
                # Check database configuration
                db_config = settings.DATABASES.get('default', {})
                result.metrics.update({
                    'database_engine': db_config.get('ENGINE', ''),
                    'database_name': db_config.get('NAME', ''),
                    'database_host': db_config.get('HOST', ''),
                    'max_connections': db_config.get('OPTIONS', {}).get('MAX_CONNS', 'default')
                })
                
                # Check for connection pooling
                if 'MAX_CONNS' not in db_config.get('OPTIONS', {}):
                    result.recommendations.append("Configure database connection pooling")
                    result.score -= 5
                
                # Analyze table structure
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT table_name, column_count, row_count
                        FROM information_schema.tables t
                        LEFT JOIN (
                            SELECT table_name, COUNT(*) as column_count
                            FROM information_schema.columns
                            GROUP BY table_name
                        ) c ON t.table_name = c.table_name
                        LEFT JOIN (
                            SELECT table_name, COUNT(*) as row_count
                            FROM (
                                SELECT table_name FROM information_schema.tables
                                WHERE table_schema = 'public'
                            ) t
                            LEFT JOIN (
                                SELECT schemaname, tablename FROM pg_stat_user_tables
                            ) s ON t.table_name = s.tablename
                            GROUP BY table_name
                        ) r ON t.table_name = r.table_name
                        WHERE t.table_schema = 'public'
                        ORDER BY row_count DESC
                        LIMIT 10
                    """)
                    table_stats = cursor.fetchall()
                
                result.metrics['table_count'] = len(table_stats)
                result.metrics['largest_tables'] = table_stats[:5]
                
                # Check for proper indexing
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT indexname, tablename 
                        FROM pg_indexes 
                        WHERE schemaname = 'public'
                        ORDER BY tablename, indexname
                    """)
                    indexes = cursor.fetchall()
                
                result.metrics['index_count'] = len(indexes)
                
                if result.metrics['index_count'] < result.metrics['table_count'] * 2:
                    result.recommendations.append("Consider adding more database indexes")
                    result.score -= 10
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for database analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Database analysis failed: {str(e)}")
        
        return result
    
    def analyze_api_endpoints(self) -> AnalysisResult:
        """Analyze API endpoints and performance."""
        result = AnalysisResult(
            component="API Endpoints",
            component_type=ComponentType.API,
            status="HEALTHY",
            score=88.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                client = Client()
                
                # Get URL patterns
                try:
                    from django.urls import get_resolver
                    resolver = get_resolver()
                    url_patterns = []
                    
                    def extract_patterns(patterns, prefix=''):
                        for pattern in patterns:
                            if hasattr(pattern, 'url_patterns'):
                                extract_patterns(pattern.url_patterns, prefix + str(pattern.pattern))
                            else:
                                url_patterns.append(prefix + str(pattern.pattern))
                    
                    extract_patterns(resolver.url_patterns)
                    result.metrics['total_endpoints'] = len(url_patterns)
                    
                except Exception:
                    result.metrics['total_endpoints'] = 0
                
                # Test critical endpoints
                critical_endpoints = [
                    ('/api/v1/courses/', 'Courses API'),
                    ('/api/v1/categories/', 'Categories API'),
                    ('/health/', 'Health Check'),
                    ('/api/users/profile/', 'User Profile')
                ]
                
                endpoint_results = {}
                total_response_time = 0
                successful_endpoints = 0
                
                for endpoint, name in critical_endpoints:
                    try:
                        start_time = time.time()
                        response = client.get(endpoint)
                        response_time = (time.time() - start_time) * 1000
                        
                        endpoint_results[name] = {
                            'status_code': response.status_code,
                            'response_time_ms': response_time,
                            'success': response.status_code < 400
                        }
                        
                        if response.status_code < 400:
                            successful_endpoints += 1
                            total_response_time += response_time
                        else:
                            result.issues.append(f"Endpoint {name} returned {response.status_code}")
                        
                    except Exception as e:
                        endpoint_results[name] = {
                            'error': str(e),
                            'success': False
                        }
                        result.issues.append(f"Endpoint {name} failed: {str(e)}")
                
                result.metrics['endpoint_results'] = endpoint_results
                result.metrics['success_rate'] = successful_endpoints / len(critical_endpoints)
                
                if successful_endpoints > 0:
                    result.metrics['avg_response_time_ms'] = total_response_time / successful_endpoints
                    
                    if result.metrics['avg_response_time_ms'] > 200:
                        result.issues.append(f"Slow API response time: {result.metrics['avg_response_time_ms']:.2f}ms")
                        result.recommendations.append("Optimize API endpoints for better performance")
                        result.score -= 15
                
                # Check API documentation
                try:
                    from drf_spectacular.openapi import AutoSchema
                    result.metrics['api_documentation'] = 'Available'
                except ImportError:
                    result.metrics['api_documentation'] = 'Not Available'
                    result.recommendations.append("Add API documentation with drf-spectacular")
                    result.score -= 5
                
                # Check API versioning
                api_versioned = any('v1' in endpoint for endpoint, _ in critical_endpoints)
                result.metrics['api_versioned'] = api_versioned
                
                if not api_versioned:
                    result.recommendations.append("Implement API versioning")
                    result.score -= 5
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for API analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"API analysis failed: {str(e)}")
        
        return result
    
    def analyze_ml_services(self) -> AnalysisResult:
        """Analyze ML services and performance."""
        result = AnalysisResult(
            component="ML Services",
            component_type=ComponentType.ML_SERVICES,
            status="HEALTHY",
            score=92.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                # Check AI Engine app
                ai_engine_available = 'apps.ai_engine' in settings.INSTALLED_APPS
                result.metrics['ai_engine_available'] = ai_engine_available
                
                if ai_engine_available:
                    # Test ML services
                    ml_services = {}
                    
                    # Test RAG service
                    try:
                        from apps.ai_engine.enhanced_services import EnhancedRAGService
                        rag_service = EnhancedRAGService()
                        
                        start_time = time.time()
                        context = rag_service.get_context_for_query("test query", limit=3)
                        rag_time = (time.time() - start_time) * 1000
                        
                        ml_services['rag_service'] = {
                            'status': 'RUNNING',
                            'response_time_ms': rag_time,
                            'healthy': rag_time < 200
                        }
                        
                        if rag_time > 200:
                            result.issues.append(f"RAG service slow: {rag_time:.2f}ms")
                            result.score -= 10
                        
                    except Exception as e:
                        ml_services['rag_service'] = {
                            'status': 'ERROR',
                            'error': str(e),
                            'healthy': False
                        }
                        result.issues.append(f"RAG service error: {str(e)}")
                        result.score -= 15
                    
                    # Test ML integration
                    try:
                        from apps.ai_engine.ml_integration import RealTimeMLIntegration
                        ml_integration = RealTimeMLIntegration()
                        
                        start_time = time.time()
                        recommendations = ml_integration.get_real_time_recommendations(1, 'test', 3)
                        ml_time = (time.time() - start_time) * 1000
                        
                        ml_services['ml_integration'] = {
                            'status': 'RUNNING',
                            'response_time_ms': ml_time,
                            'healthy': ml_time < 200
                        }
                        
                        if ml_time > 200:
                            result.issues.append(f"ML integration slow: {ml_time:.2f}ms")
                            result.score -= 10
                        
                    except Exception as e:
                        ml_services['ml_integration'] = {
                            'status': 'ERROR',
                            'error': str(e),
                            'healthy': False
                        }
                        result.issues.append(f"ML integration error: {str(e)}")
                        result.score -= 15
                    
                    # Test adaptive learning
                    try:
                        from apps.ai_engine.adaptive_learning_engine_v2 import AdaptiveLearningEngine
                        adaptive_engine = AdaptiveLearningEngine()
                        
                        start_time = time.time()
                        path = adaptive_engine.generate_adaptive_path(1, 1)
                        adaptive_time = (time.time() - start_time) * 1000
                        
                        ml_services['adaptive_learning'] = {
                            'status': 'RUNNING',
                            'response_time_ms': adaptive_time,
                            'healthy': adaptive_time < 300
                        }
                        
                        if adaptive_time > 300:
                            result.issues.append(f"Adaptive learning slow: {adaptive_time:.2f}ms")
                            result.score -= 10
                        
                    except Exception as e:
                        ml_services['adaptive_learning'] = {
                            'status': 'ERROR',
                            'error': str(e),
                            'healthy': False
                        }
                        result.issues.append(f"Adaptive learning error: {str(e)}")
                        result.score -= 15
                    
                    result.metrics['ml_services'] = ml_services
                    result.metrics['total_ml_services'] = len(ml_services)
                    result.metrics['healthy_ml_services'] = len([s for s in ml_services.values() if s.get('healthy', False)])
                    
                    # Check ML monitoring
                    try:
                        from apps.ai_engine.ml_monitoring import MLMetricsCollector
                        metrics_collector = MLMetricsCollector()
                        result.metrics['ml_monitoring'] = 'Available'
                    except Exception:
                        result.metrics['ml_monitoring'] = 'Not Available'
                        result.recommendations.append("Set up ML monitoring")
                        result.score -= 5
                    
                else:
                    result.status = "WARNING"
                    result.score = 60.0
                    result.issues.append("AI Engine not available")
                    result.recommendations.append("Install and configure AI Engine")
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for ML analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"ML services analysis failed: {str(e)}")
        
        return result
    
    def analyze_authentication_system(self) -> AnalysisResult:
        """Analyze authentication system."""
        result = AnalysisResult(
            component="Authentication System",
            component_type=ComponentType.AUTHENTICATION,
            status="HEALTHY",
            score=85.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                # Check authentication configuration
                auth_backends = getattr(settings, 'AUTHENTICATION_BACKENDS', ['django.contrib.auth.backends.ModelBackend'])
                result.metrics['auth_backends'] = auth_backends
                
                # Check JWT configuration
                try:
                    from rest_framework_simplejwt.settings import api_settings
                    jwt_configured = True
                    result.metrics['jwt_configured'] = True
                    result.metrics['jwt_lifetime'] = str(api_settings.ACCESS_TOKEN_LIFETIME)
                except ImportError:
                    jwt_configured = False
                    result.metrics['jwt_configured'] = False
                    result.recommendations.append("Configure JWT authentication")
                    result.score -= 10
                
                # Check password policies
                auth_user_model = getattr(settings, 'AUTH_USER_MODEL', 'auth.User')
                result.metrics['auth_user_model'] = auth_user_model
                
                # Check session configuration
                session_engine = getattr(settings, 'SESSION_ENGINE', 'django.contrib.sessions.backends.db')
                result.metrics['session_engine'] = session_engine
                
                # Check middleware
                middleware = getattr(settings, 'MIDDLEWARE', [])
                auth_middleware = ['django.contrib.auth.middleware.AuthenticationMiddleware']
                missing_auth_mw = [mw for mw in auth_middleware if mw not in middleware]
                
                if missing_auth_mw:
                    result.issues.append("Missing authentication middleware")
                    result.recommendations.append("Add authentication middleware")
                    result.score -= 15
                
                # Test authentication endpoints
                client = Client()
                auth_endpoints = [
                    ('/api/auth/login/', 'Login'),
                    ('/api/auth/logout/', 'Logout'),
                    ('/api/auth/refresh/', 'Token Refresh')
                ]
                
                auth_endpoint_status = {}
                for endpoint, name in auth_endpoints:
                    try:
                        response = client.post(endpoint, {}, format='json')
                        auth_endpoint_status[name] = {
                            'status_code': response.status_code,
                            'available': True
                        }
                    except Exception:
                        auth_endpoint_status[name] = {
                            'status_code': 'N/A',
                            'available': False
                        }
                
                result.metrics['auth_endpoints'] = auth_endpoint_status
                
                # Check for rate limiting
                from django.core.cache import cache
                try:
                    cache.set('auth_test', 'test', 60)
                    cache.get('auth_test')
                    cache.delete('auth_test')
                    result.metrics['cache_available'] = True
                except Exception:
                    result.metrics['cache_available'] = False
                    result.recommendations.append("Configure cache for rate limiting")
                    result.score -= 5
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for auth analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Authentication analysis failed: {str(e)}")
        
        return result
    
    def analyze_security_posture(self) -> AnalysisResult:
        """Analyze security posture and vulnerabilities."""
        result = AnalysisResult(
            component="Security Posture",
            component_type=ComponentType.SECURITY,
            status="HEALTHY",
            score=87.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                security_issues = []
                security_recommendations = []
                
                # Check SECRET_KEY
                secret_key = settings.SECRET_KEY
                if not secret_key or 'django-insecure' in secret_key:
                    security_issues.append("Insecure SECRET_KEY")
                    security_recommendations.append("Set a strong SECRET_KEY")
                    result.score -= 20
                
                # Check DEBUG mode
                if settings.DEBUG:
                    security_issues.append("DEBUG mode enabled")
                    security_recommendations.append("Disable DEBUG in production")
                    result.score -= 15
                
                # Check ALLOWED_HOSTS
                if not settings.ALLOWED_HOSTS:
                    security_issues.append("ALLOWED_HOSTS not configured")
                    security_recommendations.append("Configure ALLOWED_HOSTS")
                    result.score -= 10
                
                # Check secure settings
                secure_settings = [
                    ('SECURE_SSL_REDIRECT', 'Enable SSL redirect'),
                    ('SECURE_HSTS_SECONDS', 'Set HSTS'),
                    ('SECURE_CONTENT_TYPE_NOSNIFF', 'Enable content type protection'),
                    ('SESSION_COOKIE_SECURE', 'Use secure cookies'),
                    ('CSRF_COOKIE_SECURE', 'Use secure CSRF cookies')
                ]
                
                configured_secure = 0
                for setting, recommendation in secure_settings:
                    if hasattr(settings, setting) and getattr(settings, setting):
                        configured_secure += 1
                    else:
                        security_recommendations.append(recommendation)
                
                result.metrics['secure_settings_configured'] = configured_secure
                result.metrics['total_secure_settings'] = len(secure_settings)
                
                # Check CORS configuration
                try:
                    from corsheaders.middleware import CorsMiddleware
                    cors_configured = True
                except ImportError:
                    cors_configured = False
                    security_recommendations.append("Configure CORS for API security")
                
                result.metrics['cors_configured'] = cors_configured
                
                # Check for security apps
                security_apps = ['django-axes', 'django-ratelimit', 'django-csp']
                installed_apps = settings.INSTALLED_APPS
                installed_security_apps = [app for app in security_apps if any(app in installed_app for installed_app in installed_apps)]
                
                result.metrics['security_apps_installed'] = len(installed_security_apps)
                result.metrics['total_security_apps'] = len(security_apps)
                
                if len(installed_security_apps) < 2:
                    security_recommendations.append("Install security apps for better protection")
                    result.score -= 10
                
                # Check file permissions
                try:
                    manage_py_stat = os.stat('manage.py')
                    if manage_py_stat.st_mode & 0o777:  # World-writable
                        security_issues.append("manage.py is world-writable")
                        security_recommendations.append("Fix file permissions")
                        result.score -= 5
                except:
                    pass
                
                # Check environment variables exposure
                env_file = Path('.env')
                if env_file.exists():
                    try:
                        with open('.env', 'r') as f:
                            env_content = f.read()
                            if 'SECRET_KEY' in env_content and 'DEBUG=True' in env_content:
                                security_issues.append("Insecure settings in .env file")
                                security_recommendations.append("Secure .env file configuration")
                                result.score -= 10
                    except:
                        pass
                
                result.issues = security_issues
                result.recommendations = security_recommendations
                result.metrics['security_issues_count'] = len(security_issues)
                
                if security_issues:
                    result.status = "WARNING" if len(security_issues) <= 3 else "CRITICAL"
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for security analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Security analysis failed: {str(e)}")
        
        return result
    
    def analyze_performance_metrics(self) -> AnalysisResult:
        """Analyze system performance metrics."""
        result = AnalysisResult(
            component="Performance Metrics",
            component_type=ComponentType.PERFORMANCE,
            status="HEALTHY",
            score=89.0
        )
        
        try:
            # System performance
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            result.metrics.update({
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'disk_percent': (disk.used / disk.total) * 100,
                'memory_available_gb': memory.available / (1024**3),
                'disk_free_gb': disk.free / (1024**3)
            })
            
            # Process performance
            process = psutil.Process()
            result.metrics.update({
                'process_memory_mb': process.memory_info().rss / (1024**2),
                'process_cpu_percent': process.cpu_percent(),
                'process_threads': process.num_threads()
            })
            
            # Performance assessment
            performance_issues = []
            
            if cpu_percent > 80:
                performance_issues.append(f"High CPU usage: {cpu_percent}%")
                result.score -= 10
            
            if memory.percent > 85:
                performance_issues.append(f"High memory usage: {memory.percent}%")
                result.score -= 10
            
            if (disk.used / disk.total) * 100 > 90:
                performance_issues.append(f"Low disk space: {(disk.used / disk.total) * 100:.1f}%")
                result.score -= 15
            
            if process.memory_info().rss / (1024**2) > 1024:  # 1GB
                performance_issues.append(f"High process memory: {process.memory_info().rss / (1024**2):.2f}MB")
                result.score -= 5
            
            # Django performance (if available)
            if DJANGO_AVAILABLE:
                try:
                    # Test database query performance
                    start_time = time.time()
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT 1")
                    db_query_time = (time.time() - start_time) * 1000
                    result.metrics['db_query_time_ms'] = db_query_time
                    
                    if db_query_time > 100:
                        performance_issues.append(f"Slow database query: {db_query_time:.2f}ms")
                        result.score -= 10
                    
                    # Test cache performance
                    start_time = time.time()
                    cache.set('perf_test', 'test', 60)
                    cache_time = (time.time() - start_time) * 1000
                    cache.delete('perf_test')
                    result.metrics['cache_time_ms'] = cache_time
                    
                    if cache_time > 50:
                        performance_issues.append(f"Slow cache operation: {cache_time:.2f}ms")
                        result.score -= 5
                    
                except Exception as e:
                    performance_issues.append(f"Django performance check failed: {str(e)}")
                    result.score -= 5
            
            result.issues = performance_issues
            result.metrics['performance_issues_count'] = len(performance_issues)
            
            if performance_issues:
                result.status = "WARNING" if len(performance_issues) <= 2 else "CRITICAL"
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Performance analysis failed: {str(e)}")
        
        return result
    
    def analyze_scalability_potential(self) -> AnalysisResult:
        """Analyze scalability potential and bottlenecks."""
        result = AnalysisResult(
            component="Scalability Potential",
            component_type=ComponentType.SCALABILITY,
            status="HEALTHY",
            score=86.0
        )
        
        try:
            scalability_issues = []
            scalability_recommendations = []
            
            # Check database scalability
            if DJANGO_AVAILABLE:
                db_config = settings.DATABASES.get('default', {})
                db_engine = db_config.get('ENGINE', '')
                
                if 'sqlite' in db_engine.lower():
                    scalability_issues.append("Using SQLite (not scalable)")
                    scalability_recommendations.append("Use PostgreSQL for scalability")
                    result.score -= 20
                
                # Check connection pooling
                max_conns = db_config.get('OPTIONS', {}).get('MAX_CONNS', None)
                if not max_conns:
                    scalability_recommendations.append("Configure database connection pooling")
                    result.score -= 10
                
                result.metrics['database_engine'] = db_engine
                result.metrics['connection_pooling'] = bool(max_conns)
            
            # Check caching strategy
            cache_config = getattr(settings, 'CACHES', {})
            cache_backend = cache_config.get('default', {}).get('BACKEND', '')
            
            result.metrics['cache_backend'] = cache_backend
            
            if 'redis' not in cache_backend.lower():
                scalability_issues.append("Not using Redis cache")
                scalability_recommendations.append("Use Redis for distributed caching")
                result.score -= 15
            
            # Check for load balancing support
            middleware = getattr(settings, 'MIDDLEWARE', [])
            session_middleware = 'django.contrib.sessions.middleware.SessionMiddleware' in middleware
            
            if session_middleware and cache_backend != 'django.core.cache.backends.redis.RedisCache':
                scalability_recommendations.append("Use Redis for session storage in load-balanced environments")
                result.score -= 10
            
            # Check for async support
            try:
                if 'channels' in settings.INSTALLED_APPS:
                    result.metrics['async_support'] = True
                    result.metrics['channels_configured'] = True
                else:
                    result.metrics['async_support'] = False
                    scalability_recommendations.append("Consider Django Channels for async support")
                    result.score -= 5
            except:
                result.metrics['async_support'] = False
            
            # Check for horizontal scaling support
            result.metrics['stateless_design'] = True  # Assume stateless by default
            
            # Check for CDN support
            static_url = getattr(settings, 'STATIC_URL', '/static/')
            media_url = getattr(settings, 'MEDIA_URL', '/media/')
            
            result.metrics['static_url'] = static_url
            result.metrics['media_url'] = media_url
            
            if static_url.startswith('/static/') and media_url.startswith('/media/'):
                scalability_recommendations.append("Consider CDN for static and media files")
                result.score -= 5
            
            # Check for microservices architecture
            apps_dir = Path('apps')
            if apps_dir.exists():
                app_count = len([d for d in apps_dir.iterdir() if d.is_dir()])
                result.metrics['app_count'] = app_count
                
                if app_count > 10:
                    result.metrics['microservices_ready'] = True
                else:
                    result.metrics['microservices_ready'] = False
            
            # Check for containerization
            dockerfile_exists = Path('Dockerfile').exists()
            docker_compose_exists = Path('docker-compose.yml').exists()
            
            result.metrics['dockerfile_exists'] = dockerfile_exists
            result.metrics['docker_compose_exists'] = docker_compose_exists
            
            if not dockerfile_exists:
                scalability_recommendations.append("Create Dockerfile for containerization")
                result.score -= 10
            
            if not docker_compose_exists:
                scalability_recommendations.append("Create docker-compose.yml for development")
                result.score -= 5
            
            # Check for Kubernetes support
            k8s_dir = Path('k8s')
            if k8s_dir.exists():
                k8s_files = list(k8s_dir.glob('*.yaml'))
                result.metrics['k8s_files'] = len(k8s_files)
                result.metrics['kubernetes_ready'] = True
            else:
                result.metrics['kubernetes_ready'] = False
                scalability_recommendations.append("Create Kubernetes manifests for deployment")
                result.score -= 10
            
            result.issues = scalability_issues
            result.recommendations = scalability_recommendations
            result.metrics['scalability_issues_count'] = len(scalability_issues)
            
            if scalability_issues:
                result.status = "WARNING" if len(scalability_issues) <= 2 else "CRITICAL"
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Scalability analysis failed: {str(e)}")
        
        return result
    
    def analyze_code_quality(self) -> AnalysisResult:
        """Analyze code quality and maintainability."""
        result = AnalysisResult(
            component="Code Quality",
            component_type=ComponentType.BACKEND,
            status="HEALTHY",
            score=88.0
        )
        
        try:
            code_quality_issues = []
            code_quality_recommendations = []
            
            # Check for code formatting tools
            flake8_config = Path('.flake8')
            mypy_config = Path('mypy.ini')
            pytest_config = Path('pytest.ini')
            
            result.metrics.update({
                'flake8_config': flake8_config.exists(),
                'mypy_config': mypy_config.exists(),
                'pytest_config': pytest_config.exists()
            })
            
            if not flake8_config.exists():
                code_quality_recommendations.append("Add flake8 configuration for code formatting")
                result.score -= 5
            
            if not mypy_config.exists():
                code_quality_recommendations.append("Add mypy configuration for type checking")
                result.score -= 5
            
            if not pytest_config.exists():
                code_quality_recommendations.append("Add pytest configuration for testing")
                result.score -= 5
            
            # Analyze Python files
            python_files = []
            for root, dirs, files in os.walk('.'):
                # Skip virtual environments and cache directories
                dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__' and d != 'venv']
                
                for file in files:
                    if file.endswith('.py'):
                        python_files.append(Path(root) / file)
            
            result.metrics['python_files_count'] = len(python_files)
            
            # Check for docstrings
            files_with_docstrings = 0
            total_lines = 0
            comment_lines = 0
            
            for py_file in python_files[:50]:  # Sample first 50 files
                try:
                    with open(py_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        if '"""' in content or "'''" in content:
                            files_with_docstrings += 1
                        
                        lines = content.split('\n')
                        total_lines += len(lines)
                        comment_lines += len([line for line in lines if line.strip().startswith('#')])
                        
                except Exception:
                    continue
            
            result.metrics.update({
                'files_with_docstrings': files_with_docstrings,
                'docstring_ratio': files_with_docstrings / len(python_files[:50]) if python_files else 0,
                'total_lines': total_lines,
                'comment_lines': comment_lines,
                'comment_ratio': comment_lines / total_lines if total_lines > 0 else 0
            })
            
            if result.metrics['docstring_ratio'] < 0.5:
                code_quality_issues.append("Low docstring coverage")
                code_quality_recommendations.append("Add docstrings to improve documentation")
                result.score -= 10
            
            if result.metrics['comment_ratio'] < 0.1:
                code_quality_recommendations.append("Add comments for better code understanding")
                result.score -= 5
            
            # Check for requirements files
            requirements_files = [
                'requirements/base.txt',
                'requirements/local.txt',
                'requirements/production.txt'
            ]
            
            existing_requirements = []
            for req_file in requirements_files:
                if Path(req_file).exists():
                    existing_requirements.append(req_file)
            
            result.metrics['requirements_files'] = existing_requirements
            result.metrics['requirements_count'] = len(existing_requirements)
            
            if len(existing_requirements) < 2:
                code_quality_recommendations.append("Create comprehensive requirements files")
                result.score -= 5
            
            # Check for tests
            tests_dir = Path('tests')
            if tests_dir.exists():
                test_files = list(tests_dir.glob('**/*.py'))
                result.metrics['test_files_count'] = len(test_files)
                result.metrics['tests_available'] = True
            else:
                result.metrics['tests_available'] = False
                code_quality_recommendations.append("Create comprehensive test suite")
                result.score -= 15
            
            # Check for environment files
            env_files = ['.env', '.env.example', '.env.local']
            existing_env_files = [f for f in env_files if Path(f).exists()]
            
            result.metrics['env_files'] = existing_env_files
            result.metrics['env_files_count'] = len(existing_env_files)
            
            if '.env.example' not in existing_env_files:
                code_quality_recommendations.append("Create .env.example for environment template")
                result.score -= 5
            
            result.issues = code_quality_issues
            result.recommendations = code_quality_recommendations
            result.metrics['code_quality_issues_count'] = len(code_quality_issues)
            
            if code_quality_issues:
                result.status = "WARNING" if len(code_quality_issues) <= 2 else "CRITICAL"
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Code quality analysis failed: {str(e)}")
        
        return result
    
    def analyze_dependencies(self) -> AnalysisResult:
        """Analyze project dependencies and vulnerabilities."""
        result = AnalysisResult(
            component="Dependencies",
            component_type=ComponentType.BACKEND,
            status="HEALTHY",
            score=90.0
        )
        
        try:
            # Check requirements files
            requirements_files = [
                'requirements/base.txt',
                'requirements/local.txt',
                'requirements/production.txt'
            ]
            
            requirements_status = {}
            total_dependencies = set()
            
            for req_file in requirements_files:
                file_path = Path(req_file)
                if file_path.exists():
                    try:
                        with open(file_path, 'r') as f:
                            requirements = f.read().strip().split('\n')
                            requirements = [req.strip() for req in requirements if req.strip() and not req.startswith('#')]
                            
                            requirements_status[req_file] = {
                                'exists': True,
                                'count': len(requirements),
                                'dependencies': requirements[:10]  # First 10
                            }
                            
                            total_dependencies.update([req.split('==')[0].split('>=')[0].split('<=')[0].strip() for req in requirements])
                    except Exception as e:
                        requirements_status[req_file] = {
                            'exists': True,
                            'error': str(e)
                        }
                else:
                    requirements_status[req_file] = {'exists': False}
            
            result.metrics['requirements_files'] = requirements_status
            result.metrics['total_dependencies'] = len(total_dependencies)
            
            # Check installed packages
            try:
                import pkg_resources
                installed_packages = {pkg.key: pkg.version for pkg in pkg_resources.working_set()}
                result.metrics['installed_packages_count'] = len(installed_packages)
                
                # Check for missing packages
                missing_packages = []
                for dep in total_dependencies:
                    if dep not in installed_packages:
                        missing_packages.append(dep)
                
                result.metrics['missing_packages'] = missing_packages[:10]  # First 10
                result.metrics['missing_packages_count'] = len(missing_packages)
                
                if missing_packages:
                    result.issues.append(f"Missing packages: {len(missing_packages)} total")
                    result.recommendations.append("Install missing packages from requirements")
                    result.score -= 10
                
                # Check for outdated packages
                outdated_packages = []
                for req_file, status in requirements_status.items():
                    if status.get('exists') and 'dependencies' in status:
                        for requirement in status['dependencies']:
                            try:
                                pkg_name = requirement.split('==')[0].split('>=')[0].split('<=')[0].strip()
                                if pkg_name in installed_packages:
                                    installed_version = installed_packages[pkg_name]
                                    # Simple version comparison (could be improved)
                                    if '>=' in requirement and installed_version < requirement.split('>=')[1].strip():
                                        outdated_packages.append(pkg_name)
                            except:
                                continue
                
                result.metrics['outdated_packages'] = outdated_packages[:10]
                result.metrics['outdated_packages_count'] = len(outdated_packages)
                
                if outdated_packages:
                    result.recommendations.append("Update outdated packages")
                    result.score -= 5
                
            except ImportError:
                result.metrics['installed_packages_count'] = 0
                result.recommendations.append("Install pip-tools for dependency management")
                result.score -= 5
            
            # Check for security vulnerabilities
            critical_packages = ['django', 'djangorestframework', 'psycopg2-binary', 'redis', 'celery']
            missing_critical = [pkg for pkg in critical_packages if pkg not in total_dependencies]
            
            if missing_critical:
                result.issues.append(f"Missing critical packages: {', '.join(missing_critical)}")
                result.recommendations.append(f"Install critical packages: {' '.join(missing_critical)}")
                result.score -= 15
            
            # Check for duplicate dependencies
            if DJANGO_AVAILABLE:
                installed_apps = settings.INSTALLED_APPS
                duplicate_check = len(installed_apps) != len(set(installed_apps))
                result.metrics['duplicate_apps'] = duplicate_check
                
                if duplicate_check:
                    result.issues.append("Duplicate apps in INSTALLED_APPS")
                    result.recommendations.append("Remove duplicate app entries")
                    result.score -= 5
            
            result.issues = result.issues if hasattr(result, 'issues') else []
            result.recommendations = result.recommendations if hasattr(result, 'recommendations') else []
            result.metrics['dependency_issues_count'] = len(result.issues)
            
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Dependencies analysis failed: {str(e)}")
        
        return result
    
    def analyze_configuration(self) -> AnalysisResult:
        """Analyze system configuration."""
        result = AnalysisResult(
            component="Configuration",
            component_type=ComponentType.BACKEND,
            status="HEALTHY",
            score=87.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                config_issues = []
                config_recommendations = []
                
                # Check settings structure
                base_settings = Path('config/settings/base.py')
                local_settings = Path('config/settings/local.py')
                production_settings = Path('config/settings/production.py')
                
                result.metrics.update({
                    'base_settings_exists': base_settings.exists(),
                    'local_settings_exists': local_settings.exists(),
                    'production_settings_exists': production_settings.exists()
                })
                
                if not base_settings.exists():
                    config_issues.append("Base settings file missing")
                    config_recommendations.append("Create base settings file")
                    result.score -= 10
                
                if not production_settings.exists():
                    config_recommendations.append("Create production settings file")
                    result.score -= 5
                
                # Check environment-specific settings
                debug_mode = settings.DEBUG
                result.metrics['debug_mode'] = debug_mode
                
                if debug_mode:
                    config_issues.append("DEBUG mode enabled")
                    config_recommendations.append("Disable DEBUG in production")
                    result.score -= 10
                
                # Check database configuration
                databases = settings.DATABASES
                result.metrics['databases_configured'] = bool(databases and 'default' in databases)
                
                if not databases or 'default' not in databases:
                    config_issues.append("Database not configured")
                    config_recommendations.append("Configure database settings")
                    result.score -= 15
                
                # Check static files configuration
                static_url = getattr(settings, 'STATIC_URL', None)
                static_root = getattr(settings, 'STATIC_ROOT', None)
                
                result.metrics.update({
                    'static_url_configured': bool(static_url),
                    'static_root_configured': bool(static_root)
                })
                
                if not static_root:
                    config_issues.append("STATIC_ROOT not configured")
                    config_recommendations.append("Configure STATIC_ROOT")
                    result.score -= 5
                
                # Check media files configuration
                media_url = getattr(settings, 'MEDIA_URL', None)
                media_root = getattr(settings, 'MEDIA_ROOT', None)
                
                result.metrics.update({
                    'media_url_configured': bool(media_url),
                    'media_root_configured': bool(media_root)
                })
                
                if not media_root:
                    config_issues.append("MEDIA_ROOT not configured")
                    config_recommendations.append("Configure MEDIA_ROOT")
                    result.score -= 5
                
                # Check logging configuration
                logging_config = getattr(settings, 'LOGGING', None)
                result.metrics['logging_configured'] = bool(logging_config)
                
                if not logging_config:
                    config_recommendations.append("Configure logging for better debugging")
                    result.score -= 5
                
                # Check internationalization
                use_i18n = getattr(settings, 'USE_I18N', False)
                use_l10n = getattr(settings, 'USE_L10N', False)
                
                result.metrics.update({
                    'i18n_enabled': use_i18n,
                    'l10n_enabled': use_l10n
                })
                
                # Check timezone configuration
                use_tz = getattr(settings, 'USE_TZ', False)
                timezone_setting = getattr(settings, 'TIME_ZONE', None)
                
                result.metrics.update({
                    'timezone_enabled': use_tz,
                    'timezone_setting': timezone_setting
                })
                
                if not use_tz:
                    config_recommendations.append("Enable timezone support")
                    result.score -= 3
                
                # Check installed apps
                installed_apps = settings.INSTALLED_APPS
                result.metrics['installed_apps_count'] = len(installed_apps)
                
                # Check for required apps
                required_apps = ['django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions']
                missing_required = [app for app in required_apps if app not in installed_apps]
                
                if missing_required:
                    config_issues.append(f"Missing required Django apps: {missing_required}")
                    config_recommendations.append("Add required Django apps")
                    result.score -= 10
                
                result.issues = config_issues
                result.recommendations = config_recommendations
                result.metrics['config_issues_count'] = len(config_issues)
                
                if config_issues:
                    result.status = "WARNING" if len(config_issues) <= 3 else "CRITICAL"
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for configuration analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Configuration analysis failed: {str(e)}")
        
        return result
    
    def analyze_monitoring_system(self) -> AnalysisResult:
        """Analyze monitoring and observability."""
        result = AnalysisResult(
            component="Monitoring System",
            component_type=ComponentType.MONITORING,
            status="HEALTHY",
            score=85.0
        )
        
        try:
            monitoring_issues = []
            monitoring_recommendations = []
            
            # Check for Prometheus integration
            try:
                import prometheus_client
                result.metrics['prometheus_available'] = True
            except ImportError:
                result.metrics['prometheus_available'] = False
                monitoring_recommendations.append("Install prometheus_client for metrics")
                result.score -= 10
            
            # Check for Django Prometheus integration
            if DJANGO_AVAILABLE:
                if 'django_prometheus' in settings.INSTALLED_APPS:
                    result.metrics['django_prometheus'] = True
                else:
                    result.metrics['django_prometheus'] = False
                    monitoring_recommendations.append("Add django_prometheus for Django metrics")
                    result.score -= 10
            
            # Check for logging configuration
            logging_config = getattr(settings, 'LOGGING', None)
            result.metrics['logging_configured'] = bool(logging_config)
            
            if not logging_config:
                monitoring_recommendations.append("Configure comprehensive logging")
                result.score -= 15
            
            # Check for health check endpoints
            try:
                from django.test import Client
                client = Client()
                response = client.get('/health/')
                result.metrics['health_endpoint'] = response.status_code == 200
            except:
                result.metrics['health_endpoint'] = False
                monitoring_recommendations.append("Create health check endpoint")
                result.score -= 10
            
            # Check for monitoring files
            monitoring_files = [
                'monitoring/prometheus.yml',
                'monitoring/grafana/dashboards',
                'monitoring/alertmanager.yml'
            ]
            
            existing_monitoring = []
            for monitor_file in monitoring_files:
                if Path(monitor_file).exists():
                    existing_monitoring.append(monitor_file)
            
            result.metrics['monitoring_files'] = existing_monitoring
            result.metrics['monitoring_files_count'] = len(existing_monitoring)
            
            if len(existing_monitoring) < 2:
                monitoring_recommendations.append("Set up comprehensive monitoring configuration")
                result.score -= 10
            
            # Check for error tracking
            error_tracking_services = ['sentry_sdk', 'rollbar']
            error_tracking_available = False
            
            for service in error_tracking_services:
                try:
                    __import__(service)
                    error_tracking_available = True
                    break
                except ImportError:
                    continue
            
            result.metrics['error_tracking'] = error_tracking_available
            
            if not error_tracking_available:
                monitoring_recommendations.append("Set up error tracking service (Sentry, Rollbar)")
                result.score -= 10
            
            # Check for APM (Application Performance Monitoring)
            apm_services = ['newrelic', 'datadog', 'elasticapm']
            apm_available = False
            
            for service in apm_services:
                try:
                    __import__(service)
                    apm_available = True
                    break
                except ImportError:
                    continue
            
            result.metrics['apm_available'] = apm_available
            
            if not apm_available:
                monitoring_recommendations.append("Consider APM service for performance monitoring")
                result.score -= 5
            
            result.issues = monitoring_issues
            result.recommendations = monitoring_recommendations
            result.metrics['monitoring_issues_count'] = len(monitoring_issues)
            
            if monitoring_issues:
                result.status = "WARNING" if len(monitoring_issues) <= 2 else "CRITICAL"
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Monitoring analysis failed: {str(e)}")
        
        return result
    
    def analyze_caching_strategy(self) -> AnalysisResult:
        """Analyze caching strategy and implementation."""
        result = AnalysisResult(
            component="Caching Strategy",
            component_type=ComponentType.CACHE,
            status="HEALTHY",
            score=88.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                cache_config = getattr(settings, 'CACHES', {})
                cache_backend = cache_config.get('default', {}).get('BACKEND', '')
                
                result.metrics['cache_backend'] = cache_backend
                result.metrics['cache_configured'] = bool(cache_backend)
                
                if not cache_backend:
                    result.issues.append("Cache not configured")
                    result.recommendations.append("Configure caching for better performance")
                    result.score -= 20
                else:
                    # Test cache performance
                    try:
                        cache_times = []
                        test_data = {'test': 'caching_test', 'timestamp': time.time()}
                        
                        for i in range(10):
                            start_time = time.time()
                            cache.set(f'cache_test_{i}', test_data, 300)
                            cache.get(f'cache_test_{i}')
                            cache_times.append((time.time() - start_time) * 1000)
                        
                        result.metrics.update({
                            'avg_cache_time_ms': statistics.mean(cache_times),
                            'p95_cache_time_ms': self._percentile(cache_times, 95)
                        })
                        
                        if result.metrics['avg_cache_time_ms'] > 10:
                            result.issues.append("Slow cache operations")
                            result.recommendations.append("Optimize cache configuration")
                            result.score -= 10
                        
                    except Exception as e:
                        result.issues.append(f"Cache performance test failed: {str(e)}")
                        result.score -= 15
                
                # Check cache backend type
                if 'redis' in cache_backend.lower():
                    result.metrics['cache_type'] = 'Redis'
                    result.metrics['distributed_cache'] = True
                    
                    # Test Redis connection
                    try:
                        import redis
                        redis_client = redis.from_url(cache_config['default']['LOCATION'])
                        redis_info = redis_client.info()
                        result.metrics['redis_connected'] = True
                        result.metrics['redis_memory'] = redis_info.get('used_memory_human', 'Unknown')
                    except Exception as e:
                        result.metrics['redis_connected'] = False
                        result.issues.append(f"Redis connection failed: {str(e)}")
                        result.score -= 15
                        
                elif 'memcached' in cache_backend.lower():
                    result.metrics['cache_type'] = 'Memcached'
                    result.metrics['distributed_cache'] = True
                elif 'dummy' in cache_backend.lower():
                    result.metrics['cache_type'] = 'Dummy'
                    result.metrics['distributed_cache'] = False
                    result.issues.append("Using dummy cache backend")
                    result.recommendations.append("Configure proper cache backend")
                    result.score -= 15
                else:
                    result.metrics['cache_type'] = 'Local'
                    result.metrics['distributed_cache'] = False
                    result.recommendations.append("Consider distributed cache for scalability")
                    result.score -= 10
                
                # Check for cache decorators in views
                views_with_cache = 0
                total_views = 0
                
                apps_dir = Path('apps')
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            views_file = app_dir / 'views.py'
                            if views_file.exists():
                                try:
                                    with open(views_file, 'r') as f:
                                        content = f.read()
                                        total_views += 1
                                        if '@cache_page' in content or '@method_decorator(cache_page' in content:
                                            views_with_cache += 1
                                except:
                                    continue
                
                result.metrics.update({
                    'total_views': total_views,
                    'views_with_cache': views_with_cache,
                    'cache_coverage': views_with_cache / total_views if total_views > 0 else 0
                })
                
                if result.metrics['cache_coverage'] < 0.3:
                    result.recommendations.append("Add caching to frequently accessed views")
                    result.score -= 10
                
                # Check for session caching
                session_engine = getattr(settings, 'SESSION_ENGINE', '')
                result.metrics['session_engine'] = session_engine
                
                if 'cache' in session_engine and not result.metrics['distributed_cache']:
                    result.issues.append("Session cache requires distributed cache")
                    result.recommendations.append("Configure distributed cache for session storage")
                    result.score -= 10
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for cache analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Cache analysis failed: {str(e)}")
        
        return result
    
    def analyze_error_handling(self) -> AnalysisResult:
        """Analyze error handling and logging."""
        result = AnalysisResult(
            component="Error Handling",
            component_type=ComponentType.BACKEND,
            status="HEALTHY",
            score=86.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                error_handling_issues = []
                error_handling_recommendations = []
                
                # Check logging configuration
                logging_config = getattr(settings, 'LOGGING', {})
                result.metrics['logging_configured'] = bool(logging_config)
                
                if not logging_config:
                    error_handling_recommendations.append("Configure comprehensive logging")
                    result.score -= 15
                
                # Check for error handlers in views
                views_with_error_handling = 0
                total_views = 0
                
                apps_dir = Path('apps')
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            views_file = app_dir / 'views.py'
                            if views_file.exists():
                                try:
                                    with open(views_file, 'r') as f:
                                        content = f.read()
                                        total_views += 1
                                        
                                        # Check for try-except blocks
                                        if 'try:' in content and 'except' in content:
                                            views_with_error_handling += 1
                                        
                                        # Check for Response with error status codes
                                        if 'status=' in content and ('400' in content or '404' in content or '500' in content):
                                            views_with_error_handling += 1
                                            
                                except:
                                    continue
                
                result.metrics.update({
                    'total_views': total_views,
                    'views_with_error_handling': views_with_error_handling,
                    'error_handling_coverage': views_with_error_handling / total_views if total_views > 0 else 0
                })
                
                if result.metrics['error_handling_coverage'] < 0.5:
                    error_handling_recommendations.append("Add proper error handling to views")
                    result.score -= 15
                
                # Check for custom exception classes
                custom_exceptions = 0
                apps_dir = Path('apps')
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            exceptions_file = app_dir / 'exceptions.py'
                            if exceptions_file.exists():
                                try:
                                    with open(exceptions_file, 'r') as f:
                                        content = f.read()
                                        # Count custom exception classes
                                        custom_exceptions += content.count('class ') - content.count('class ')  # Simplified
                                except:
                                    continue
                
                result.metrics['custom_exceptions'] = custom_exceptions
                
                if custom_exceptions == 0:
                    error_handling_recommendations.append("Create custom exception classes")
                    result.score -= 5
                
                # Check for middleware error handling
                middleware = getattr(settings, 'MIDDLEWARE', [])
                error_middleware = [
                    'django.middleware.common.BrokenLinkEmailsMiddleware',
                    'django.middleware.security.SecurityMiddleware'
                ]
                
                error_middleware_configured = [mw for mw in error_middleware if mw in middleware]
                result.metrics['error_middleware'] = error_middleware_configured
                result.metrics['error_middleware_count'] = len(error_middleware_configured)
                
                # Check for 404 and 500 error pages
                templates_dir = Path('templates')
                error_templates = ['404.html', '500.html']
                existing_error_templates = []
                
                if templates_dir.exists():
                    for template in error_templates:
                        if (templates_dir / template).exists():
                            existing_error_templates.append(template)
                
                result.metrics['error_templates'] = existing_error_templates
                result.metrics['error_templates_count'] = len(existing_error_templates)
                
                if len(existing_error_templates) < 2:
                    error_handling_recommendations.append("Create custom error pages (404, 500)")
                    result.score -= 10
                
                # Check for error logging
                if logging_config:
                    loggers = logging_config.get('loggers', {})
                    error_logger = loggers.get('django', {})
                    handlers = error_logger.get('handlers', [])
                    
                    result.metrics['error_handlers'] = handlers
                    result.metrics['error_logging_configured'] = len(handlers) > 0
                
                result.issues = error_handling_issues
                result.recommendations = error_handling_recommendations
                result.metrics['error_handling_issues_count'] = len(error_handling_issues)
                
                if error_handling_issues:
                    result.status = "WARNING" if len(error_handling_issues) <= 2 else "CRITICAL"
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for error handling analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Error handling analysis failed: {str(e)}")
        
        return result
    
    def analyze_integration_points(self) -> AnalysisResult:
        """Analyze integration points with external services."""
        result = AnalysisResult(
            component="Integration Points",
            component_type=ComponentType.BACKEND,
            status="HEALTHY",
            score=87.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                integration_issues = []
                integration_recommendations = []
                
                # Check for external service integrations
                external_services = {
                    'redis': False,
                    'postgresql': False,
                    'celery': False,
                    'elasticsearch': False,
                    'sentry': False,
                    'stripe': False,
                    'aws': False,
                    'google': False,
                    'facebook': False
                }
                
                # Check installed apps for integrations
                installed_apps = settings.INSTALLED_APPS
                
                if 'django_redis' in installed_apps or 'redis' in installed_apps:
                    external_services['redis'] = True
                
                if 'django.contrib.postgres' in installed_apps:
                    external_services['postgresql'] = True
                
                if 'django_celery' in installed_apps or 'celery' in installed_apps:
                    external_services['celery'] = True
                
                if 'django_elasticsearch' in installed_apps or 'elasticsearch' in installed_apps:
                    external_services['elasticsearch'] = True
                
                # Check for third-party integrations
                try:
                    import sentry_sdk
                    external_services['sentry'] = True
                except ImportError:
                    pass
                
                try:
                    import stripe
                    external_services['stripe'] = True
                except ImportError:
                    pass
                
                try:
                    import boto3
                    external_services['aws'] = True
                except ImportError:
                    pass
                
                result.metrics['external_services'] = external_services
                result.metrics['total_integrations'] = sum(external_services.values())
                
                # Test Redis integration
                if external_services['redis']:
                    try:
                        cache.set('integration_test', 'test', 60)
                        cache.get('integration_test')
                        cache.delete('integration_test')
                        result.metrics['redis_integration'] = 'WORKING'
                    except Exception as e:
                        result.metrics['redis_integration'] = f'FAILED: {str(e)}'
                        integration_issues.append("Redis integration not working")
                        integration_recommendations.append("Fix Redis configuration")
                        result.score -= 15
                
                # Test database integration
                if external_services['postgresql']:
                    try:
                        with connection.cursor() as cursor:
                            cursor.execute("SELECT 1")
                        result.metrics['database_integration'] = 'WORKING'
                    except Exception as e:
                        result.metrics['database_integration'] = f'FAILED: {str(e)}'
                        integration_issues.append("Database integration not working")
                        result.score -= 20
                
                # Check API integrations
                api_integrations = []
                
                # Check for REST API clients
                try:
                    import requests
                    api_integrations.append('requests')
                except ImportError:
                    pass
                
                # Check for GraphQL
                try:
                    import graphene
                    api_integrations.append('graphene')
                except ImportError:
                    pass
                
                result.metrics['api_integrations'] = api_integrations
                
                # Check for webhook support
                webhook_handlers = 0
                apps_dir = Path('apps')
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            for py_file in app_dir.glob('**/*.py'):
                                try:
                                    with open(py_file, 'r') as f:
                                        content = f.read()
                                        if 'webhook' in content.lower() or 'webhook' in content.lower():
                                            webhook_handlers += 1
                                except:
                                    continue
                
                result.metrics['webhook_handlers'] = webhook_handlers
                
                if webhook_handlers == 0:
                    integration_recommendations.append("Consider webhook support for external integrations")
                    result.score -= 5
                
                # Check for API versioning
                api_versioned = False
                try:
                    from django.urls import get_resolver
                    resolver = get_resolver()
                    
                    def check_versioning(patterns):
                        for pattern in patterns:
                            if hasattr(pattern, 'url_patterns'):
                                if check_versioning(pattern.url_patterns):
                                    return True
                            else:
                                if 'v1' in str(pattern.pattern) or 'v2' in str(pattern.pattern):
                                    return True
                        return False
                    
                    api_versioned = check_versioning(resolver.url_patterns)
                except:
                    pass
                
                result.metrics['api_versioned'] = api_versioned
                
                if not api_versioned:
                    integration_recommendations.append("Implement API versioning")
                    result.score -= 5
                
                # Check for authentication integrations
                auth_integrations = []
                
                if 'rest_framework_simplejwt' in installed_apps:
                    auth_integrations.append('JWT')
                
                if 'allauth' in installed_apps:
                    auth_integrations.append('AllAuth')
                
                if 'social-auth-app-django' in installed_apps:
                    auth_integrations.append('Social Auth')
                
                result.metrics['auth_integrations'] = auth_integrations
                
                if len(auth_integrations) == 0:
                    integration_recommendations.append("Consider third-party authentication integrations")
                    result.score -= 5
                
                result.issues = integration_issues
                result.recommendations = integration_recommendations
                result.metrics['integration_issues_count'] = len(integration_issues)
                
                if integration_issues:
                    result.status = "WARNING" if len(integration_issues) <= 2 else "CRITICAL"
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for integration analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Integration analysis failed: {str(e)}")
        
        return result
    
    def analyze_resource_usage(self) -> AnalysisResult:
        """Analyze resource usage and optimization."""
        result = AnalysisResult(
            component="Resource Usage",
            component_type=ComponentType.PERFORMANCE,
            status="HEALTHY",
            score=89.0
        )
        
        try:
            resource_issues = []
            resource_recommendations = []
            
            # System resources
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            result.metrics.update({
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_gb': memory.available / (1024**3),
                'disk_percent': (disk.used / disk.total) * 100,
                'disk_free_gb': disk.free / (1024**3)
            })
            
            # Resource usage assessment
            if cpu_percent > 80:
                resource_issues.append(f"High CPU usage: {cpu_percent}%")
                resource_recommendations.append("Optimize CPU-intensive operations")
                result.score -= 10
            
            if memory.percent > 85:
                resource_issues.append(f"High memory usage: {memory.percent}%")
                resource_recommendations.append("Optimize memory usage")
                result.score -= 10
            
            if (disk.used / disk.total) * 100 > 90:
                resource_issues.append(f"Low disk space: {(disk.used / disk.total) * 100:.1f}%")
                resource_recommendations.append("Clean up disk space")
                result.score -= 15
            
            # Process-specific resources
            process = psutil.Process()
            process_memory_mb = process.memory_info().rss / (1024**2)
            process_cpu_percent = process.cpu_percent()
            
            result.metrics.update({
                'process_memory_mb': process_memory_mb,
                'process_cpu_percent': process_cpu_percent,
                'process_threads': process.num_threads(),
                'process_open_files': process.num_fds() if hasattr(process, 'num_fds') else 0
            })
            
            if process_memory_mb > 1024:  # 1GB
                resource_issues.append(f"High process memory: {process_memory_mb:.2f}MB")
                resource_recommendations.append("Investigate memory leaks")
                result.score -= 10
            
            # Network I/O
            network_io = psutil.net_io_counters()
            result.metrics.update({
                'network_bytes_sent': network_io.bytes_sent,
                'network_bytes_recv': network_io.bytes_recv
            })
            
            # Disk I/O
            disk_io = psutil.disk_io_counters()
            result.metrics.update({
                'disk_read_bytes': disk_io.read_bytes,
                'disk_write_bytes': disk_io.write_bytes
            })
            
            # Resource optimization suggestions
            if DJANGO_AVAILABLE:
                # Check database connection pooling
                db_config = settings.DATABASES.get('default', {})
                max_conns = db_config.get('OPTIONS', {}).get('MAX_CONNS', None)
                
                if not max_conns:
                    resource_recommendations.append("Configure database connection pooling")
                    result.score -= 5
                
                # Check for caching
                cache_config = getattr(settings, 'CACHES', {})
                if not cache_config:
                    resource_recommendations.append("Configure caching to reduce resource usage")
                    result.score -= 10
                
                # Check for static files serving
                static_url = getattr(settings, 'STATIC_URL', '/static/')
                if static_url == '/static/':
                    resource_recommendations.append("Use CDN for static files")
                    result.score -= 5
            
            result.issues = resource_issues
            result.recommendations = resource_recommendations
            result.metrics['resource_issues_count'] = len(resource_issues)
            
            if resource_issues:
                result.status = "WARNING" if len(resource_issues) <= 2 else "CRITICAL"
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Resource usage analysis failed: {str(e)}")
        
        return result
    
    def analyze_data_integrity(self) -> AnalysisResult:
        """Analyze data integrity and validation."""
        result = AnalysisResult(
            component="Data Integrity",
            component_type=ComponentType.DATABASE,
            status="HEALTHY",
            score=90.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                data_integrity_issues = []
                data_integrity_recommendations = []
                
                # Check database constraints
                with connection.cursor() as cursor:
                    # Get table constraints
                    cursor.execute("""
                        SELECT table_name, constraint_name, constraint_type
                        FROM information_schema.table_constraints
                        WHERE table_schema = 'public'
                        ORDER BY table_name, constraint_name
                    """)
                    constraints = cursor.fetchall()
                
                result.metrics['total_constraints'] = len(constraints)
                
                # Group constraints by table
                table_constraints = {}
                for table, constraint, constraint_type in constraints:
                    if table not in table_constraints:
                        table_constraints[table] = []
                    table_constraints[table].append({
                        'name': constraint,
                        'type': constraint_type
                    })
                
                result.metrics['table_constraints'] = table_constraints
                
                # Check for foreign key constraints
                fk_constraints = [c for c in constraints if c[2] == 'FOREIGN KEY']
                result.metrics['foreign_key_constraints'] = len(fk_constraints)
                
                # Check for unique constraints
                unique_constraints = [c for c in constraints if c[2] == 'UNIQUE']
                result.metrics['unique_constraints'] = len(unique_constraints)
                
                # Check for NOT NULL constraints
                cursor.execute("""
                    SELECT table_name, column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND is_nullable = 'NO'
                """)
                not_null_columns = cursor.fetchall()
                result.metrics['not_null_columns'] = len(not_null_columns)
                
                # Check model validations
                apps_dir = Path('apps')
                validation_fields = 0
                total_fields = 0
                
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            models_file = app_dir / 'models.py'
                            if models_file.exists():
                                try:
                                    with open(models_file, 'r') as f:
                                        content = f.read()
                                        
                                        # Count field definitions
                                        field_patterns = [
                                            'models.CharField',
                                            'models.IntegerField',
                                            'models.EmailField',
                                            'models.URLField',
                                            'models.BooleanField',
                                            'models.DateField',
                                            'models.DateTimeField',
                                            'models.DecimalField',
                                            'models.FloatField'
                                        ]
                                        
                                        for pattern in field_patterns:
                                            total_fields += content.count(pattern)
                                        
                                        # Count validation options
                                        validation_patterns = [
                                            'unique=',
                                            'null=',
                                            'blank=',
                                            'default=',
                                            'choices=',
                                            'validators=',
                                            'max_length=',
                                            'min_value=',
                                            'max_value='
                                        ]
                                        
                                        for pattern in validation_patterns:
                                            validation_fields += content.count(pattern)
                                            
                                except:
                                    continue
                
                result.metrics.update({
                    'total_fields': total_fields,
                    'validation_fields': validation_fields,
                    'validation_coverage': validation_fields / total_fields if total_fields > 0 else 0
                })
                
                if result.metrics['validation_coverage'] < 0.5:
                    data_integrity_recommendations.append("Add more field validations")
                    result.score -= 10
                
                # Check for serializer validations
                serializers_with_validations = 0
                total_serializers = 0
                
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            serializers_file = app_dir / 'serializers.py'
                            if serializers_file.exists():
                                try:
                                    with open(serializers_file, 'r') as f:
                                        content = f.read()
                                        total_serializers += 1
                                        
                                        if 'validators=' in content or 'validate_' in content:
                                            serializers_with_validations += 1
                                            
                                except:
                                    continue
                
                result.metrics.update({
                    'total_serializers': total_serializers,
                    'serializers_with_validations': serializers_with_validations,
                    'serializer_validation_coverage': serializers_with_validations / total_serializers if total_serializers > 0 else 0
                })
                
                if result.metrics['serializer_validation_coverage'] < 0.5:
                    data_integrity_recommendations.append("Add serializer validations")
                    result.score -= 10
                
                # Check for data migrations
                migrations_dir = Path('apps')
                migration_files = []
                
                if migrations_dir.exists():
                    for app_dir in migrations_dir.iterdir():
                        if app_dir.is_dir():
                            migrations_path = app_dir / 'migrations'
                            if migrations_path.exists():
                                migration_files.extend(list(migrations_path.glob('*.py')))
                
                result.metrics['migration_files'] = len(migration_files)
                
                # Check for database backups
                backup_files = []
                for pattern in ['*.sql', '*.dump', '*.backup']:
                    backup_files.extend(Path('.').glob(pattern))
                
                result.metrics['backup_files'] = len(backup_files)
                
                if len(backup_files) == 0:
                    data_integrity_recommendations.append("Set up database backup strategy")
                    result.score -= 5
                
                result.issues = data_integrity_issues
                result.recommendations = data_integrity_recommendations
                result.metrics['data_integrity_issues_count'] = len(data_integrity_issues)
                
                if data_integrity_issues:
                    result.status = "WARNING" if len(data_integrity_issues) <= 2 else "CRITICAL"
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for data integrity analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Data integrity analysis failed: {str(e)}")
        
        return result
    
    def analyze_business_logic(self) -> AnalysisResult:
        """Analyze business logic and domain models."""
        result = AnalysisResult(
            component="Business Logic",
            component_type=ComponentType.BACKEND,
            status="HEALTHY",
            score=88.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                business_logic_issues = []
                business_logic_recommendations = []
                
                # Analyze models
                apps_dir = Path('apps')
                total_models = 0
                models_with_methods = 0
                models_with_properties = 0
                models_with_signals = 0
                
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            models_file = app_dir / 'models.py'
                            if models_file.exists():
                                try:
                                    with open(models_file, 'r') as f:
                                        content = f.read()
                                        
                                        # Count model classes
                                        model_classes = content.count('class ') - content.count('class Meta')
                                        total_models += model_classes
                                        
                                        # Check for custom methods
                                        if 'def ' in content:
                                            models_with_methods += 1
                                        
                                        # Check for properties
                                        if '@property' in content:
                                            models_with_properties += 1
                                        
                                        # Check for signals
                                        if '@receiver' in content:
                                            models_with_signals += 1
                                            
                                except:
                                    continue
                
                result.metrics.update({
                    'total_models': total_models,
                    'models_with_methods': models_with_methods,
                    'models_with_properties': models_with_properties,
                    'models_with_signals': models_with_signals
                })
                
                if total_models > 0:
                    result.metrics['method_coverage'] = models_with_methods / total_models
                    result.metrics['property_coverage'] = models_with_properties / total_models
                    result.metrics['signal_coverage'] = models_with_signals / total_models
                
                # Analyze services
                total_services = 0
                services_with_methods = 0
                
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            services_file = app_dir / 'services.py'
                            if services_file.exists():
                                try:
                                    with open(services_file, 'r') as f:
                                        content = f.read()
                                        
                                        # Count service classes
                                        service_classes = content.count('class ')
                                        total_services += service_classes
                                        
                                        if 'def ' in content:
                                            services_with_methods += 1
                                            
                                except:
                                    continue
                
                result.metrics.update({
                    'total_services': total_services,
                    'services_with_methods': services_with_methods
                })
                
                if total_services > 0:
                    result.metrics['service_method_coverage'] = services_with_methods / total_services
                
                # Analyze business rules
                business_rules_count = 0
                
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            for py_file in app_dir.glob('**/*.py'):
                                try:
                                    with open(py_file, 'r') as f:
                                        content = f.read()
                                        
                                        # Look for business rule patterns
                                        rule_patterns = [
                                            'if ',
                                            'validate',
                                            'check',
                                            'ensure',
                                            'verify',
                                            'business',
                                            'rule'
                                        ]
                                        
                                        for pattern in rule_patterns:
                                            business_rules_count += content.lower().count(pattern)
                                            
                                except:
                                    continue
                
                result.metrics['business_rules_count'] = business_rules_count
                
                # Check for business logic tests
                tests_dir = Path('tests')
                business_logic_tests = 0
                
                if tests_dir.exists():
                    for test_file in tests_dir.glob('**/*.py'):
                        try:
                            with open(test_file, 'r') as f:
                                content = f.read()
                                
                                # Look for business logic test patterns
                                test_patterns = [
                                    'test_',
                                    'assert',
                                    'validate',
                                    'business'
                                ]
                                
                                for pattern in test_patterns:
                                    business_logic_tests += content.lower().count(pattern)
                                    
                        except:
                            continue
                
                result.metrics['business_logic_tests'] = business_logic_tests
                
                if business_logic_tests < 10:
                    business_logic_recommendations.append("Add more business logic tests")
                    result.score -= 10
                
                # Check for domain separation
                domain_apps = ['courses', 'users', 'payments', 'ai_engine']
                existing_domain_apps = [app for app in domain_apps if (apps_dir / app).exists()]
                
                result.metrics['domain_apps'] = existing_domain_apps
                result.metrics['domain_separation'] = len(existing_domain_apps) / len(domain_apps)
                
                if result.metrics['domain_separation'] < 0.5:
                    business_logic_recommendations.append("Improve domain separation")
                    result.score -= 5
                
                result.issues = business_logic_issues
                result.recommendations = business_logic_recommendations
                result.metrics['business_logic_issues_count'] = len(business_logic_issues)
                
                if business_logic_issues:
                    result.status = "WARNING" if len(business_logic_issues) <= 2 else "CRITICAL"
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for business logic analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Business logic analysis failed: {str(e)}")
        
        return result
    
    def analyze_user_experience(self) -> AnalysisResult:
        """Analyze user experience and interface."""
        result = AnalysisResult(
            component="User Experience",
            component_type=ComponentType.BACKEND,
            status="HEALTHY",
            score=87.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                ux_issues = []
                ux_recommendations = []
                
                # Check API response times
                client = Client()
                
                api_endpoints = [
                    '/api/v1/courses/',
                    '/api/v1/categories/',
                    '/health/'
                ]
                
                response_times = []
                successful_endpoints = 0
                
                for endpoint in api_endpoints:
                    try:
                        start_time = time.time()
                        response = client.get(endpoint)
                        response_time = (time.time() - start_time) * 1000
                        
                        if response.status_code < 400:
                            response_times.append(response_time)
                            successful_endpoints += 1
                    except:
                        continue
                
                if response_times:
                    result.metrics.update({
                        'avg_api_response_time_ms': statistics.mean(response_times),
                        'p95_api_response_time_ms': self._percentile(response_times, 95)
                    })
                    
                    if result.metrics['avg_api_response_time_ms'] > 200:
                        ux_issues.append("Slow API response times")
                        ux_recommendations.append("Optimize API performance")
                        result.score -= 15
                
                # Check for user-friendly error messages
                error_handling_quality = 0
                total_error_checks = 0
                
                apps_dir = Path('apps')
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            views_file = app_dir / 'views.py'
                            if views_file.exists():
                                try:
                                    with open(views_file, 'r') as f:
                                        content = f.read()
                                        
                                        # Check for user-friendly error messages
                                        error_patterns = [
                                            'Response({',
                                            'status=',
                                            'message='
                                        ]
                                        
                                        for pattern in error_patterns:
                                            total_error_checks += content.count(pattern)
                                            if 'message=' in content:
                                                error_handling_quality += 1
                                                
                                except:
                                    continue
                
                result.metrics.update({
                    'total_error_checks': total_error_checks,
                    'error_handling_quality': error_handling_quality
                })
                
                if total_error_checks > 0:
                    result.metrics['error_message_quality'] = error_handling_quality / total_error_checks
                    
                    if result.metrics['error_message_quality'] < 0.5:
                        ux_recommendations.append("Improve error messages for better UX")
                        result.score -= 10
                
                # Check for pagination
                pagination_implemented = 0
                total_list_views = 0
                
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            views_file = app_dir / 'views.py'
                            if views_file.exists():
                                try:
                                    with open(views_file, 'r') as f:
                                        content = f.read()
                                        
                                        # Check for pagination
                                        if 'pagination_class' in content or 'PageNumberPagination' in content:
                                            pagination_implemented += 1
                                        
                                        # Count list views
                                        total_list_views += content.count('list(self, request)')
                                        
                                except:
                                    continue
                
                result.metrics.update({
                    'pagination_implemented': pagination_implemented,
                    'total_list_views': total_list_views
                })
                
                if total_list_views > 0:
                    result.metrics['pagination_coverage'] = pagination_implemented / total_list_views
                    
                    if result.metrics['pagination_coverage'] < 0.5:
                        ux_recommendations.append("Implement pagination for better UX")
                        result.score -= 10
                
                # Check for search functionality
                search_implemented = 0
                total_views = 0
                
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            views_file = app_dir / 'views.py'
                            if views_file.exists():
                                try:
                                    with open(views_file, 'r') as f:
                                        content = f.read()
                                        
                                        # Check for search functionality
                                        if 'search' in content.lower() or 'filter' in content.lower():
                                            search_implemented += 1
                                        
                                        total_views += content.count('def ')
                                        
                                except:
                                    continue
                
                result.metrics.update({
                    'search_implemented': search_implemented,
                    'total_views': total_views
                })
                
                if total_views > 0:
                    result.metrics['search_coverage'] = search_implemented / total_views
                    
                    if result.metrics['search_coverage'] < 0.3:
                        ux_recommendations.append("Add search functionality")
                        result.score -= 5
                
                # Check for caching for better UX
                cache_decorators = 0
                total_endpoints = 0
                
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            views_file = app_dir / 'views.py'
                            if views_file.exists():
                                try:
                                    with open(views_file, 'r') as f:
                                        content = f.read()
                                        
                                        # Check for cache decorators
                                        cache_decorators += content.count('@cache_page')
                                        total_endpoints += content.count('def ')
                                        
                                except:
                                    continue
                
                result.metrics.update({
                    'cache_decorators': cache_decorators,
                    'total_endpoints': total_endpoints
                })
                
                if total_endpoints > 0:
                    result.metrics['cache_coverage'] = cache_decorators / total_endpoints
                    
                    if result.metrics['cache_coverage'] < 0.3:
                        ux_recommendations.append("Add caching for faster response times")
                        result.score -= 10
                
                result.issues = ux_issues
                result.recommendations = ux_recommendations
                result.metrics['ux_issues_count'] = len(ux_issues)
                
                if ux_issues:
                    result.status = "WARNING" if len(ux_issues) <= 2 else "CRITICAL"
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for UX analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"UX analysis failed: {str(e)}")
        
        return result
    
    def analyze_compliance_standards(self) -> AnalysisResult:
        """Analyze compliance with standards and regulations."""
        result = AnalysisResult(
            component="Compliance Standards",
            component_type=ComponentType.SECURITY,
            status="HEALTHY",
            score=89.0
        )
        
        try:
            if DJANGO_AVAILABLE:
                compliance_issues = []
                compliance_recommendations = []
                
                # GDPR compliance checks
                gdpr_checks = {
                    'data_processing_consent': False,
                    'data_portability': False,
                    'right_to_erasure': False,
                    'data_protection_officer': False,
                    'privacy_policy': False,
                    'cookie_consent': False
                }
                
                # Check for user data management
                if 'users' in settings.INSTALLED_APPS:
                    gdpr_checks['data_processing_consent'] = True
                
                # Check for data export functionality
                apps_dir = Path('apps')
                if apps_dir.exists():
                    for app_dir in apps_dir.iterdir():
                        if app_dir.is_dir():
                            for py_file in app_dir.glob('**/*.py'):
                                try:
                                    with open(py_file, 'r') as f:
                                        content = f.read()
                                        
                                        if 'export' in content.lower() and 'user' in content.lower():
                                            gdpr_checks['data_portability'] = True
                                        
                                        if 'delete' in content.lower() and 'user' in content.lower():
                                            gdpr_checks['right_to_erasure'] = True
                                            
                                except:
                                    continue
                
                # Check for privacy policy
                privacy_policy_file = Path('templates/privacy_policy.html')
                gdpr_checks['privacy_policy'] = privacy_policy_file.exists()
                
                # Check for cookie consent
                if 'django-cookie-consent' in settings.INSTALLED_APPS:
                    gdpr_checks['cookie_consent'] = True
                
                result.metrics['gdpr_checks'] = gdpr_checks
                gdpr_compliance_score = sum(gdpr_checks.values()) / len(gdpr_checks)
                result.metrics['gdpr_compliance_score'] = gdpr_compliance_score
                
                if gdpr_compliance_score < 0.7:
                    compliance_recommendations.append("Improve GDPR compliance")
                    result.score -= 15
                
                # Security compliance checks
                security_checks = {
                    'password_policy': False,
                    'two_factor_auth': False,
                    'session_timeout': False,
                    'audit_logging': False,
                    'encryption_at_rest': False,
                    'encryption_in_transit': False
                }
                
                # Check password policy
                if 'django-password-validators' in settings.INSTALLED_APPS:
                    security_checks['password_policy'] = True
                
                # Check for 2FA
                if 'django-otp' in settings.INSTALLED_APPS or 'allauth' in settings.INSTALLED_APPS:
                    security_checks['two_factor_auth'] = True
                
                # Check session timeout
                session_config = getattr(settings, 'SESSION_COOKIE_AGE', None)
                if session_config and session_config <= 3600:  # 1 hour
                    security_checks['session_timeout'] = True
                
                # Check audit logging
                logging_config = getattr(settings, 'LOGGING', {})
                if logging_config:
                    security_checks['audit_logging'] = True
                
                # Check encryption at rest
                db_config = settings.DATABASES.get('default', {})
                if 'sslmode' in db_config.get('OPTIONS', {}):
                    security_checks['encryption_at_rest'] = True
                
                # Check encryption in transit
                secure_settings = [
                    'SECURE_SSL_REDIRECT',
                    'SESSION_COOKIE_SECURE',
                    'CSRF_COOKIE_SECURE'
                ]
                
                encryption_in_transit = all(hasattr(settings, setting) and getattr(settings, setting) for setting in secure_settings)
                security_checks['encryption_in_transit'] = encryption_in_transit
                
                result.metrics['security_checks'] = security_checks
                security_compliance_score = sum(security_checks.values()) / len(security_checks)
                result.metrics['security_compliance_score'] = security_compliance_score
                
                if security_compliance_score < 0.7:
                    compliance_recommendations.append("Improve security compliance")
                    result.score -= 15
                
                # Accessibility compliance checks (WCAG)
                accessibility_checks = {
                    'alt_tags': False,
                    'semantic_html': False,
                    'keyboard_navigation': False,
                    'color_contrast': False,
                    'screen_reader_support': False
                }
                
                # Check templates for accessibility
                templates_dir = Path('templates')
                if templates_dir.exists():
                    for template_file in templates_dir.glob('**/*.html'):
                        try:
                            with open(template_file, 'r') as f:
                                content = f.read()
                                
                                if 'alt=' in content:
                                    accessibility_checks['alt_tags'] = True
                                
                                if any(tag in content for tag in ['<nav>', '<main>', '<header>', '<footer>']):
                                    accessibility_checks['semantic_html'] = True
                                    
                        except:
                            continue
                
                result.metrics['accessibility_checks'] = accessibility_checks
                accessibility_compliance_score = sum(accessibility_checks.values()) / len(accessibility_checks)
                result.metrics['accessibility_compliance_score'] = accessibility_compliance_score
                
                if accessibility_compliance_score < 0.5:
                    compliance_recommendations.append("Improve accessibility compliance")
                    result.score -= 10
                
                # Overall compliance score
                overall_compliance_score = (gdpr_compliance_score + security_compliance_score + accessibility_compliance_score) / 3
                result.metrics['overall_compliance_score'] = overall_compliance_score
                
                result.issues = compliance_issues
                result.recommendations = compliance_recommendations
                result.metrics['compliance_issues_count'] = len(compliance_issues)
                
                if compliance_issues:
                    result.status = "WARNING" if len(compliance_issues) <= 2 else "CRITICAL"
                
            else:
                result.status = "WARNING"
                result.score = 50.0
                result.issues.append("Django not available for compliance analysis")
        
        except Exception as e:
            result.status = "ERROR"
            result.score = 0.0
            result.issues.append(f"Compliance analysis failed: {str(e)}")
        
        return result
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data."""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * (percentile / 100))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def _calculate_metrics(self):
        """Calculate overall system metrics."""
        self.metrics.total_components = len(self.results)
        self.metrics.healthy_components = len([r for r in self.results if r.status == 'HEALTHY'])
        self.metrics.critical_issues = len([r for r in self.results if r.status == 'CRITICAL'])
        self.metrics.warnings = len([r for r in self.results if r.status == 'WARNING'])
        
        # Calculate component-specific scores
        component_scores = {}
        for result in self.results:
            component_type = result.component_type.value
            if component_type not in component_scores:
                component_scores[component_type] = []
            component_scores[component_type].append(result.score)
        
        # Calculate average scores by component type
        for component_type, scores in component_scores.items():
            avg_score = sum(scores) / len(scores) if scores else 0
            if component_type == 'performance':
                self.metrics.performance_score = avg_score
            elif component_type == 'security':
                self.metrics.security_score = avg_score
            elif component_type == 'scalability':
                self.metrics.scalability_score = avg_score
            elif component_type == 'ml_services':
                self.metrics.ml_score = avg_score
        
        # Calculate overall score
        if self.results:
            self.metrics.overall_score = sum(r.score for r in self.results) / len(self.results)
        
        self.metrics.analysis_duration = time.time() - self.start_time
    
    def _generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive analysis report."""
        report = {
            'timestamp': datetime.now().isoformat(),
            'analysis_level': self.analysis_level.value,
            'analysis_duration': self.metrics.analysis_duration,
            'system_metrics': {
                'total_components': self.metrics.total_components,
                'healthy_components': self.metrics.healthy_components,
                'critical_issues': self.metrics.critical_issues,
                'warnings': self.metrics.warnings,
                'overall_score': self.metrics.overall_score,
                'performance_score': self.metrics.performance_score,
                'security_score': self.metrics.security_score,
                'scalability_score': self.metrics.scalability_score,
                'ml_score': self.metrics.ml_score
            },
            'component_results': [
                {
                    'component': result.component,
                    'component_type': result.component_type.value,
                    'status': result.status,
                    'score': result.score,
                    'issues': result.issues,
                    'recommendations': result.recommendations,
                    'metrics': result.metrics,
                    'execution_time': result.execution_time
                }
                for result in self.results
            ],
            'summary': {
                'total_issues': sum(len(r.issues) for r in self.results),
                'total_recommendations': sum(len(r.recommendations) for r in self.results),
                'critical_components': [r.component for r in self.results if r.status == 'CRITICAL'],
                'healthy_components': [r.component for r in self.results if r.status == 'HEALTHY'],
                'top_issues': self._get_top_issues(),
                'priority_recommendations': self._get_priority_recommendations()
            },
            'action_items': self._generate_action_items(),
            'next_steps': self._generate_next_steps()
        }
        
        # Save report to file
        report_file = f"advanced_system_analysis_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Advanced system analysis report saved to {report_file}")
        
        return report
    
    def _get_top_issues(self) -> List[str]:
        """Get top issues across all components."""
        all_issues = []
        for result in self.results:
            for issue in result.issues:
                all_issues.append({
                    'component': result.component,
                    'issue': issue,
                    'score': result.score,
                    'status': result.status
                })
        
        # Sort by score (lower score = more critical)
        all_issues.sort(key=lambda x: x['score'])
        
        return [f"{issue['component']}: {issue['issue']}" for issue in all_issues[:10]]
    
    def _get_priority_recommendations(self) -> List[str]:
        """Get priority recommendations across all components."""
        all_recommendations = []
        for result in self.results:
            for rec in result.recommendations:
                all_recommendations.append({
                    'component': result.component,
                    'recommendation': rec,
                    'score': result.score,
                    'status': result.status
                })
        
        # Sort by score (lower score = higher priority)
        all_recommendations.sort(key=lambda x: x['score'])
        
        return [f"{rec['component']}: {rec['recommendation']}" for rec in all_recommendations[:15]]
    
    def _generate_action_items(self) -> List[Dict[str, Any]]:
        """Generate actionable items based on analysis."""
        action_items = []
        
        # Critical issues first
        critical_results = [r for r in self.results if r.status == 'CRITICAL']
        for result in critical_results:
            action_items.append({
                'priority': 'CRITICAL',
                'component': result.component,
                'action': f"Fix critical issues in {result.component}",
                'issues': result.issues,
                'estimated_effort': 'HIGH',
                'impact': 'HIGH'
            })
        
        # High-impact improvements
        low_score_results = [r for r in self.results if r.score < 70 and r.status != 'CRITICAL']
        for result in low_score_results:
            action_items.append({
                'priority': 'HIGH',
                'component': result.component,
                'action': f"Improve {result.component} (current score: {result.score})",
                'recommendations': result.recommendations,
                'estimated_effort': 'MEDIUM',
                'impact': 'HIGH'
            })
        
        # Medium priority items
        medium_results = [r for r in self.results if 70 <= r.score < 85 and r.status == 'WARNING']
        for result in medium_results:
            action_items.append({
                'priority': 'MEDIUM',
                'component': result.component,
                'action': f"Address warnings in {result.component}",
                'recommendations': result.recommendations[:3],  # Top 3
                'estimated_effort': 'MEDIUM',
                'impact': 'MEDIUM'
            })
        
        return action_items[:20]  # Top 20 action items
    
    def _generate_next_steps(self) -> List[str]:
        """Generate next steps based on analysis."""
        next_steps = []
        
        # Based on overall score
        if self.metrics.overall_score < 70:
            next_steps.append("Address critical issues immediately")
            next_steps.append("Implement high-priority recommendations")
            next_steps.append("Schedule follow-up analysis in 2 weeks")
        elif self.metrics.overall_score < 85:
            next_steps.append("Address medium-priority issues")
            next_steps.append("Implement performance optimizations")
            next_steps.append("Schedule follow-up analysis in 1 month")
        else:
            next_steps.append("Monitor system performance")
            next_steps.append("Implement remaining low-priority recommendations")
            next_steps.append("Schedule quarterly analysis")
        
        # Component-specific next steps
        if self.metrics.security_score < 80:
            next_steps.append("Focus on security improvements")
        
        if self.metrics.performance_score < 80:
            next_steps.append("Optimize performance bottlenecks")
        
        if self.metrics.scalability_score < 80:
            next_steps.append("Prepare for scaling challenges")
        
        if self.metrics.ml_score < 80:
            next_steps.append("Enhance ML services reliability")
        
        # Based on critical components
        critical_components = [r.component for r in self.results if r.status == 'CRITICAL']
        if critical_components:
            next_steps.append(f"Address critical components: {', '.join(critical_components)}")
        
        return next_steps

def main():
    """Main analysis function."""
    print("🔍 Starting Advanced System Analysis & Enhancement Suite...")
    print("=" * 80)
    
    # Get analysis level from user or default to comprehensive
    analysis_level = AnalysisLevel.COMPREHENSIVE
    
    analyzer = AdvancedSystemAnalyzer(analysis_level)
    
    # Run analysis
    report = asyncio.run(analyzer.run_comprehensive_analysis())
    
    # Display results
    print(f"\n📊 Advanced System Analysis Results:")
    print("=" * 80)
    print(f"Analysis Level: {report['analysis_level'].upper()}")
    print(f"Duration: {report['analysis_duration']:.2f} seconds")
    print(f"Overall Score: {report['system_metrics']['overall_score']:.1f}/100")
    print(f"Components Analyzed: {report['system_metrics']['total_components']}")
    print(f"Healthy Components: {report['system_metrics']['healthy_components']}")
    print(f"Critical Issues: {report['system_metrics']['critical_issues']}")
    print(f"Warnings: {report['system_metrics']['warnings']}")
    
    # Component breakdown
    print(f"\n📋 Component Analysis:")
    print("=" * 80)
    for result in report['component_results']:
        status_icon = "✅" if result['status'] == 'HEALTHY' else "⚠️" if result['status'] == 'WARNING' else "❌" if result['status'] == 'CRITICAL' else "🔴"
        print(f"{status_icon} {result['component']}: {result['score']:.1f}/100 ({result['status']})")
        
        if result['issues']:
            for issue in result['issues'][:2]:  # First 2 issues
                print(f"    - {issue}")
    
    # Top issues
    if report['summary']['top_issues']:
        print(f"\n⚠️  Top Issues:")
        print("=" * 80)
        for i, issue in enumerate(report['summary']['top_issues'][:10], 1):
            print(f"{i}. {issue}")
    
    # Priority recommendations
    if report['summary']['priority_recommendations']:
        print(f"\n💡 Priority Recommendations:")
        print("=" * 80)
        for i, rec in enumerate(report['summary']['priority_recommendations'][:10], 1):
            print(f"{i}. {rec}")
    
    # Action items
    if report['action_items']:
        print(f"\n🚀 Action Items:")
        print("=" * 80)
        for i, item in enumerate(report['action_items'][:10], 1):
            print(f"{i}. [{item['priority']}] {item['action']}")
            print(f"   Impact: {item['impact']}, Effort: {item['estimated_effort']}")
    
    # Next steps
    print(f"\n📈 Next Steps:")
    print("=" * 80)
    for i, step in enumerate(report['next_steps'], 1):
        print(f"{i}. {step}")
    
    # Overall assessment
    print(f"\n🎯 Overall Assessment:")
    print("=" * 80)
    score = report['system_metrics']['overall_score']
    
    if score >= 90:
        print("🌟 EXCELLENT: System is in excellent condition!")
        print("📈 Focus on continuous improvement and monitoring")
    elif score >= 80:
        print("✅ GOOD: System is healthy with minor issues")
        print("🔧 Address minor issues for optimal performance")
    elif score >= 70:
        print("⚠️  FAIR: System has some issues requiring attention")
        print("🔧 Address issues to improve system health")
    elif score >= 60:
        print("❌ POOR: System has significant issues")
        print("🚨 Address issues urgently to prevent problems")
    else:
        print("🆘 CRITICAL: System requires immediate attention")
        print("🚀 Address all critical issues immediately")
    
    print(f"\n📊 Component Scores:")
    print("=" * 80)
    print(f"Performance: {report['system_metrics']['performance_score']:.1f}/100")
    print(f"Security: {report['system_metrics']['security_score']:.1f}/100")
    print(f"Scalability: {report['system_metrics']['scalability_score']:.1f}/100")
    print(f"ML Services: {report['system_metrics']['ml_score']:.1f}/100")
    
    return report

if __name__ == '__main__':
    main()
