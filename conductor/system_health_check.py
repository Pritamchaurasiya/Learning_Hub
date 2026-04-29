# System Health Check & Validation Script
"""
Comprehensive health monitoring and validation for the Learning Hub platform
"""

import os
import sys
import time
import json
import logging
import subprocess
import psutil
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta

# Setup Django
try:
    import django
    from django.conf import settings
    from django.core.management import execute_from_command_line
    from django.db import connection
    from django.core.cache import cache
    from django.test import Client
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
    django.setup()
    
    DJANGO_AVAILABLE = True
except ImportError:
    DJANGO_AVAILABLE = False
    print("Warning: Django not available, running in standalone mode")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SystemHealthChecker:
    """Comprehensive system health monitoring and validation."""
    
    def __init__(self):
        self.health_status = {}
        self.issues = []
        self.recommendations = []
        self.checks_performed = []
        self.start_time = time.time()
    
    def run_comprehensive_health_check(self) -> Dict[str, Any]:
        """Run comprehensive health check across all system components."""
        logger.info("Starting comprehensive system health check...")
        
        health_checks = [
            ('System Resources', self.check_system_resources),
            ('Python Environment', self.check_python_environment),
            ('Django Application', self.check_django_application),
            ('Database Connectivity', self.check_database_connectivity),
            ('Cache System', self.check_cache_system),
            ('File System', self.check_file_system),
            ('Network Connectivity', self.check_network_connectivity),
            ('Security Configuration', self.check_security_configuration),
            ('Performance Metrics', self.check_performance_metrics),
            ('Dependencies', self.check_dependencies),
            ('Configuration Files', self.check_configuration_files),
            ('Log Files', self.check_log_files),
            ('Background Services', self.check_background_services),
            ('API Endpoints', self.check_api_endpoints),
            ('ML Services', self.check_ml_services)
        ]
        
        for check_name, check_func in health_checks:
            logger.info(f"Running: {check_name}")
            try:
                result = check_func()
                self.health_status[check_name] = result
                self.checks_performed.append(check_name)
                
                # Check if healthy
                if isinstance(result, dict):
                    is_healthy = result.get('healthy', False)
                    status = '✅ HEALTHY' if is_healthy else '❌ UNHEALTHY'
                    logger.info(f"{check_name}: {status}")
                    
                    if not is_healthy:
                        issues = result.get('issues', [])
                        self.issues.extend([f"{check_name}: {issue}" for issue in issues])
                        
                        recommendations = result.get('recommendations', [])
                        self.recommendations.extend([f"{check_name}: {rec}" for rec in recommendations])
                else:
                    logger.info(f"{check_name}: {result}")
                    
            except Exception as e:
                logger.error(f"Error in {check_name}: {e}")
                self.health_status[check_name] = {
                    'healthy': False,
                    'error': str(e),
                    'issues': [f"Check failed: {str(e)}"],
                    'recommendations': ["Fix the error and re-run the check"]
                }
                self.issues.append(f"{check_name}: {str(e)}")
        
        return self.generate_health_report()
    
    def check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage."""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available_gb = memory.available / (1024**3)
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_free_gb = disk.free / (1024**3)
            
            # Network I/O
            network = psutil.net_io_counters()
            
            # Process information
            process = psutil.Process()
            process_memory_mb = process.memory_info().rss / (1024**2)
            process_cpu_percent = process.cpu_percent()
            
            # Determine health
            issues = []
            recommendations = []
            
            if cpu_percent > 80:
                issues.append(f"High CPU usage: {cpu_percent}%")
                recommendations.append("Optimize CPU-intensive processes or scale horizontally")
            
            if memory_percent > 85:
                issues.append(f"High memory usage: {memory_percent}%")
                recommendations.append("Free up memory or add more RAM")
            
            if disk_percent > 90:
                issues.append(f"Low disk space: {disk_percent}% used")
                recommendations.append("Clean up disk space or add more storage")
            
            if process_memory_mb > 1024:  # 1GB
                issues.append(f"High process memory: {process_memory_mb:.2f}MB")
                recommendations.append("Investigate memory leaks or optimize memory usage")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'cpu': {
                    'percent': cpu_percent,
                    'count': cpu_count,
                    'status': 'OK' if cpu_percent < 80 else 'HIGH'
                },
                'memory': {
                    'percent': memory_percent,
                    'available_gb': memory_available_gb,
                    'status': 'OK' if memory_percent < 85 else 'HIGH'
                },
                'disk': {
                    'percent': disk_percent,
                    'free_gb': disk_free_gb,
                    'status': 'OK' if disk_percent < 90 else 'LOW'
                },
                'process': {
                    'memory_mb': process_memory_mb,
                    'cpu_percent': process_cpu_percent
                },
                'network': {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv
                },
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"System resource check failed: {str(e)}"],
                'recommendations': ["Install psutil or check system monitoring tools"]
            }
    
    def check_python_environment(self) -> Dict[str, Any]:
        """Check Python environment and dependencies."""
        try:
            python_version = sys.version_info
            python_path = sys.executable
            
            # Check Python version
            version_ok = python_version.major >= 3 and python_version.minor >= 8
            
            # Check virtual environment
            in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
            
            # Check pip
            try:
                import pip
                pip_version = pip.__version__
                pip_ok = True
            except ImportError:
                pip_version = None
                pip_ok = False
            
            # Check critical packages
            critical_packages = ['django', 'psycopg2', 'redis', 'celery']
            package_status = {}
            
            for package in critical_packages:
                try:
                    __import__(package)
                    package_status[package] = 'INSTALLED'
                except ImportError:
                    package_status[package] = 'MISSING'
            
            issues = []
            recommendations = []
            
            if not version_ok:
                issues.append(f"Python version too old: {python_version.major}.{python_version.minor}")
                recommendations.append("Upgrade to Python 3.8+")
            
            if not in_venv:
                issues.append("Not running in virtual environment")
                recommendations.append("Use virtual environment for dependency isolation")
            
            if not pip_ok:
                issues.append("pip not available")
                recommendations.append("Install pip")
            
            missing_packages = [pkg for pkg, status in package_status.items() if status == 'MISSING']
            if missing_packages:
                issues.append(f"Missing packages: {', '.join(missing_packages)}")
                recommendations.append(f"Install missing packages: pip install {' '.join(missing_packages)}")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'python_version': f"{python_version.major}.{python_version.minor}.{python_version.micro}",
                'python_path': python_path,
                'in_virtual_env': in_venv,
                'pip_version': pip_version,
                'package_status': package_status,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Python environment check failed: {str(e)}"],
                'recommendations': ["Check Python installation and environment"]
            }
    
    def check_django_application(self) -> Dict[str, Any]:
        """Check Django application health."""
        if not DJANGO_AVAILABLE:
            return {
                'healthy': False,
                'error': 'Django not available',
                'issues': ['Django framework not installed or not configured'],
                'recommendations': ['Install Django and configure settings']
            }
        
        try:
            # Check Django settings
            settings_configured = settings.configured
            
            # Check debug mode
            debug_mode = settings.DEBUG
            
            # Check allowed hosts
            allowed_hosts = settings.ALLOWED_HOSTS
            
            # Check database configuration
            databases = settings.DATABASES
            
            # Check installed apps
            installed_apps = settings.INSTALLED_APPS
            
            # Check middleware
            middleware = settings.MIDDLEWARE
            
            # Check static files configuration
            static_url = getattr(settings, 'STATIC_URL', '/static/')
            static_root = getattr(settings, 'STATIC_ROOT', None)
            
            # Check media files configuration
            media_url = getattr(settings, 'MEDIA_URL', '/media/')
            media_root = getattr(settings, 'MEDIA_ROOT', None)
            
            issues = []
            recommendations = []
            
            if not settings_configured:
                issues.append("Django settings not configured")
                recommendations.append("Configure Django settings properly")
            
            if debug_mode:
                issues.append("DEBUG mode enabled in production")
                recommendations.append("Disable DEBUG mode in production")
            
            if not allowed_hosts:
                issues.append("ALLOWED_HOSTS not configured")
                recommendations.append("Configure ALLOWED_HOSTS for security")
            
            if not databases or 'default' not in databases:
                issues.append("Database not configured")
                recommendations.append("Configure database settings")
            
            if not static_root:
                issues.append("STATIC_ROOT not configured")
                recommendations.append("Configure STATIC_ROOT for static file serving")
            
            if not media_root:
                issues.append("MEDIA_ROOT not configured")
                recommendations.append("Configure MEDIA_ROOT for media file serving")
            
            # Test Django management commands
            try:
                from django.core.management import call_command
                call_command('check', '--deploy', verbosity=0)
                management_ok = True
            except Exception as e:
                management_ok = False
                issues.append(f"Django management check failed: {str(e)}")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'settings_configured': settings_configured,
                'debug_mode': debug_mode,
                'allowed_hosts': allowed_hosts,
                'installed_apps_count': len(installed_apps),
                'middleware_count': len(middleware),
                'database_configured': bool(databases and 'default' in databases),
                'static_configured': bool(static_root),
                'media_configured': bool(media_root),
                'management_check_passed': management_ok,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Django application check failed: {str(e)}"],
                'recommendations': ["Check Django configuration and settings"]
            }
    
    def check_database_connectivity(self) -> Dict[str, Any]:
        """Check database connectivity and performance."""
        if not DJANGO_AVAILABLE:
            return {
                'healthy': False,
                'error': 'Django not available',
                'issues': ['Cannot check database without Django'],
                'recommendations': ['Install and configure Django']
            }
        
        try:
            # Test database connection
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            connection_time = (time.time() - start_time) * 1000
            
            # Check database configuration
            db_config = settings.DATABASES.get('default', {})
            db_engine = db_config.get('ENGINE', '')
            db_name = db_config.get('NAME', '')
            db_host = db_config.get('HOST', '')
            db_port = db_config.get('PORT', '')
            
            # Test query performance
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT version()")
                version_info = cursor.fetchone()
            query_time = (time.time() - start_time) * 1000
            
            # Check table counts
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """)
                tables = [row[0] for row in cursor.fetchall()]
            
            # Check connection pool (if using pgbouncer or similar)
            pool_status = 'UNKNOWN'
            
            issues = []
            recommendations = []
            
            if connection_time > 1000:  # 1 second
                issues.append(f"Slow database connection: {connection_time:.2f}ms")
                recommendations.append("Optimize database connection settings")
            
            if query_time > 500:  # 500ms
                issues.append(f"Slow query performance: {query_time:.2f}ms")
                recommendations.append("Optimize database queries and indexes")
            
            if not tables:
                issues.append("No tables found in database")
                recommendations.append("Run Django migrations")
            
            if 'sqlite' in db_engine.lower():
                issues.append("Using SQLite in production")
                recommendations.append("Use PostgreSQL for production")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'connection_time_ms': connection_time,
                'query_time_ms': query_time,
                'database_engine': db_engine,
                'database_name': db_name,
                'database_host': db_host,
                'database_port': db_port,
                'table_count': len(tables),
                'tables': tables[:10],  # First 10 tables
                'version_info': version_info[0] if version_info else 'Unknown',
                'pool_status': pool_status,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Database connectivity check failed: {str(e)}"],
                'recommendations': ["Check database configuration and connectivity"]
            }
    
    def check_cache_system(self) -> Dict[str, Any]:
        """Check cache system (Redis/Memcached)."""
        if not DJANGO_AVAILABLE:
            return {
                'healthy': False,
                'error': 'Django not available',
                'issues': ['Cannot check cache without Django'],
                'recommendations': ['Install and configure Django']
            }
        
        try:
            cache_backend = getattr(settings, 'CACHES', {}).get('default', {}).get('BACKEND', '')
            
            # Test cache operations
            start_time = time.time()
            cache.set('health_check', 'test_value', 60)
            cache_get_time = (time.time() - start_time) * 1000
            
            start_time = time.time()
            retrieved_value = cache.get('health_check')
            cache_retrieval_time = (time.time() - start_time) * 1000
            
            # Test cache delete
            start_time = time.time()
            cache.delete('health_check')
            cache_delete_time = (time.time() - start_time) * 1000
            
            # Verify cache integrity
            cache_integrity = retrieved_value == 'test_value'
            
            # Check cache configuration
            cache_config = getattr(settings, 'CACHES', {})
            
            issues = []
            recommendations = []
            
            if not cache_backend:
                issues.append("No cache backend configured")
                recommendations.append("Configure Redis or Memcached for caching")
            
            if not cache_integrity:
                issues.append("Cache integrity check failed")
                recommendations.append("Check cache configuration and connectivity")
            
            if cache_get_time > 50:  # 50ms
                issues.append(f"Slow cache get operation: {cache_get_time:.2f}ms")
                recommendations.append("Optimize cache configuration or use faster cache backend")
            
            if 'redis' in cache_backend.lower():
                # Test Redis-specific features
                try:
                    import redis
                    redis_client = redis.from_url(cache_config['default']['LOCATION'])
                    redis_info = redis_client.info()
                    redis_memory = redis_info.get('used_memory_human', 'Unknown')
                    redis_connected = True
                except Exception as e:
                    redis_connected = False
                    issues.append(f"Redis connection failed: {str(e)}")
                    recommendations.append("Check Redis configuration and connectivity")
            else:
                redis_connected = False
                redis_memory = 'N/A'
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'cache_backend': cache_backend,
                'cache_get_time_ms': cache_get_time,
                'cache_retrieval_time_ms': cache_retrieval_time,
                'cache_delete_time_ms': cache_delete_time,
                'cache_integrity': cache_integrity,
                'redis_connected': redis_connected,
                'redis_memory_usage': redis_memory,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Cache system check failed: {str(e)}"],
                'recommendations': ["Check cache configuration and connectivity"]
            }
    
    def check_file_system(self) -> Dict[str, Any]:
        """Check file system permissions and accessibility."""
        try:
            base_dir = Path.cwd()
            
            # Check critical directories
            critical_dirs = [
                'apps',
                'config',
                'static',
                'media',
                'templates',
                'requirements'
            ]
            
            dir_status = {}
            for dir_name in critical_dirs:
                dir_path = base_dir / dir_name
                dir_status[dir_name] = {
                    'exists': dir_path.exists(),
                    'readable': dir_path.is_dir() and os.access(dir_path, os.R_OK),
                    'writable': dir_path.is_dir() and os.access(dir_path, os.W_OK)
                }
            
            # Check critical files
            critical_files = [
                'manage.py',
                'requirements/base.txt',
                '.env',
                'config/settings/base.py'
            ]
            
            file_status = {}
            for file_name in critical_files:
                file_path = base_dir / file_name
                file_status[file_name] = {
                    'exists': file_path.exists(),
                    'readable': file_path.is_file() and os.access(file_path, os.R_OK)
                }
            
            # Check disk space
            disk = psutil.disk_usage('/')
            disk_free_gb = disk.free / (1024**3)
            disk_total_gb = disk.total / (1024**3)
            disk_percent = (disk.used / disk.total) * 100
            
            # Check file permissions
            manage_py_permissions = oct(os.stat('manage.py').st_mode)[-3:]
            
            issues = []
            recommendations = []
            
            # Check directory issues
            for dir_name, status in dir_status.items():
                if not status['exists']:
                    issues.append(f"Missing directory: {dir_name}")
                    recommendations.append(f"Create missing directory: {dir_name}")
                elif not status['readable']:
                    issues.append(f"Directory not readable: {dir_name}")
                    recommendations.append(f"Fix permissions for directory: {dir_name}")
            
            # Check file issues
            for file_name, status in file_status.items():
                if not status['exists']:
                    issues.append(f"Missing file: {file_name}")
                    recommendations.append(f"Create missing file: {file_name}")
                elif not status['readable']:
                    issues.append(f"File not readable: {file_name}")
                    recommendations.append(f"Fix permissions for file: {file_name}")
            
            if disk_percent > 90:
                issues.append(f"Low disk space: {disk_percent:.1f}% used")
                recommendations.append("Free up disk space")
            
            if disk_free_gb < 1:  # Less than 1GB
                issues.append(f"Very low disk space: {disk_free_gb:.2f}GB free")
                recommendations.append("Free up disk space immediately")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'base_directory': str(base_dir),
                'directory_status': dir_status,
                'file_status': file_status,
                'disk_usage': {
                    'free_gb': disk_free_gb,
                    'total_gb': disk_total_gb,
                    'used_percent': disk_percent
                },
                'manage_py_permissions': manage_py_permissions,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"File system check failed: {str(e)}"],
                'recommendations': ["Check file system permissions and accessibility"]
            }
    
    def check_network_connectivity(self) -> Dict[str, Any]:
        """Check network connectivity and external services."""
        try:
            import socket
            import urllib.request
            import urllib.error
            
            # Test local network connectivity
            local_hosts = ['localhost', '127.0.0.1']
            local_connectivity = {}
            
            for host in local_hosts:
                try:
                    socket.create_connection((host, 80), timeout=5)
                    local_connectivity[host] = 'CONNECTED'
                except:
                    local_connectivity[host] = 'FAILED'
            
            # Test external connectivity
            external_hosts = [
                ('google.com', 80),
                ('github.com', 443),
                ('pypi.org', 443)
            ]
            
            external_connectivity = {}
            for host, port in external_hosts:
                try:
                    socket.create_connection((host, port), timeout=10)
                    external_connectivity[f"{host}:{port}"] = 'CONNECTED'
                except:
                    external_connectivity[f"{host}:{port}"] = 'FAILED'
            
            # Test HTTP requests
            http_tests = {}
            test_urls = [
                'https://www.google.com',
                'https://api.github.com',
                'https://pypi.org'
            ]
            
            for url in test_urls:
                try:
                    start_time = time.time()
                    response = urllib.request.urlopen(url, timeout=10)
                    response_time = (time.time() - start_time) * 1000
                    http_tests[url] = {
                        'status': 'SUCCESS',
                        'response_code': response.getcode(),
                        'response_time_ms': response_time
                    }
                except urllib.error.URLError as e:
                    http_tests[url] = {
                        'status': 'FAILED',
                        'error': str(e)
                    }
            
            # Check DNS resolution
            dns_tests = {}
            test_domains = ['google.com', 'github.com', 'pypi.org']
            
            for domain in test_domains:
                try:
                    socket.gethostbyname(domain)
                    dns_tests[domain] = 'RESOLVED'
                except:
                    dns_tests[domain] = 'FAILED'
            
            issues = []
            recommendations = []
            
            # Check local connectivity
            failed_local = [host for host, status in local_connectivity.items() if status == 'FAILED']
            if failed_local:
                issues.append(f"Local connectivity failed: {', '.join(failed_local)}")
                recommendations.append("Check local network configuration")
            
            # Check external connectivity
            failed_external = [host for host, status in external_connectivity.items() if status == 'FAILED']
            if failed_external:
                issues.append(f"External connectivity failed: {', '.join(failed_external)}")
                recommendations.append("Check internet connection and firewall")
            
            # Check HTTP requests
            failed_http = [url for url, result in http_tests.items() if result['status'] == 'FAILED']
            if failed_http:
                issues.append(f"HTTP requests failed: {', '.join(failed_http)}")
                recommendations.append("Check proxy settings and internet connectivity")
            
            # Check DNS
            failed_dns = [domain for domain, status in dns_tests.items() if status == 'FAILED']
            if failed_dns:
                issues.append(f"DNS resolution failed: {', '.join(failed_dns)}")
                recommendations.append("Check DNS configuration")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'local_connectivity': local_connectivity,
                'external_connectivity': external_connectivity,
                'http_tests': http_tests,
                'dns_tests': dns_tests,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Network connectivity check failed: {str(e)}"],
                'recommendations': ["Check network configuration and connectivity"]
            }
    
    def check_security_configuration(self) -> Dict[str, Any]:
        """Check security configuration."""
        if not DJANGO_AVAILABLE:
            return {
                'healthy': False,
                'error': 'Django not available',
                'issues': ['Cannot check security without Django'],
                'recommendations': ['Install and configure Django']
            }
        
        try:
            security_issues = []
            security_recommendations = []
            
            # Check SECRET_KEY
            secret_key = settings.SECRET_KEY
            if not secret_key or 'django-insecure' in secret_key:
                security_issues.append("Insecure SECRET_KEY")
                security_recommendations.append("Set a strong SECRET_KEY in production")
            
            # Check DEBUG mode
            if settings.DEBUG:
                security_issues.append("DEBUG mode enabled")
                security_recommendations.append("Disable DEBUG mode in production")
            
            # Check ALLOWED_HOSTS
            if not settings.ALLOWED_HOSTS:
                security_issues.append("ALLOWED_HOSTS not configured")
                security_recommendations.append("Configure ALLOWED_HOSTS")
            
            # Check secure settings
            secure_settings = [
                ('SECURE_SSL_REDIRECT', 'Enable SSL redirect in production'),
                ('SECURE_HSTS_SECONDS', 'Set HSTS for security'),
                ('SECURE_CONTENT_TYPE_NOSNIFF', 'Enable content type sniffing protection'),
                ('SECURE_BROWSER_XSS_FILTER', 'Enable XSS protection'),
                ('SESSION_COOKIE_SECURE', 'Use secure cookies'),
                ('CSRF_COOKIE_SECURE', 'Use secure CSRF cookies'),
                ('X_FRAME_OPTIONS', 'Set X-Frame-Options')
            ]
            
            for setting, recommendation in secure_settings:
                if not hasattr(settings, setting) or not getattr(settings, setting):
                    security_issues.append(f"Security setting missing: {setting}")
                    security_recommendations.append(recommendation)
            
            # Check installed security apps
            security_apps = ['django-axes', 'django-csp', 'django-ratelimit']
            installed_apps = settings.INSTALLED_APPS
            
            missing_security_apps = []
            for app in security_apps:
                if not any(app in installed_app for installed_app in installed_apps):
                    missing_security_apps.append(app)
            
            if missing_security_apps:
                security_issues.append(f"Missing security apps: {', '.join(missing_security_apps)}")
                security_recommendations.append("Install security apps for better protection")
            
            # Check file permissions
            try:
                manage_py_stat = os.stat('manage.py')
                if manage_py_stat.st_mode & 0o777:  # World-writable
                    security_issues.append("manage.py is world-writable")
                    security_recommendations.append("Restrict file permissions")
            except:
                pass
            
            healthy = len(security_issues) == 0
            
            return {
                'healthy': healthy,
                'secret_key_configured': bool(secret_key and 'django-insecure' not in secret_key),
                'debug_disabled': not settings.DEBUG,
                'allowed_hosts_configured': bool(settings.ALLOWED_HOSTS),
                'secure_settings_count': len([s for s, _ in secure_settings if hasattr(settings, s) and getattr(settings, s)]),
                'security_apps_installed': len([app for app in security_apps if any(app in installed_app for installed_app in installed_apps)]),
                'total_security_apps': len(security_apps),
                'issues': security_issues,
                'recommendations': security_recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Security configuration check failed: {str(e)}"],
                'recommendations': ["Check Django security configuration"]
            }
    
    def check_performance_metrics(self) -> Dict[str, Any]:
        """Check performance metrics."""
        try:
            performance_data = {}
            
            # System performance
            performance_data['system'] = {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent
            }
            
            # Process performance
            process = psutil.Process()
            performance_data['process'] = {
                'cpu_percent': process.cpu_percent(),
                'memory_mb': process.memory_info().rss / (1024**2),
                'threads': process.num_threads(),
                'open_files': process.num_fds()
            }
            
            # Django performance (if available)
            if DJANGO_AVAILABLE:
                try:
                    # Test database query time
                    start_time = time.time()
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT 1")
                    db_query_time = (time.time() - start_time) * 1000
                    
                    # Test cache time
                    start_time = time.time()
                    cache.set('perf_test', 'test', 60)
                    cache_time = (time.time() - start_time) * 1000
                    cache.delete('perf_test')
                    
                    performance_data['django'] = {
                        'db_query_time_ms': db_query_time,
                        'cache_time_ms': cache_time
                    }
                except:
                    performance_data['django'] = {'error': 'Django performance check failed'}
            
            # Performance assessment
            issues = []
            recommendations = []
            
            if performance_data['system']['cpu_percent'] > 80:
                issues.append("High CPU usage")
                recommendations.append("Optimize CPU-intensive operations")
            
            if performance_data['system']['memory_percent'] > 85:
                issues.append("High memory usage")
                recommendations.append("Optimize memory usage")
            
            if performance_data['system']['disk_percent'] > 90:
                issues.append("Low disk space")
                recommendations.append("Free up disk space")
            
            if DJANGO_AVAILABLE and 'django' in performance_data:
                django_perf = performance_data['django']
                if 'db_query_time_ms' in django_perf and django_perf['db_query_time_ms'] > 100:
                    issues.append("Slow database queries")
                    recommendations.append("Optimize database queries and indexes")
                
                if 'cache_time_ms' in django_perf and django_perf['cache_time_ms'] > 50:
                    issues.append("Slow cache operations")
                    recommendations.append("Optimize cache configuration")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'performance_data': performance_data,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Performance metrics check failed: {str(e)}"],
                'recommendations': ["Check system monitoring tools"]
            }
    
    def check_dependencies(self) -> Dict[str, Any]:
        """Check Python dependencies."""
        try:
            # Read requirements files
            requirements_files = [
                'requirements/base.txt',
                'requirements/local.txt',
                'requirements/production.txt'
            ]
            
            requirements_status = {}
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
                                'requirements': requirements[:10]  # First 10
                            }
                    except Exception as e:
                        requirements_status[req_file] = {
                            'exists': True,
                            'error': str(e)
                        }
                else:
                    requirements_status[req_file] = {'exists': False}
            
            # Check installed packages
            try:
                import pkg_resources
                installed_packages = {pkg.key: pkg.version for pkg in pkg_resources.working_set}
            except ImportError:
                installed_packages = {}
            
            # Check for missing packages
            missing_packages = []
            outdated_packages = []
            
            for req_file, status in requirements_status.items():
                if status.get('exists') and 'requirements' in status:
                    for requirement in status['requirements']:
                        try:
                            # Parse requirement (simplified)
                            package_name = requirement.split('==')[0].split('>=')[0].split('<=')[0].strip()
                            
                            if package_name not in installed_packages:
                                missing_packages.append(f"{package_name} (from {req_file})")
                        except:
                            continue
            
            # Check critical dependencies
            critical_deps = ['django', 'psycopg2-binary', 'redis', 'celery', 'djangorestframework']
            missing_critical = [dep for dep in critical_deps if dep not in installed_packages]
            
            issues = []
            recommendations = []
            
            if missing_critical:
                issues.append(f"Missing critical dependencies: {', '.join(missing_critical)}")
                recommendations.append(f"Install critical dependencies: pip install {' '.join(missing_critical)}")
            
            if missing_packages:
                issues.append(f"Missing packages: {len(missing_packages)} total")
                recommendations.append("Install missing packages from requirements files")
            
            if not requirements_status.get('requirements/base.txt', {}).get('exists'):
                issues.append("Base requirements file missing")
                recommendations.append("Create requirements/base.txt file")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'requirements_files': requirements_status,
                'installed_packages_count': len(installed_packages),
                'missing_packages': missing_packages[:10],  # First 10
                'missing_critical': missing_critical,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Dependencies check failed: {str(e)}"],
                'recommendations': ["Check Python package management"]
            }
    
    def check_configuration_files(self) -> Dict[str, Any]:
        """Check configuration files."""
        try:
            config_files = [
                '.env',
                '.env.example',
                'docker-compose.yml',
                'docker-compose.prod.yml',
                'Dockerfile',
                'k8s/deployment.yaml',
                'k8s/service.yaml',
                'pytest.ini',
                'mypy.ini',
                '.flake8'
            ]
            
            config_status = {}
            for config_file in config_files:
                file_path = Path(config_file)
                config_status[config_file] = {
                    'exists': file_path.exists(),
                    'readable': file_path.is_file() and os.access(file_path, os.R_OK) if file_path.is_file() else False
                }
            
            # Check .env file
            env_file_status = {}
            if Path('.env').exists():
                try:
                    with open('.env', 'r') as f:
                        env_content = f.read()
                        env_lines = [line.strip() for line in env_content.split('\n') if line.strip() and not line.startswith('#')]
                        env_file_status = {
                            'exists': True,
                            'lines_count': len(env_lines),
                            'variables_count': len([line for line in env_lines if '=' in line]),
                            'sample_lines': env_lines[:5]  # First 5 lines
                        }
                except Exception as e:
                    env_file_status = {'exists': True, 'error': str(e)}
            else:
                env_file_status = {'exists': False}
            
            # Check Docker configuration
            docker_files = [f for f in config_files if f.startswith('docker') or f == 'Dockerfile']
            docker_exists = any(config_status.get(f, {}).get('exists', False) for f in docker_files)
            
            # Check Kubernetes configuration
            k8s_files = [f for f in config_files if f.startswith('k8s/')]
            k8s_exists = any(config_status.get(f, {}).get('exists', False) for f in k8s_files)
            
            issues = []
            recommendations = []
            
            if not env_file_status.get('exists'):
                issues.append(".env file missing")
                recommendations.append("Create .env file from .env.example")
            
            if not docker_exists:
                issues.append("Docker configuration missing")
                recommendations.append("Create Docker configuration files")
            
            if not k8s_exists:
                issues.append("Kubernetes configuration missing")
                recommendations.append("Create Kubernetes deployment files")
            
            if not config_status.get('pytest.ini', {}).get('exists'):
                issues.append("pytest.ini missing")
                recommendations.append("Create pytest configuration")
            
            if not config_status.get('mypy.ini', {}).get('exists'):
                issues.append("mypy.ini missing")
                recommendations.append("Create mypy configuration")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'config_files': config_status,
                'env_file_status': env_file_status,
                'docker_configured': docker_exists,
                'k8s_configured': k8s_exists,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Configuration files check failed: {str(e)}"],
                'recommendations': ["Check configuration files and permissions"]
            }
    
    def check_log_files(self) -> Dict[str, Any]:
        """Check log files and logging configuration."""
        try:
            log_files = [
                'django.log',
                'django_error.log',
                'error.log',
                'server.log',
                'gunicorn.log'
            ]
            
            log_status = {}
            for log_file in log_files:
                file_path = Path(log_file)
                if file_path.exists():
                    try:
                        stat = file_path.stat()
                        log_status[log_file] = {
                            'exists': True,
                            'size_mb': stat.st_size / (1024**2),
                            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            'readable': os.access(file_path, os.R_OK)
                        }
                    except Exception as e:
                        log_status[log_file] = {'exists': True, 'error': str(e)}
                else:
                    log_status[log_file] = {'exists': False}
            
            # Check logging configuration (if Django available)
            logging_config = {}
            if DJANGO_AVAILABLE:
                logging_config = {
                    'log_level': getattr(settings, 'LOG_LEVEL', 'INFO'),
                    'loggers': getattr(settings, 'LOGGING', {}),
                    'log_file': getattr(settings, 'LOG_FILE', None)
                }
            
            # Check for large log files
            large_logs = [file for file, status in log_status.items() 
                          if status.get('exists') and status.get('size_mb', 0) > 100]  # > 100MB
            
            # Check for old log files
            old_logs = []
            for file, status in log_status.items():
                if status.get('exists') and 'modified' in status:
                    try:
                        modified_date = datetime.fromisoformat(status['modified'])
                        if datetime.now() - modified_date > timedelta(days=30):
                            old_logs.append(file)
                    except:
                        pass
            
            issues = []
            recommendations = []
            
            if large_logs:
                issues.append(f"Large log files: {', '.join(large_logs)}")
                recommendations.append("Rotate or clean up large log files")
            
            if old_logs:
                issues.append(f"Old log files: {len(old_logs)} files")
                recommendations.append("Clean up old log files")
            
            if not any(log_status.values()):
                issues.append("No log files found")
                recommendations.append("Configure logging for better debugging")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'log_files': log_status,
                'logging_config': logging_config,
                'large_logs': large_logs,
                'old_logs': old_logs,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Log files check failed: {str(e)}"],
                'recommendations': ["Check log files and permissions"]
            }
    
    def check_background_services(self) -> Dict[str, Any]:
        """Check background services (Celery, Redis, etc.)."""
        try:
            services = {}
            
            # Check Redis
            redis_status = 'UNKNOWN'
            try:
                import redis
                redis_client = redis.from_url('redis://localhost:6379/0')
                redis_client.ping()
                redis_status = 'RUNNING'
            except:
                redis_status = 'STOPPED'
            
            # Check Celery (if available)
            celery_status = 'UNKNOWN'
            try:
                from celery import Celery
                app = Celery('learning_hub')
                inspect = app.control.inspect()
                stats = inspect.stats()
                if stats:
                    celery_status = 'RUNNING'
                else:
                    celery_status = 'STOPPED'
            except:
                celery_status = 'NOT_CONFIGURED'
            
            # Check for running processes
            process_names = ['redis', 'celery', 'gunicorn', 'nginx']
            running_processes = {}
            
            for proc in psutil.process_iter(['pid', 'name', 'status']):
                try:
                    if proc.info['name'] in process_names:
                        running_processes[proc.info['name']] = {
                            'pid': proc.info['pid'],
                            'status': proc.info['status']
                        }
                except:
                    continue
            
            services = {
                'redis': redis_status,
                'celery': celery_status,
                'running_processes': running_processes
            }
            
            issues = []
            recommendations = []
            
            if redis_status != 'RUNNING':
                issues.append(f"Redis not running: {redis_status}")
                recommendations.append("Start Redis service")
            
            if celery_status == 'STOPPED':
                issues.append("Celery workers not running")
                recommendations.append("Start Celery workers")
            
            if not running_processes.get('gunicorn'):
                issues.append("Gunicorn not running")
                recommendations.append("Start Gunicorn server")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'services': services,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"Background services check failed: {str(e)}"],
                'recommendations': ["Check background services configuration"]
            }
    
    def check_api_endpoints(self) -> Dict[str, Any]:
        """Check API endpoint availability."""
        if not DJANGO_AVAILABLE:
            return {
                'healthy': False,
                'error': 'Django not available',
                'issues': ['Cannot check API endpoints without Django'],
                'recommendations': ['Install and configure Django']
            }
        
        try:
            client = Client()
            
            # Test critical endpoints
            endpoints = [
                ('/api/v1/courses/', 'Course List'),
                ('/api/v1/categories/', 'Categories'),
                ('/health/', 'Health Check'),
                ('/api/users/profile/', 'User Profile')
            ]
            
            endpoint_status = {}
            
            for endpoint, name in endpoints:
                try:
                    start_time = time.time()
                    response = client.get(endpoint)
                    response_time = (time.time() - start_time) * 1000
                    
                    endpoint_status[name] = {
                        'endpoint': endpoint,
                        'status_code': response.status_code,
                        'response_time_ms': response_time,
                        'healthy': response.status_code < 400
                    }
                except Exception as e:
                    endpoint_status[name] = {
                        'endpoint': endpoint,
                        'error': str(e),
                        'healthy': False
                    }
            
            # Calculate overall statistics
            total_endpoints = len(endpoint_status)
            healthy_endpoints = len([ep for ep in endpoint_status.values() if ep.get('healthy', False)])
            avg_response_time = statistics.mean([ep.get('response_time_ms', 0) for ep in endpoint_status.values() if 'response_time_ms' in ep])
            
            issues = []
            recommendations = []
            
            unhealthy_endpoints = [name for name, ep in endpoint_status.items() if not ep.get('healthy', False)]
            if unhealthy_endpoints:
                issues.append(f"Unhealthy endpoints: {', '.join(unhealthy_endpoints)}")
                recommendations.append("Fix unhealthy API endpoints")
            
            if avg_response_time > 500:  # 500ms
                issues.append(f"Slow API response time: {avg_response_time:.2f}ms")
                recommendations.append("Optimize API performance")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'endpoints': endpoint_status,
                'total_endpoints': total_endpoints,
                'healthy_endpoints': healthy_endpoints,
                'avg_response_time_ms': avg_response_time,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"API endpoints check failed: {str(e)}"],
                'recommendations': ["Check Django configuration and API endpoints"]
            }
    
    def check_ml_services(self) -> Dict[str, Any]:
        """Check ML services availability and performance."""
        if not DJANGO_AVAILABLE:
            return {
                'healthy': False,
                'error': 'Django not available',
                'issues': ['Cannot check ML services without Django'],
                'recommendations': ['Install and configure Django']
            }
        
        try:
            ml_services = {}
            
            # Check AI Engine services
            try:
                from apps.ai_engine.enhanced_services import EnhancedRAGService
                rag_service = EnhancedRAGService()
                
                # Test RAG service
                start_time = time.time()
                context = rag_service.get_context_for_query("test query", limit=3)
                rag_time = (time.time() - start_time) * 1000
                
                ml_services['rag_service'] = {
                    'status': 'RUNNING',
                    'response_time_ms': rag_time,
                    'healthy': rag_time < 200  # 200ms threshold
                }
            except Exception as e:
                ml_services['rag_service'] = {
                    'status': 'ERROR',
                    'error': str(e),
                    'healthy': False
                }
            
            # Check ML integration
            try:
                from apps.ai_engine.ml_integration import RealTimeMLIntegration
                ml_integration = RealTimeMLIntegration()
                
                # Test ML integration
                start_time = time.time()
                recommendations = ml_integration.get_real_time_recommendations(1, 'test', 3)
                ml_time = (time.time() - start_time) * 1000
                
                ml_services['ml_integration'] = {
                    'status': 'RUNNING',
                    'response_time_ms': ml_time,
                    'healthy': ml_time < 200
                }
            except Exception as e:
                ml_services['ml_integration'] = {
                    'status': 'ERROR',
                    'error': str(e),
                    'healthy': False
                }
            
            # Check adaptive learning engine
            try:
                from apps.ai_engine.adaptive_learning_engine_v2 import AdaptiveLearningEngine
                adaptive_engine = AdaptiveLearningEngine()
                
                # Test adaptive learning
                start_time = time.time()
                path = adaptive_engine.generate_adaptive_path(1, 1)
                adaptive_time = (time.time() - start_time) * 1000
                
                ml_services['adaptive_learning'] = {
                    'status': 'RUNNING',
                    'response_time_ms': adaptive_time,
                    'healthy': adaptive_time < 300  # 300ms threshold
                }
            except Exception as e:
                ml_services['adaptive_learning'] = {
                    'status': 'ERROR',
                    'error': str(e),
                    'healthy': False
                }
            
            # Check monitoring
            try:
                from apps.ai_engine.ml_monitoring import MLMetricsCollector
                metrics_collector = MLMetricsCollector()
                
                ml_services['monitoring'] = {
                    'status': 'RUNNING',
                    'healthy': True
                }
            except Exception as e:
                ml_services['monitoring'] = {
                    'status': 'ERROR',
                    'error': str(e),
                    'healthy': False
                }
            
            # Calculate overall ML health
            total_services = len(ml_services)
            healthy_services = len([service for service in ml_services.values() if service.get('healthy', False)])
            
            issues = []
            recommendations = []
            
            unhealthy_ml_services = [name for name, service in ml_services.items() if not service.get('healthy', False)]
            if unhealthy_ml_services:
                issues.append(f"Unhealthy ML services: {', '.join(unhealthy_ml_services)}")
                recommendations.append("Fix unhealthy ML services")
            
            if healthy_services < total_services:
                issues.append(f"Only {healthy_services}/{total_services} ML services healthy")
                recommendations.append("Check ML service configuration and dependencies")
            
            healthy = len(issues) == 0
            
            return {
                'healthy': healthy,
                'services': ml_services,
                'total_services': total_services,
                'healthy_services': healthy_services,
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'issues': [f"ML services check failed: {str(e)}"],
                'recommendations': ["Check ML services configuration and dependencies"]
            }
    
    def generate_health_report(self) -> Dict[str, Any]:
        """Generate comprehensive health report."""
        end_time = time.time()
        duration = end_time - self.start_time
        
        # Calculate overall health
        total_checks = len(self.health_status)
        healthy_checks = len([check for check in self.health_status.values() 
                           if isinstance(check, dict) and check.get('healthy', False)])
        
        overall_health = healthy_checks / total_checks if total_checks > 0 else 0
        
        # Determine status
        if overall_health == 1.0:
            status = 'EXCELLENT'
        elif overall_health >= 0.8:
            status = 'GOOD'
        elif overall_health >= 0.6:
            status = 'FAIR'
        elif overall_health >= 0.4:
            status = 'POOR'
        else:
            status = 'CRITICAL'
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'duration_seconds': duration,
            'overall_health': overall_health,
            'status': status,
            'summary': {
                'total_checks': total_checks,
                'healthy_checks': healthy_checks,
                'unhealthy_checks': total_checks - healthy_checks,
                'issues_count': len(self.issues),
                'recommendations_count': len(self.recommendations)
            },
            'health_status': self.health_status,
            'issues': self.issues,
            'recommendations': self.recommendations,
            'checks_performed': self.checks_performed
        }
        
        # Save report to file
        report_file = f"health_check_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Health check report saved to {report_file}")
        
        return report

def main():
    """Main health check function."""
    health_checker = SystemHealthChecker()
    
    print("🏥 Starting Comprehensive System Health Check...")
    print("=" * 60)
    
    # Run health check
    report = health_checker.run_comprehensive_health_check()
    
    # Display results
    print(f"\n📊 Health Check Results:")
    print("=" * 60)
    print(f"Overall Health: {report['overall_health']:.1%} ({report['status']})")
    print(f"Duration: {report['duration_seconds']:.2f} seconds")
    print(f"Total Checks: {report['summary']['total_checks']}")
    print(f"Healthy Checks: {report['summary']['healthy_checks']}")
    print(f"Issues Found: {report['summary']['issues_count']}")
    
    print(f"\n📋 Check Results:")
    print("=" * 60)
    
    for check_name, result in report['health_status'].items():
        if isinstance(result, dict):
            healthy = result.get('healthy', False)
            status = '✅ HEALTHY' if healthy else '❌ UNHEALTHY'
            print(f"{check_name}: {status}")
            
            if not healthy and 'issues' in result:
                for issue in result['issues'][:2]:  # First 2 issues
                    print(f"  - {issue}")
    
    if report['issues']:
        print(f"\n⚠️  Issues Found ({len(report['issues'])}):")
        print("=" * 60)
        for i, issue in enumerate(report['issues'][:10], 1):  # First 10 issues
            print(f"{i}. {issue}")
        
        if len(report['issues']) > 10:
            print(f"... and {len(report['issues']) - 10} more")
    
    if report['recommendations']:
        print(f"\n💡 Recommendations ({len(report['recommendations'])}):")
        print("=" * 60)
        for i, rec in enumerate(report['recommendations'][:10], 1):  # First 10 recommendations
            print(f"{i}. {rec}")
        
        if len(report['recommendations']) > 10:
            print(f"... and {len(report['recommendations']) - 10} more")
    
    print(f"\n🎯 Next Steps:")
    print("=" * 60)
    
    if report['status'] == 'EXCELLENT':
        print("✅ System is in excellent health!")
        print("📈 Monitor performance regularly")
        print("🔄 Keep dependencies updated")
    elif report['status'] == 'GOOD':
        print("✅ System is healthy with minor issues")
        print("🔧 Address the minor issues found")
        print("📊 Monitor system performance")
    elif report['status'] == 'FAIR':
        print("⚠️  System has some issues that need attention")
        print("🔧 Address the issues found in the report")
        print("📋 Follow the recommendations provided")
    elif report['status'] == 'POOR':
        print("❌ System has significant issues")
        print("🚨 Address critical issues immediately")
        print("📋 Follow all recommendations")
        print("🔄 Consider system maintenance")
    else:
        print("🚨 System is in critical condition")
        print("🆘 Address all critical issues immediately")
        print("📋 Follow all recommendations urgently")
        print("🚀 Consider system recovery")
    
    return report

if __name__ == '__main__':
    main()
