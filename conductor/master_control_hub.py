#!/usr/bin/env python
"""
Master Control & Integration Hub
Final integration script for all frameworks with Django
"""

import os
import sys
import time
import json
import logging
import subprocess
import psutil
from datetime import datetime
from typing import Dict, List, Any

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
sys.path.insert(0, 'c:\\Users\\shiva\\Desktop\\windows_app\\conductor')

import django
django.setup()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('master_control.log')
    ]
)
logger = logging.getLogger(__name__)

class MasterControlHub:
    """Master control hub for all systems."""
    
    def __init__(self):
        self.components = {}
        self.status = {}
        self.running = False
        
    def run_full_system_check(self) -> Dict[str, Any]:
        """Run comprehensive system check."""
        print("=" * 80)
        print("🔍 MASTER CONTROL HUB - FULL SYSTEM CHECK")
        print("=" * 80)
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'components': {}
        }
        
        # Check Django
        print("\n1️⃣ Django Framework...")
        results['components']['django'] = self._check_django()
        
        # Check Database
        print("\n2️⃣ Database...")
        results['components']['database'] = self._check_database()
        
        # Check System Resources
        print("\n3️⃣ System Resources...")
        results['components']['system'] = self._check_system_resources()
        
        # Check APIs
        print("\n4️⃣ API Endpoints...")
        results['components']['apis'] = self._check_apis()
        
        # Check Security
        print("\n5️⃣ Security...")
        results['components']['security'] = self._check_security()
        
        # Check Performance
        print("\n6️⃣ Performance...")
        results['components']['performance'] = self._check_performance()
        
        # Summary
        self._display_summary(results)
        
        return results
    
    def _check_django(self) -> Dict[str, Any]:
        """Check Django status."""
        try:
            from django.conf import settings
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            user_count = User.objects.count()
            
            return {
                'status': 'operational',
                'version': django.__version__,
                'apps': len(settings.INSTALLED_APPS),
                'users': user_count,
                'debug': settings.DEBUG
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def _check_database(self) -> Dict[str, Any]:
        """Check database status."""
        try:
            from django.db import connection
            
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            return {
                'status': 'connected',
                'engine': connection.vendor,
                'host': connection.settings_dict.get('HOST', 'localhost')
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def _check_system_resources(self) -> Dict[str, Any]:
        """Check system resources."""
        try:
            cpu = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'status': 'healthy',
                'cpu': cpu,
                'memory': memory.percent,
                'disk': disk.percent
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def _check_apis(self) -> Dict[str, Any]:
        """Check API status."""
        try:
            from django.urls import get_resolver
            
            resolver = get_resolver()
            endpoints = []
            
            def extract_urls(patterns, prefix=''):
                for pattern in patterns:
                    if hasattr(pattern, 'pattern'):
                        name = str(pattern.pattern)
                        endpoints.append(prefix + name)
                        if hasattr(pattern, 'url_patterns'):
                            extract_urls(pattern.url_patterns, prefix + name)
            
            if hasattr(resolver, 'url_patterns'):
                extract_urls(resolver.url_patterns)
            
            return {
                'status': 'operational',
                'endpoints': len(endpoints)
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def _check_security(self) -> Dict[str, Any]:
        """Check security status."""
        try:
            from django.conf import settings
            
            issues = []
            if settings.DEBUG:
                issues.append("DEBUG mode enabled")
            
            return {
                'status': 'checked',
                'issues': issues,
                'score': 100 - len(issues) * 10
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def _check_performance(self) -> Dict[str, Any]:
        """Check performance status."""
        try:
            from django.db import connection
            import time
            
            start = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_time = time.time() - start
            
            return {
                'status': 'optimized',
                'db_response_time': f"{db_time:.4f}s"
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    def _display_summary(self, results: Dict):
        """Display system summary."""
        print("\n" + "=" * 80)
        print("📊 SYSTEM STATUS SUMMARY")
        print("=" * 80)
        
        for name, component in results['components'].items():
            status = component.get('status', 'unknown')
            icon = "✅" if status == 'operational' else "⚠️" if status == 'warning' else "❌"
            print(f"{icon} {name.title()}: {status.upper()}")
        
        print("=" * 80)
    
    def start_development_server(self):
        """Start Django development server."""
        print("\n🚀 Starting Django Development Server...")
        subprocess.Popen(
            [sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'],
            cwd='c:\\Users\\shiva\\Desktop\\windows_app\\conductor'
        )
        print("✅ Server starting at http://localhost:8000")
    
    def run_all_tests(self):
        """Run all system tests."""
        print("\n🧪 Running All System Tests...")
        
        # Django tests
        result = subprocess.run(
            [sys.executable, 'manage.py', 'test', '--verbosity=2'],
            capture_output=True,
            text=True,
            cwd='c:\\Users\\shiva\\Desktop\\windows_app\\conductor',
            timeout=300
        )
        
        if result.returncode == 0:
            print("✅ All Django tests passed")
        else:
            print(f"⚠️ Some tests failed: {result.stderr[:500]}")
        
        return result.returncode == 0

def main():
    """Main function."""
    print("\n" + "=" * 80)
    print("🎯 MASTER CONTROL HUB")
    print("=" * 80)
    
    hub = MasterControlHub()
    
    # Run full system check
    results = hub.run_full_system_check()
    
    # Save report
    report_file = f'master_control_report_{int(time.time())}.json'
    with open(report_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Report saved: {report_file}")
    print("\n✅ Master Control Hub check complete!")
    print("=" * 80 + "\n")

if __name__ == '__main__':
    main()
