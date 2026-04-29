#!/usr/bin/env python
"""
Django Website Enhancement & Debug Suite
Comprehensive tools for enhancing, testing, and debugging the Django website
"""

import os
import sys
import time
import json
import logging
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import subprocess
import requests
import psutil

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('website_debug.log')
    ]
)
logger = logging.getLogger(__name__)

class WebsiteEnhancementSuite:
    """Comprehensive website enhancement and debugging suite."""
    
    def __init__(self):
        self.base_dir = "c:\\Users\\shiva\\Desktop\\windows_app\\conductor"
        self.django_available = self._check_django()
        self.components = {}
        self.issues = []
        self.enhancements = []
        
    def _check_django(self) -> bool:
        """Check if Django is available."""
        try:
            import django
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
            django.setup()
            return True
        except:
            return False
    
    def run_full_enhancement(self) -> Dict[str, Any]:
        """Run complete website enhancement process."""
        print("=" * 80)
        print("🔧 DJANGO WEBSITE ENHANCEMENT & DEBUG SUITE")
        print("=" * 80)
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'django_available': self.django_available,
            'components': {},
            'issues': [],
            'enhancements': [],
            'recommendations': []
        }
        
        # 1. System Health Check
        print("\n1️⃣ Running System Health Check...")
        health = self._check_system_health()
        results['components']['system_health'] = health
        print(f"   System Health: {health['status']} ({health['score']}/100)")
        
        # 2. Django Configuration Check
        print("\n2️⃣ Checking Django Configuration...")
        if self.django_available:
            django_check = self._check_django_config()
            results['components']['django_config'] = django_check
            print(f"   Django Status: {django_check['status']}")
        else:
            print("   ⚠️ Django not available - skipping Django checks")
        
        # 3. Database Analysis
        print("\n3️⃣ Analyzing Database...")
        db_analysis = self._analyze_database()
        results['components']['database'] = db_analysis
        print(f"   Database Status: {db_analysis['status']}")
        
        # 4. API Endpoints Check
        print("\n4️⃣ Checking API Endpoints...")
        api_check = self._check_api_endpoints()
        results['components']['api'] = api_check
        print(f"   API Status: {api_check['status']} ({len(api_check.get('endpoints', []))} endpoints)")
        
        # 5. Static & Media Files
        print("\n5️⃣ Checking Static & Media Files...")
        static_check = self._check_static_files()
        results['components']['static_files'] = static_check
        print(f"   Static Files: {static_check['status']}")
        
        # 6. Security Audit
        print("\n6️⃣ Running Security Audit...")
        security = self._security_audit()
        results['components']['security'] = security
        print(f"   Security Score: {security['score']}/100")
        
        # 7. Performance Analysis
        print("\n7️⃣ Analyzing Performance...")
        performance = self._analyze_performance()
        results['components']['performance'] = performance
        print(f"   Performance Score: {performance['score']}/100")
        
        # 8. Code Quality Check
        print("\n8️⃣ Checking Code Quality...")
        quality = self._check_code_quality()
        results['components']['code_quality'] = quality
        print(f"   Code Quality: {quality['status']} ({quality['score']}/100)")
        
        # Generate Recommendations
        print("\n9️⃣ Generating Recommendations...")
        recommendations = self._generate_recommendations(results)
        results['recommendations'] = recommendations
        print(f"   Generated {len(recommendations)} recommendations")
        
        # Save Report
        report_file = f'website_enhancement_report_{int(time.time())}.json'
        with open(report_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n📄 Report saved: {report_file}")
        
        # Display Summary
        self._display_summary(results)
        
        return results
    
    def _check_system_health(self) -> Dict[str, Any]:
        """Check overall system health."""
        try:
            cpu = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            score = 100
            if cpu > 80: score -= 20
            if memory.percent > 80: score -= 20
            if disk.percent > 80: score -= 20
            
            return {
                'status': 'healthy' if score > 80 else 'warning' if score > 60 else 'critical',
                'score': score,
                'cpu': cpu,
                'memory': memory.percent,
                'disk': disk.percent
            }
        except Exception as e:
            return {'status': 'error', 'score': 0, 'error': str(e)}
    
    def _check_django_config(self) -> Dict[str, Any]:
        """Check Django configuration."""
        try:
            from django.conf import settings
            
            checks = {
                'debug': settings.DEBUG,
                'database_configured': hasattr(settings, 'DATABASES'),
                'installed_apps': len(settings.INSTALLED_APPS),
                'middleware': len(settings.MIDDLEWARE),
                'static_url': hasattr(settings, 'STATIC_URL'),
                'media_url': hasattr(settings, 'MEDIA_URL')
            }
            
            return {
                'status': 'configured' if checks['database_configured'] else 'incomplete',
                'checks': checks
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def _analyze_database(self) -> Dict[str, Any]:
        """Analyze database status."""
        try:
            if self.django_available:
                from django.db import connection
                
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                
                return {
                    'status': 'connected',
                    'engine': connection.vendor,
                    'host': connection.settings_dict.get('HOST', 'localhost')
                }
            else:
                return {'status': 'django_unavailable'}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def _check_api_endpoints(self) -> Dict[str, Any]:
        """Check API endpoints."""
        try:
            endpoints = []
            
            if self.django_available:
                from django.urls import get_resolver
                
                resolver = get_resolver()
                for pattern in resolver.url_patterns if hasattr(resolver, 'url_patterns') else []:
                    if hasattr(pattern, 'pattern'):
                        endpoints.append(str(pattern.pattern))
            
            return {
                'status': 'checked',
                'endpoints': endpoints[:20],  # First 20
                'total': len(endpoints)
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e), 'endpoints': []}
    
    def _check_static_files(self) -> Dict[str, Any]:
        """Check static and media files configuration."""
        try:
            static_dir = os.path.join(self.base_dir, 'static')
            staticfiles_dir = os.path.join(self.base_dir, 'staticfiles')
            
            static_exists = os.path.exists(static_dir)
            staticfiles_exists = os.path.exists(staticfiles_dir)
            
            return {
                'status': 'configured' if static_exists else 'missing',
                'static_exists': static_exists,
                'staticfiles_exists': staticfiles_exists,
                'static_size': self._get_dir_size(static_dir) if static_exists else 0
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def _get_dir_size(self, path: str) -> int:
        """Get directory size in bytes."""
        try:
            total = 0
            for entry in os.scandir(path):
                if entry.is_file():
                    total += entry.stat().st_size
                elif entry.is_dir():
                    total += self._get_dir_size(entry.path)
            return total
        except:
            return 0
    
    def _security_audit(self) -> Dict[str, Any]:
        """Perform security audit."""
        try:
            score = 100
            issues = []
            
            if self.django_available:
                from django.conf import settings
                
                # Check debug mode
                if settings.DEBUG:
                    score -= 20
                    issues.append("DEBUG mode is enabled")
                
                # Check secret key
                if hasattr(settings, 'SECRET_KEY'):
                    if settings.SECRET_KEY in ['', 'your-secret-key', 'change-me']:
                        score -= 30
                        issues.append("Weak or default SECRET_KEY detected")
                
                # Check allowed hosts
                if hasattr(settings, 'ALLOWED_HOSTS'):
                    if '*' in settings.ALLOWED_HOSTS or not settings.ALLOWED_HOSTS:
                        score -= 10
                        issues.append("ALLOWED_HOSTS not properly configured")
            else:
                score = 50
                issues.append("Django not available for security checks")
            
            return {
                'score': max(0, score),
                'status': 'secure' if score > 80 else 'needs_attention' if score > 60 else 'critical',
                'issues': issues
            }
        except Exception as e:
            return {'score': 0, 'status': 'error', 'issues': [str(e)]}
    
    def _analyze_performance(self) -> Dict[str, Any]:
        """Analyze performance."""
        try:
            score = 100
            
            # Check if caching is configured
            if self.django_available:
                from django.conf import settings
                
                if not hasattr(settings, 'CACHES') or not settings.CACHES:
                    score -= 20
            
            # Check database connection speed
            if self.django_available:
                import time
                from django.db import connection
                
                start = time.time()
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                response_time = time.time() - start
                
                if response_time > 0.1:
                    score -= 10
            
            return {
                'score': max(0, score),
                'status': 'optimized' if score > 80 else 'needs_optimization',
                'response_time': response_time if 'response_time' in locals() else None
            }
        except Exception as e:
            return {'score': 50, 'status': 'unknown', 'error': str(e)}
    
    def _check_code_quality(self) -> Dict[str, Any]:
        """Check code quality."""
        try:
            # Run flake8 if available
            result = subprocess.run(
                ['flake8', '--max-line-length=120', '--statistics'],
                capture_output=True,
                text=True,
                cwd=self.base_dir
            )
            
            errors = result.stdout.count('\n') if result.stdout else 0
            score = max(0, 100 - errors)
            
            return {
                'status': 'good' if score > 80 else 'needs_improvement',
                'score': score,
                'errors': errors,
                'output': result.stdout[:500] if result.stdout else ''
            }
        except Exception as e:
            return {'status': 'unknown', 'score': 50, 'error': str(e)}
    
    def _generate_recommendations(self, results: Dict) -> List[str]:
        """Generate enhancement recommendations."""
        recommendations = []
        
        # Security recommendations
        security = results['components'].get('security', {})
        if security.get('score', 100) < 100:
            recommendations.append("🔒 Fix security issues: " + ", ".join(security.get('issues', [])))
        
        # Performance recommendations
        performance = results['components'].get('performance', {})
        if performance.get('score', 100) < 80:
            recommendations.append("⚡ Optimize performance: Configure caching and optimize database queries")
        
        # Code quality recommendations
        quality = results['components'].get('code_quality', {})
        if quality.get('score', 100) < 80:
            recommendations.append("📝 Improve code quality: Fix linting errors and style issues")
        
        # Static files recommendations
        static = results['components'].get('static_files', {})
        if not static.get('staticfiles_exists', True):
            recommendations.append("📁 Run collectstatic: Static files not collected")
        
        # Database recommendations
        db = results['components'].get('database', {})
        if db.get('status') != 'connected':
            recommendations.append("🗄️ Check database: Ensure database is properly configured and running")
        
        # General recommendations
        recommendations.extend([
            "✅ Enable DEBUG=False in production",
            "✅ Use strong SECRET_KEY in production",
            "✅ Configure proper ALLOWED_HOSTS",
            "✅ Set up SSL/TLS for production",
            "✅ Configure logging for production",
            "✅ Set up automated backups",
            "✅ Implement rate limiting",
            "✅ Configure caching properly"
        ])
        
        return recommendations
    
    def _display_summary(self, results: Dict):
        """Display summary of enhancements."""
        print("\n" + "=" * 80)
        print("📊 ENHANCEMENT SUMMARY")
        print("=" * 80)
        
        # Component scores
        print("\nComponent Scores:")
        for name, component in results['components'].items():
            score = component.get('score', 0)
            status = component.get('status', 'unknown')
            icon = "✅" if score > 80 else "⚠️" if score > 60 else "❌"
            print(f"  {icon} {name.replace('_', ' ').title()}: {score}/100 ({status})")
        
        # Recommendations
        print("\n🎯 Top Recommendations:")
        for i, rec in enumerate(results['recommendations'][:10], 1):
            print(f"  {i}. {rec}")
        
        # Overall status
        scores = [c.get('score', 0) for c in results['components'].values()]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        print(f"\n🏆 Overall System Score: {avg_score:.1f}/100")
        if avg_score > 80:
            print("🌟 System Status: EXCELLENT")
        elif avg_score > 60:
            print("✅ System Status: GOOD (needs minor improvements)")
        elif avg_score > 40:
            print("⚠️ System Status: FAIR (needs attention)")
        else:
            print("❌ System Status: CRITICAL (immediate action required)")
        
        print("=" * 80 + "\n")
    
    def fix_common_issues(self):
        """Automatically fix common issues."""
        print("🔧 Auto-fixing common issues...")
        
        fixes_applied = []
        
        # Check and create static directories
        static_dir = os.path.join(self.base_dir, 'static')
        staticfiles_dir = os.path.join(self.base_dir, 'staticfiles')
        
        if not os.path.exists(static_dir):
            os.makedirs(static_dir)
            fixes_applied.append("Created static directory")
        
        if not os.path.exists(staticfiles_dir):
            os.makedirs(staticfiles_dir)
            fixes_applied.append("Created staticfiles directory")
        
        print(f"✅ Applied {len(fixes_applied)} fixes:")
        for fix in fixes_applied:
            print(f"  • {fix}")
        
        return fixes_applied
    
    def test_website(self):
        """Run comprehensive website tests."""
        print("🧪 Running Website Tests...")
        
        tests_passed = 0
        tests_failed = 0
        
        # Test 1: Django checks
        if self.django_available:
            print("\n1. Django System Checks...")
            try:
                result = subprocess.run(
                    ['python', 'manage.py', 'check'],
                    capture_output=True,
                    text=True,
                    cwd=self.base_dir
                )
                if result.returncode == 0:
                    print("   ✅ Django checks passed")
                    tests_passed += 1
                else:
                    print(f"   ❌ Django checks failed: {result.stderr}")
                    tests_failed += 1
            except Exception as e:
                print(f"   ❌ Error: {e}")
                tests_failed += 1
        
        # Test 2: Database connection
        print("\n2. Database Connection Test...")
        db_check = self._analyze_database()
        if db_check['status'] == 'connected':
            print("   ✅ Database connected")
            tests_passed += 1
        else:
            print(f"   ❌ Database issue: {db_check.get('error', 'Unknown')}")
            tests_failed += 1
        
        # Test 3: Static files
        print("\n3. Static Files Test...")
        static_check = self._check_static_files()
        if static_check['status'] == 'configured':
            print("   ✅ Static files configured")
            tests_passed += 1
        else:
            print(f"   ⚠️ Static files: {static_check['status']}")
            tests_failed += 1
        
        # Test 4: System resources
        print("\n4. System Resources Test...")
        health = self._check_system_health()
        if health['score'] > 60:
            print(f"   ✅ System healthy ({health['score']}/100)")
            tests_passed += 1
        else:
            print(f"   ⚠️ System under pressure ({health['score']}/100)")
            tests_failed += 1
        
        print(f"\n📊 Test Results: {tests_passed} passed, {tests_failed} failed")
        
        return {'passed': tests_passed, 'failed': tests_failed}

def main():
    """Main entry point."""
    print("\n" + "=" * 80)
    print("🚀 DJANGO WEBSITE ENHANCEMENT & DEBUG SUITE")
    print("=" * 80)
    
    suite = WebsiteEnhancementSuite()
    
    # Run full enhancement
    results = suite.run_full_enhancement()
    
    # Auto-fix issues
    print("\n" + "=" * 80)
    suite.fix_common_issues()
    
    # Run tests
    print("\n" + "=" * 80)
    suite.test_website()
    
    print("\n" + "=" * 80)
    print("✅ Website Enhancement Complete!")
    print("=" * 80)
    print("\n📄 Check website_enhancement_report_*.json for detailed results")
    print("📝 Check website_debug.log for detailed logs")
    print("=" * 80 + "\n")

if __name__ == '__main__':
    main()
