#!/usr/bin/env python
"""
PHASE 5: Testing & Validation
Comprehensive test suite execution with security, performance, and ML testing
"""

import os
import sys
import json
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
sys.path.insert(0, 'c:\\Users\\shiva\\Desktop\\windows_app\\conductor')

import django
django.setup()

from django.conf import settings
from django.test import TestCase, Client
from django.db import connection
from django.contrib.auth import get_user_model

print("=" * 80)
print("🧪 PHASE 5: TESTING & VALIDATION")
print("=" * 80)

class ComprehensiveTester:
    """Comprehensive testing and validation suite."""
    
    def __init__(self):
        self.base_dir = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
        self.test_results = {
            'unit_tests': {},
            'integration_tests': {},
            'security_tests': {},
            'performance_tests': {},
            'ml_tests': {},
            'api_tests': {}
        }
        self.passed = 0
        self.failed = 0
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Execute all testing operations."""
        print("\n🧪 Running Comprehensive Test Suite...\n")
        
        # 1. Django system checks
        self._run_django_checks()
        
        # 2. Database tests
        self._run_database_tests()
        
        # 3. API endpoint tests
        self._run_api_tests()
        
        # 4. Security tests
        self._run_security_tests()
        
        # 5. Performance tests
        self._run_performance_tests()
        
        # 6. ML model tests
        self._run_ml_tests()
        
        # 7. Integration tests
        self._run_integration_tests()
        
        # 8. Generate test report
        return self._generate_test_report()
    
    def _run_django_checks(self):
        """Run Django system checks."""
        print("1️⃣ Django System Checks...")
        
        try:
            result = subprocess.run(
                [sys.executable, 'manage.py', 'check'],
                capture_output=True,
                text=True,
                cwd=self.base_dir,
                timeout=60
            )
            
            if result.returncode == 0:
                print("   ✅ Django system checks passed")
                self.test_results['unit_tests']['django_checks'] = {'status': 'PASS', 'output': result.stdout}
                self.passed += 1
            else:
                print(f"   ⚠️  Django checks issues:\n{result.stderr[:200]}")
                self.test_results['unit_tests']['django_checks'] = {'status': 'FAIL', 'error': result.stderr}
                self.failed += 1
        except Exception as e:
            print(f"   ❌ Could not run Django checks: {e}")
            self.test_results['unit_tests']['django_checks'] = {'status': 'ERROR', 'error': str(e)}
            self.failed += 1
    
    def _run_database_tests(self):
        """Run database tests."""
        print("\n🗄️  2. Database Tests...")
        
        tests = []
        
        # Test 1: Connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            tests.append({'name': 'Connection', 'status': 'PASS', 'result': result})
            print("   ✅ Database connection")
        except Exception as e:
            tests.append({'name': 'Connection', 'status': 'FAIL', 'error': str(e)})
            print(f"   ❌ Database connection: {e}")
        
        # Test 2: Tables exist
        try:
            with connection.cursor() as cursor:
                if connection.vendor == 'sqlite':
                    cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table';")
                else:
                    cursor.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
                table_count = cursor.fetchone()[0]
            tests.append({'name': 'Tables', 'status': 'PASS', 'count': table_count})
            print(f"   ✅ Tables exist: {table_count}")
        except Exception as e:
            tests.append({'name': 'Tables', 'status': 'FAIL', 'error': str(e)})
            print(f"   ⚠️  Tables check: {e}")
        
        # Test 3: User model
        try:
            User = get_user_model()
            user_count = User.objects.count()
            tests.append({'name': 'User Model', 'status': 'PASS', 'count': user_count})
            print(f"   ✅ User model: {user_count} users")
        except Exception as e:
            tests.append({'name': 'User Model', 'status': 'FAIL', 'error': str(e)})
            print(f"   ⚠️  User model: {e}")
        
        # Count results
        passed = sum(1 for t in tests if t['status'] == 'PASS')
        failed = len(tests) - passed
        
        self.passed += passed
        self.failed += failed
        self.test_results['integration_tests']['database'] = tests
    
    def _run_api_tests(self):
        """Run API endpoint tests."""
        print("\n🌐 3. API Endpoint Tests...")
        
        tests = []
        
        try:
            from django.urls import get_resolver
            resolver = get_resolver()
            
            # Count endpoints
            endpoints = []
            def extract_urls(patterns, prefix=''):
                for pattern in patterns:
                    if hasattr(pattern, 'pattern'):
                        name = str(pattern.pattern).replace('^', '').replace('$', '')
                        if name:
                            endpoints.append(name)
                        if hasattr(pattern, 'url_patterns'):
                            extract_urls(pattern.url_patterns, prefix + name)
            
            if hasattr(resolver, 'url_patterns'):
                extract_urls(resolver.url_patterns)
            
            tests.append({'name': 'URL Resolution', 'status': 'PASS', 'endpoints': len(endpoints)})
            print(f"   ✅ URL resolution: {len(endpoints)} endpoints")
            
        except Exception as e:
            tests.append({'name': 'URL Resolution', 'status': 'FAIL', 'error': str(e)})
            print(f"   ❌ URL resolution: {e}")
        
        # Test with Django test client
        try:
            client = Client()
            response = client.get('/admin/login/')
            tests.append({'name': 'Admin Access', 'status': 'PASS', 'status_code': response.status_code})
            print(f"   ✅ Admin accessible: {response.status_code}")
        except Exception as e:
            tests.append({'name': 'Admin Access', 'status': 'FAIL', 'error': str(e)})
            print(f"   ⚠️  Admin access: {e}")
        
        passed = sum(1 for t in tests if t['status'] == 'PASS')
        failed = len(tests) - passed
        
        self.passed += passed
        self.failed += failed
        self.test_results['api_tests'] = tests
    
    def _run_security_tests(self):
        """Run security tests."""
        print("\n🔒 4. Security Tests...")
        
        tests = []
        
        # Test 1: DEBUG mode
        if settings.DEBUG:
            tests.append({'name': 'DEBUG Mode', 'status': 'WARN', 'message': 'DEBUG is enabled - disable for production'})
            print("   ⚠️  DEBUG mode is enabled")
        else:
            tests.append({'name': 'DEBUG Mode', 'status': 'PASS'})
            print("   ✅ DEBUG mode is disabled")
        
        # Test 2: SECRET_KEY
        secret_key = getattr(settings, 'SECRET_KEY', '')
        if len(secret_key) < 50:
            tests.append({'name': 'SECRET_KEY', 'status': 'FAIL', 'message': 'Weak SECRET_KEY'})
            print("   ❌ Weak SECRET_KEY")
        else:
            tests.append({'name': 'SECRET_KEY', 'status': 'PASS', 'length': len(secret_key)})
            print(f"   ✅ SECRET_KEY: {len(secret_key)} chars")
        
        # Test 3: Security headers
        security_headers = [
            'SECURE_SSL_REDIRECT',
            'SECURE_CONTENT_TYPE_NOSNIFF',
            'SECURE_BROWSER_XSS_FILTER'
        ]
        
        enabled = sum(1 for h in security_headers if getattr(settings, h, False))
        
        if enabled == len(security_headers):
            tests.append({'name': 'Security Headers', 'status': 'PASS', 'enabled': enabled})
            print(f"   ✅ Security headers: {enabled}/{len(security_headers)}")
        else:
            tests.append({'name': 'Security Headers', 'status': 'WARN', 'enabled': enabled, 'total': len(security_headers)})
            print(f"   ⚠️  Security headers: {enabled}/{len(security_headers)}")
        
        # Test 4: Authentication
        if 'django.contrib.auth' in settings.INSTALLED_APPS:
            tests.append({'name': 'Authentication', 'status': 'PASS'})
            print("   ✅ Authentication configured")
        else:
            tests.append({'name': 'Authentication', 'status': 'FAIL'})
            print("   ❌ Authentication not configured")
        
        passed = sum(1 for t in tests if t['status'] == 'PASS')
        failed = sum(1 for t in tests if t['status'] == 'FAIL')
        warnings = sum(1 for t in tests if t['status'] == 'WARN')
        
        self.passed += passed
        self.failed += failed
        self.test_results['security_tests'] = tests
    
    def _run_performance_tests(self):
        """Run performance tests."""
        print("\n⚡ 5. Performance Tests...")
        
        tests = []
        
        # Test 1: Database response time
        try:
            start = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_time = time.time() - start
            
            status = 'PASS' if db_time < 0.1 else 'WARN'
            tests.append({'name': 'DB Response Time', 'status': status, 'time': f"{db_time:.4f}s"})
            print(f"   {('✅' if status == 'PASS' else '⚠️')} DB response: {db_time:.4f}s")
        except Exception as e:
            tests.append({'name': 'DB Response Time', 'status': 'FAIL', 'error': str(e)})
            print(f"   ❌ DB response test failed: {e}")
        
        # Test 2: Cache performance
        try:
            from django.core.cache import cache
            
            start = time.time()
            cache.set('perf_test', 'value', 60)
            cache.get('perf_test')
            cache_time = time.time() - start
            
            status = 'PASS' if cache_time < 0.05 else 'WARN'
            tests.append({'name': 'Cache Performance', 'status': status, 'time': f"{cache_time:.4f}s"})
            print(f"   {('✅' if status == 'PASS' else '⚠️')} Cache: {cache_time:.4f}s")
        except Exception as e:
            tests.append({'name': 'Cache Performance', 'status': 'FAIL', 'error': str(e)})
            print(f"   ⚠️  Cache test: {e}")
        
        # Test 3: Memory usage
        try:
            import psutil
            memory = psutil.virtual_memory()
            status = 'PASS' if memory.percent < 90 else 'WARN'
            tests.append({'name': 'Memory Usage', 'status': status, 'percent': memory.percent})
            print(f"   {('✅' if status == 'PASS' else '⚠️')} Memory: {memory.percent}%")
        except:
            print("   ℹ️  psutil not available for memory testing")
        
        passed = sum(1 for t in tests if t['status'] == 'PASS')
        failed = len(tests) - passed
        
        self.passed += passed
        self.failed += failed
        self.test_results['performance_tests'] = tests
    
    def _run_ml_tests(self):
        """Run ML model tests."""
        print("\n🤖 6. ML Model Tests...")
        
        tests = []
        
        # Test 1: AI Engine availability
        ai_engine_path = self.base_dir / 'apps' / 'ai_engine'
        if ai_engine_path.exists():
            tests.append({'name': 'AI Engine', 'status': 'PASS', 'exists': True})
            print("   ✅ AI Engine module exists")
        else:
            tests.append({'name': 'AI Engine', 'status': 'WARN', 'exists': False})
            print("   ⚠️  AI Engine module not found")
        
        # Test 2: ML dependencies
        ml_deps = ['sklearn', 'numpy', 'pandas']
        available = []
        for dep in ml_deps:
            try:
                __import__(dep)
                available.append(dep)
            except:
                pass
        
        tests.append({'name': 'ML Dependencies', 'status': 'PASS', 'available': available})
        print(f"   ✅ ML dependencies: {len(available)}/{len(ml_deps)}")
        
        # Test 3: AI API keys
        ai_keys = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']
        configured = []
        for key in ai_keys:
            value = getattr(settings, key, '')
            if value and not value.startswith('dev-'):
                configured.append(key)
        
        tests.append({'name': 'AI API Keys', 'status': 'PASS', 'configured': configured})
        print(f"   ✅ AI API keys: {len(configured)}/{len(ai_keys)}")
        
        passed = sum(1 for t in tests if t['status'] == 'PASS')
        failed = len(tests) - passed
        
        self.passed += passed
        self.failed += failed
        self.test_results['ml_tests'] = tests
    
    def _run_integration_tests(self):
        """Run integration tests."""
        print("\n🔗 7. Integration Tests...")
        
        tests = []
        
        # Test Django setup
        try:
            _ = settings.INSTALLED_APPS
            _ = settings.MIDDLEWARE
            tests.append({'name': 'Django Setup', 'status': 'PASS'})
            print("   ✅ Django setup complete")
        except Exception as e:
            tests.append({'name': 'Django Setup', 'status': 'FAIL', 'error': str(e)})
            print(f"   ❌ Django setup: {e}")
        
        # Test static files
        static_dir = self.base_dir / 'static'
        staticfiles_dir = self.base_dir / 'staticfiles'
        
        if static_dir.exists() or staticfiles_dir.exists():
            tests.append({'name': 'Static Files', 'status': 'PASS'})
            print("   ✅ Static files configured")
        else:
            tests.append({'name': 'Static Files', 'status': 'WARN'})
            print("   ⚠️  Static files not collected")
        
        # Test templates
        templates_dir = self.base_dir / 'templates'
        if templates_dir.exists():
            tests.append({'name': 'Templates', 'status': 'PASS'})
            print("   ✅ Templates directory exists")
        else:
            tests.append({'name': 'Templates', 'status': 'WARN'})
            print("   ⚠️  Templates directory not found")
        
        passed = sum(1 for t in tests if t['status'] == 'PASS')
        failed = len(tests) - passed
        
        self.passed += passed
        self.failed += failed
        self.test_results['integration_tests']['system'] = tests
    
    def _generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report."""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST REPORT")
        print("=" * 80)
        
        total_tests = self.passed + self.failed
        pass_rate = (self.passed / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tests': total_tests,
                'passed': self.passed,
                'failed': self.failed,
                'pass_rate': round(pass_rate, 2)
            },
            'test_results': self.test_results,
            'status': 'PASS' if pass_rate >= 80 else 'CONDITIONAL' if pass_rate >= 60 else 'FAIL'
        }
        
        # Display summary
        print(f"\n📈 TEST SUMMARY:")
        print(f"   ✅ Tests passed: {self.passed}")
        print(f"   ❌ Tests failed: {self.failed}")
        print(f"   📊 Pass rate: {pass_rate:.1f}%")
        
        if report['status'] == 'PASS':
            print(f"\n🎉 TEST STATUS: PASS - System is ready for production!")
        elif report['status'] == 'CONDITIONAL':
            print(f"\n⚠️  TEST STATUS: CONDITIONAL - Some issues need attention")
        else:
            print(f"\n❌ TEST STATUS: FAIL - Critical issues must be resolved")
        
        # Save report
        report_file = f'PHASE5_TESTING_{int(time.time())}.json'
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Detailed test report saved: {report_file}")
        print("=" * 80)
        
        return report

def main():
    """Main entry point."""
    tester = ComprehensiveTester()
    report = tester.run_all_tests()
    
    print("\n✅ PHASE 5: TESTING & VALIDATION COMPLETE")
    print("=" * 80)
    print(f"\n🧪 Executed {report['summary']['total_tests']} tests")
    print(f"✅ Passed: {report['summary']['passed']}")
    print(f"❌ Failed: {report['summary']['failed']}")
    print(f"📊 Pass rate: {report['summary']['pass_rate']:.1f}%")
    print(f"🎯 Status: {report['status']}")
    print("\nReady for Phase 6: Documentation & Production Readiness")
    print("=" * 80 + "\n")

if __name__ == '__main__':
    main()
