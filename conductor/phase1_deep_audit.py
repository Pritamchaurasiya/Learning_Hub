#!/usr/bin/env python
"""
PHASE 1: Deep Analysis & Full Audit
Comprehensive system analysis, audit, and inventory
"""

import os
import sys
import json
import ast
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Any, Set, Tuple
from collections import defaultdict
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
sys.path.insert(0, 'c:\\Users\\shiva\\Desktop\\windows_app\\conductor')

import django
django.setup()

from django.conf import settings
from django.db import connection
from django.urls import get_resolver

print("=" * 80)
print("🔍 PHASE 1: DEEP ANALYSIS & FULL AUDIT")
print("=" * 80)

class DeepSystemAuditor:
    """Comprehensive system auditor for deep analysis."""
    
    def __init__(self):
        self.base_dir = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
        self.findings = {
            'files_analyzed': 0,
            'lines_of_code': 0,
            'imports_found': set(),
            'functions_found': [],
            'classes_found': [],
            'dead_code': [],
            'unused_imports': [],
            'security_issues': [],
            'performance_issues': [],
            'ml_components': [],
            'api_endpoints': [],
            'database_tables': [],
            'dependencies': {},
            'configuration_issues': []
        }
        self.catalog = defaultdict(list)
    
    def run_full_audit(self) -> Dict[str, Any]:
        """Execute complete system audit."""
        print("\n🔎 Running Comprehensive System Audit...\n")
        
        # 1. Analyze project structure
        self._analyze_project_structure()
        
        # 2. Analyze Python codebase
        self._analyze_python_codebase()
        
        # 3. Analyze Django configuration
        self._analyze_django_config()
        
        # 4. Analyze database
        self._analyze_database()
        
        # 5. Analyze API endpoints
        self._analyze_api_endpoints()
        
        # 6. Analyze ML components
        self._analyze_ml_components()
        
        # 7. Analyze dependencies
        self._analyze_dependencies()
        
        # 8. Security audit
        self._security_audit()
        
        # 9. Performance audit
        self._performance_audit()
        
        # 10. Generate comprehensive report
        return self._generate_comprehensive_report()
    
    def _analyze_project_structure(self):
        """Analyze and map project structure."""
        print("📁 1. Analyzing Project Structure...")
        
        structure = {
            'root_files': [],
            'directories': {},
            'python_files': [],
            'config_files': [],
            'documentation': [],
            'test_files': [],
            'scripts': []
        }
        
        for item in self.base_dir.iterdir():
            if item.is_file():
                if item.suffix == '.py':
                    structure['python_files'].append(str(item.name))
                elif item.suffix in ['.md', '.txt', '.rst']:
                    structure['documentation'].append(str(item.name))
                elif item.suffix in ['.yml', '.yaml', '.json', '.ini', '.cfg', '.conf']:
                    structure['config_files'].append(str(item.name))
                else:
                    structure['root_files'].append(str(item.name))
            elif item.is_dir():
                if not item.name.startswith('.') and item.name not in ['venv', 'venv_new', '__pycache__', 'node_modules']:
                    py_files = list(item.rglob('*.py'))
                    structure['directories'][item.name] = len(py_files)
                    structure['python_files'].extend([str(f.relative_to(self.base_dir)) for f in py_files])
        
        print(f"   📄 Python files: {len(structure['python_files'])}")
        print(f"   📁 Directories: {len(structure['directories'])}")
        print(f"   📚 Documentation: {len(structure['documentation'])}")
        print(f"   ⚙️  Config files: {len(structure['config_files'])}")
        
        self.catalog['project_structure'] = structure
        self.findings['files_analyzed'] = len(structure['python_files'])
    
    def _analyze_python_codebase(self):
        """Analyze Python codebase for code quality."""
        print("\n🐍 2. Analyzing Python Codebase...")
        
        total_lines = 0
        total_functions = 0
        total_classes = 0
        imports = set()
        
        for py_file in self.base_dir.rglob('*.py'):
            if any(skip in str(py_file) for skip in ['venv', '__pycache__', 'migrations']):
                continue
            
            try:
                with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.split('\n')
                    total_lines += len(lines)
                    
                    # Parse AST
                    try:
                        tree = ast.parse(content)
                        for node in ast.walk(tree):
                            if isinstance(node, ast.Import):
                                for alias in node.names:
                                    imports.add(alias.name)
                            elif isinstance(node, ast.ImportFrom):
                                if node.module:
                                    imports.add(node.module)
                            elif isinstance(node, ast.FunctionDef):
                                total_functions += 1
                                self.findings['functions_found'].append({
                                    'file': str(py_file.relative_to(self.base_dir)),
                                    'name': node.name,
                                    'line': node.lineno
                                })
                            elif isinstance(node, ast.ClassDef):
                                total_classes += 1
                                self.findings['classes_found'].append({
                                    'file': str(py_file.relative_to(self.base_dir)),
                                    'name': node.name,
                                    'line': node.lineno
                                })
                    except SyntaxError:
                        pass
            except Exception:
                pass
        
        print(f"   📝 Total lines: {total_lines:,}")
        print(f"   🔧 Functions: {total_functions:,}")
        print(f"   🏗️  Classes: {total_classes:,}")
        print(f"   📦 Unique imports: {len(imports)}")
        
        self.findings['lines_of_code'] = total_lines
        self.findings['imports_found'] = imports
        self.catalog['codebase_stats'] = {
            'lines': total_lines,
            'functions': total_functions,
            'classes': total_classes,
            'imports': list(imports)
        }
    
    def _analyze_django_config(self):
        """Analyze Django configuration."""
        print("\n🔧 3. Analyzing Django Configuration...")
        
        config = {
            'debug_mode': settings.DEBUG,
            'installed_apps': len(settings.INSTALLED_APPS),
            'middleware_count': len(settings.MIDDLEWARE),
            'databases': list(settings.DATABASES.keys()),
            'template_engines': len(settings.TEMPLATES),
            'static_url': getattr(settings, 'STATIC_URL', None),
            'media_url': getattr(settings, 'MEDIA_URL', None),
            'secret_key_length': len(getattr(settings, 'SECRET_KEY', '')),
            'allowed_hosts': getattr(settings, 'ALLOWED_HOSTS', []),
            'time_zone': getattr(settings, 'TIME_ZONE', None),
            'language_code': getattr(settings, 'LANGUAGE_CODE', None),
            'use_i18n': getattr(settings, 'USE_I18N', False),
            'use_l10n': getattr(settings, 'USE_L10N', False),
            'use_tz': getattr(settings, 'USE_TZ', False)
        }
        
        print(f"   🐛 Debug: {config['debug_mode']}")
        print(f"   📱 Apps: {config['installed_apps']}")
        print(f"   🔄 Middleware: {config['middleware_count']}")
        print(f"   🗄️  Databases: {config['databases']}")
        print(f"   🔑 Secret key: {config['secret_key_length']} chars")
        
        # Check for configuration issues
        issues = []
        if config['debug_mode']:
            issues.append("DEBUG mode is enabled (should be False in production)")
        if config['secret_key_length'] < 50:
            issues.append("SECRET_KEY is too short (should be at least 50 characters)")
        if not config['allowed_hosts'] or '*' in config['allowed_hosts']:
            issues.append("ALLOWED_HOSTS not properly configured")
        
        self.findings['configuration_issues'] = issues
        self.catalog['django_config'] = config
    
    def _analyze_database(self):
        """Analyze database schema and tables."""
        print("\n🗄️  4. Analyzing Database...")
        
        try:
            with connection.cursor() as cursor:
                # Get all tables
                if connection.vendor == 'sqlite':
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                elif connection.vendor == 'postgresql':
                    cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname='public';")
                else:
                    cursor.execute("SHOW TABLES;")
                
                tables = [row[0] for row in cursor.fetchall()]
                
                print(f"   📊 Tables: {len(tables)}")
                
                # Get row counts for each table
                table_stats = {}
                for table in tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM \"{table}\";")
                        count = cursor.fetchone()[0]
                        table_stats[table] = count
                    except:
                        table_stats[table] = 'N/A'
                
                self.findings['database_tables'] = table_stats
                self.catalog['database'] = {
                    'engine': connection.vendor,
                    'tables': tables,
                    'table_stats': table_stats
                }
        except Exception as e:
            print(f"   ⚠️  Database analysis error: {e}")
            self.catalog['database'] = {'error': str(e)}
    
    def _analyze_api_endpoints(self):
        """Analyze API endpoints."""
        print("\n🌐 5. Analyzing API Endpoints...")
        
        try:
            resolver = get_resolver()
            endpoints = []
            
            def extract_urls(patterns, prefix=''):
                for pattern in patterns:
                    if hasattr(pattern, 'pattern'):
                        name = str(pattern.pattern).replace('^', '').replace('$', '')
                        if name and name != '/':
                            endpoint_info = {
                                'path': prefix + name,
                                'name': getattr(pattern, 'name', None),
                                'callback': getattr(pattern, 'callback', None).__name__ if hasattr(pattern, 'callback') and pattern.callback else None
                            }
                            endpoints.append(endpoint_info)
                        
                        if hasattr(pattern, 'url_patterns'):
                            extract_urls(pattern.url_patterns, prefix + name)
            
            if hasattr(resolver, 'url_patterns'):
                extract_urls(resolver.url_patterns)
            
            print(f"   🔗 Endpoints: {len(endpoints)}")
            
            # Categorize endpoints
            api_endpoints = [e for e in endpoints if 'api' in e['path']]
            admin_endpoints = [e for e in endpoints if 'admin' in e['path']]
            auth_endpoints = [e for e in endpoints if any(x in e['path'] for x in ['auth', 'login', 'register'])]
            
            print(f"   🎯 API endpoints: {len(api_endpoints)}")
            print(f"   🔐 Auth endpoints: {len(auth_endpoints)}")
            print(f"   ⚙️  Admin endpoints: {len(admin_endpoints)}")
            
            self.findings['api_endpoints'] = endpoints
            self.catalog['api'] = {
                'total': len(endpoints),
                'api': len(api_endpoints),
                'auth': len(auth_endpoints),
                'admin': len(admin_endpoints),
                'endpoints': endpoints[:50]  # First 50
            }
        except Exception as e:
            print(f"   ⚠️  API analysis error: {e}")
    
    def _analyze_ml_components(self):
        """Analyze ML components."""
        print("\n🤖 6. Analyzing ML Components...")
        
        ml_files = []
        for py_file in self.base_dir.rglob('*.py'):
            if any(skip in str(py_file) for skip in ['venv', '__pycache__']):
                continue
            
            try:
                with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read().lower()
                    
                    ml_keywords = ['sklearn', 'tensorflow', 'torch', 'keras', 'model', 'prediction', 
                                   'classification', 'regression', 'neural', 'training', 'inference',
                                   'vector', 'embedding', 'clustering', 'ml', 'ai', 'gemini', 'openai']
                    
                    if any(kw in content for kw in ml_keywords):
                        ml_files.append(str(py_file.relative_to(self.base_dir)))
            except:
                pass
        
        print(f"   📚 ML-related files: {len(ml_files)}")
        
        # Check for specific ML modules
        ml_modules = {
            'ai_engine': 'c:\\Users\\shiva\\Desktop\\windows_app\\conductor\\apps\\ai_engine',
            'mlops': 'c:\\Users\\shiva\\Desktop\\windows_app\\conductor\\apps\\mlops'
        }
        
        for name, path in ml_modules.items():
            if os.path.exists(path):
                files = list(Path(path).rglob('*.py'))
                print(f"   🔬 {name}: {len(files)} files")
        
        self.findings['ml_components'] = ml_files
        self.catalog['ml'] = {
            'files': ml_files,
            'ai_engine_exists': os.path.exists(ml_modules['ai_engine']),
            'mlops_exists': os.path.exists(ml_modules['mlops'])
        }
    
    def _analyze_dependencies(self):
        """Analyze project dependencies."""
        print("\n📦 7. Analyzing Dependencies...")
        
        req_files = [
            'requirements/base.txt',
            'requirements/development.txt',
            'requirements/production.txt'
        ]
        
        all_deps = []
        for req_file in req_files:
            req_path = self.base_dir / req_file
            if req_path.exists():
                with open(req_path, 'r') as f:
                    deps = [line.strip() for line in f if line.strip() and not line.startswith('#')]
                    all_deps.extend(deps)
                    print(f"   📄 {req_file}: {len(deps)} dependencies")
        
        self.findings['dependencies'] = {
            'total': len(all_deps),
            'list': all_deps
        }
        self.catalog['dependencies'] = all_deps
    
    def _security_audit(self):
        """Perform security audit."""
        print("\n🔒 8. Performing Security Audit...")
        
        issues = []
        
        # Check settings
        if settings.DEBUG:
            issues.append({'severity': 'HIGH', 'issue': 'DEBUG mode is enabled', 'recommendation': 'Set DEBUG = False in production'})
        
        if hasattr(settings, 'SECRET_KEY'):
            if len(settings.SECRET_KEY) < 50:
                issues.append({'severity': 'CRITICAL', 'issue': 'Weak SECRET_KEY', 'recommendation': 'Generate a strong SECRET_KEY with at least 50 characters'})
        
        if not hasattr(settings, 'ALLOWED_HOSTS') or not settings.ALLOWED_HOSTS or '*' in settings.ALLOWED_HOSTS:
            issues.append({'severity': 'HIGH', 'issue': 'ALLOWED_HOSTS not properly configured', 'recommendation': 'Set specific allowed hosts'})
        
        # Check for security headers
        security_settings = [
            'SECURE_SSL_REDIRECT',
            'SECURE_CONTENT_TYPE_NOSNIFF',
            'SECURE_BROWSER_XSS_FILTER',
            'X_FRAME_OPTIONS',
            'CSRF_COOKIE_HTTPONLY',
            'CSRF_COOKIE_SECURE',
            'SESSION_COOKIE_HTTPONLY',
            'SESSION_COOKIE_SECURE'
        ]
        
        missing_security = []
        for setting in security_settings:
            if not getattr(settings, setting, False):
                missing_security.append(setting)
        
        if missing_security:
            issues.append({'severity': 'MEDIUM', 'issue': f'Missing security settings: {", ".join(missing_security[:3])}...', 'recommendation': 'Enable security headers in production'})
        
        print(f"   ⚠️  Security issues: {len(issues)}")
        for issue in issues[:3]:
            print(f"      [{issue['severity']}] {issue['issue']}")
        
        self.findings['security_issues'] = issues
    
    def _performance_audit(self):
        """Perform performance audit."""
        print("\n⚡ 9. Performing Performance Audit...")
        
        issues = []
        
        # Check caching
        if not getattr(settings, 'CACHES', None):
            issues.append({'severity': 'MEDIUM', 'issue': 'No caching configured', 'recommendation': 'Configure Redis or Memcached caching'})
        
        # Check database
        try:
            import time
            start = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_time = time.time() - start
            
            if db_time > 0.1:
                issues.append({'severity': 'LOW', 'issue': f'Slow database response: {db_time:.3f}s', 'recommendation': 'Optimize database queries and indexes'})
        except:
            pass
        
        # Check middleware
        middleware_count = len(settings.MIDDLEWARE)
        if middleware_count > 15:
            issues.append({'severity': 'LOW', 'issue': f'Many middleware layers: {middleware_count}', 'recommendation': 'Review middleware for unnecessary overhead'})
        
        print(f"   ⚠️  Performance issues: {len(issues)}")
        
        self.findings['performance_issues'] = issues
    
    def _generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive audit report."""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE AUDIT REPORT")
        print("=" * 80)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'files_analyzed': self.findings['files_analyzed'],
                'lines_of_code': self.findings['lines_of_code'],
                'functions_found': len(self.findings['functions_found']),
                'classes_found': len(self.findings['classes_found']),
                'security_issues': len(self.findings['security_issues']),
                'performance_issues': len(self.findings['performance_issues']),
                'configuration_issues': len(self.findings['configuration_issues']),
                'ml_components': len(self.findings['ml_components']),
                'api_endpoints': len(self.findings['api_endpoints']),
                'database_tables': len(self.findings['database_tables']),
                'dependencies': self.findings['dependencies']['total']
            },
            'catalog': dict(self.catalog),
            'findings': {
                'security_issues': self.findings['security_issues'],
                'performance_issues': self.findings['performance_issues'],
                'configuration_issues': self.findings['configuration_issues']
            },
            'recommendations': self._generate_recommendations()
        }
        
        # Display summary
        summary = report['summary']
        print(f"\n📈 AUDIT SUMMARY:")
        print(f"   📁 Files analyzed: {summary['files_analyzed']}")
        print(f"   📝 Lines of code: {summary['lines_of_code']:,}")
        print(f"   🔧 Functions: {summary['functions_found']:,}")
        print(f"   🏗️  Classes: {summary['classes_found']:,}")
        print(f"   🔒 Security issues: {summary['security_issues']}")
        print(f"   ⚡ Performance issues: {summary['performance_issues']}")
        print(f"   🔧 Config issues: {summary['configuration_issues']}")
        print(f"   🤖 ML components: {summary['ml_components']}")
        print(f"   🔗 API endpoints: {summary['api_endpoints']}")
        print(f"   🗄️  Database tables: {summary['database_tables']}")
        print(f"   📦 Dependencies: {summary['dependencies']}")
        
        # Save report
        report_file = f'PHASE1_DEEP_AUDIT_{int(time.time())}.json'
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved: {report_file}")
        print("=" * 80)
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate improvement recommendations."""
        recommendations = []
        
        # Security recommendations
        if self.findings['security_issues']:
            recommendations.append("PRIORITY: Address all security issues before production deployment")
        
        # Performance recommendations
        if self.findings['performance_issues']:
            recommendations.append("Optimize performance: Configure caching and review slow queries")
        
        # Configuration recommendations
        if self.findings['configuration_issues']:
            recommendations.append("Fix configuration issues: Update settings for production")
        
        # General recommendations
        recommendations.extend([
            "Enable comprehensive logging and monitoring",
            "Set up automated backup procedures",
            "Implement proper error handling across all modules",
            "Add comprehensive test coverage",
            "Review and optimize database indexes",
            "Implement rate limiting for API endpoints",
            "Set up CI/CD pipeline for automated testing",
            "Document all API endpoints with OpenAPI/Swagger",
            "Implement proper secret management",
            "Set up health check endpoints"
        ])
        
        return recommendations

def main():
    """Main entry point."""
    auditor = DeepSystemAuditor()
    report = auditor.run_full_audit()
    
    print("\n✅ PHASE 1: DEEP ANALYSIS & FULL AUDIT COMPLETE")
    print("=" * 80)
    print(f"\n🔍 Analyzed {report['summary']['files_analyzed']} files")
    print(f"📝 {report['summary']['lines_of_code']:,} lines of code")
    print(f"🔒 Found {report['summary']['security_issues']} security issues")
    print(f"⚡ Found {report['summary']['performance_issues']} performance issues")
    print(f"🤖 Cataloged {report['summary']['ml_components']} ML components")
    print("\nReady for Phase 2: ML Deep Dive")
    print("=" * 80 + "\n")

if __name__ == '__main__':
    main()
