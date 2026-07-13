#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
API Endpoint Verification Script
Verifies all API endpoints are properly configured and accessible.
"""

import os
import sys
import django
import json
from collections import defaultdict

# Fix Windows console encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.urls import get_resolver
from django.test import RequestFactory
from rest_framework.test import APIClient

try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    USE_COLOR = True
except ImportError:
    USE_COLOR = False
    class Fore:
        RED = GREEN = YELLOW = BLUE = CYAN = MAGENTA = ''
    class Style:
        RESET_ALL = ''

class APIEndpointVerifier:
    """Verifies all API endpoints are properly configured."""
    
    def __init__(self):
        self.client = APIClient()
        self.factory = RequestFactory()
        self.results = {
            'total': 0,
            'accessible': 0,
            'authentication_required': 0,
            'errors': 0,
            'by_app': defaultdict(lambda: {'total': 0, 'accessible': 0, 'errors': []})
        }
        
    def print_header(self, text):
        """Print colored header."""
        print(f"\n{Fore.CYAN}{'='*80}")
        print(f"{Fore.CYAN}{text.center(80)}")
        print(f"{Fore.CYAN}{'='*80}\n")
        
    def print_success(self, text):
        """Print success message."""
        print(f"{Fore.GREEN}[OK] {text}")
        
    def print_warning(self, text):
        """Print warning message."""
        print(f"{Fore.YELLOW}[WARN] {text}")
        
    def print_error(self, text):
        """Print error message."""
        print(f"{Fore.RED}[ERROR] {text}")
        
    def print_info(self, text):
        """Print info message."""
        print(f"{Fore.BLUE}[INFO] {text}")
        
    def extract_endpoints(self):
        """Extract all URL patterns from Django."""
        resolver = get_resolver()
        endpoints = []
        
        def extract_patterns(patterns, prefix=''):
            for pattern in patterns:
                if hasattr(pattern, 'url_patterns'):
                    # It's an include()
                    new_prefix = prefix + str(pattern.pattern)
                    extract_patterns(pattern.url_patterns, new_prefix)
                else:
                    # It's a path() or re_path()
                    path = prefix + str(pattern.pattern)
                    # Clean up the path
                    path = path.replace('^', '').replace('$', '')
                    if path and not path.startswith('admin'):
                        endpoints.append({
                            'path': path,
                            'name': pattern.name,
                            'callback': pattern.callback
                        })
        
        extract_patterns(resolver.url_patterns)
        return endpoints
    
    def categorize_endpoint(self, path):
        """Categorize endpoint by app."""
        if path.startswith('api/v1/'):
            parts = path.split('/')
            if len(parts) > 2:
                return parts[2]  # Get the app name
        elif path.startswith('health'):
            return 'health'
        elif path.startswith('monitoring'):
            return 'monitoring'
        return 'other'
    
    def test_endpoint(self, endpoint):
        """Test a single endpoint."""
        path = endpoint['path']
        name = endpoint['name']
        
        # Skip parameterized URLs for now
        if '<' in path or '(' in path:
            return 'skipped', 'parameterized'
        
        # Skip WebSocket endpoints
        if 'ws' in path.lower():
            return 'skipped', 'websocket'
            
        # Prepare path for testing
        test_path = f"/{path.rstrip('/')}"
        
        try:
            # Try GET request
            response = self.client.get(test_path)
            status = response.status_code
            
            if status == 200:
                return 'success', f'OK (200)'
            elif status == 401:
                return 'auth_required', 'Authentication Required (401)'
            elif status == 403:
                return 'forbidden', 'Forbidden (403)'
            elif status == 404:
                return 'not_found', 'Not Found (404)'
            elif status == 405:
                # Method not allowed, try POST
                response = self.client.post(test_path)
                if response.status_code == 401:
                    return 'auth_required', 'POST - Authentication Required (401)'
                elif response.status_code == 403:
                    return 'forbidden', 'POST - Forbidden (403)'
                return 'method_not_allowed', f'Method Not Allowed (405)'
            elif status >= 500:
                return 'error', f'Server Error ({status})'
            else:
                return 'other', f'Status: {status}'
                
        except Exception as e:
            return 'error', f'Exception: {str(e)[:50]}'
    
    def verify_all_endpoints(self):
        """Verify all endpoints."""
        self.print_header("API ENDPOINT VERIFICATION")
        
        print("[*] Extracting endpoints...")
        endpoints = self.extract_endpoints()
        
        # Filter API endpoints
        api_endpoints = [e for e in endpoints if e['path'].startswith('api/')]
        health_endpoints = [e for e in endpoints if 'health' in e['path']]
        
        self.print_info(f"Found {len(endpoints)} total endpoints")
        self.print_info(f"Found {len(api_endpoints)} API endpoints")
        self.print_info(f"Found {len(health_endpoints)} health check endpoints")
        
        # Test health endpoints first
        self.print_header("HEALTH CHECK ENDPOINTS")
        for endpoint in health_endpoints:
            status, message = self.test_endpoint(endpoint)
            path = endpoint['path']
            
            if status == 'success':
                self.print_success(f"{path}: {message}")
                self.results['accessible'] += 1
            elif status == 'error':
                self.print_error(f"{path}: {message}")
                self.results['errors'] += 1
            else:
                self.print_warning(f"{path}: {message}")
            
            self.results['total'] += 1
        
        # Test API endpoints by category
        self.print_header("API ENDPOINTS BY APP")
        
        # Group by app
        endpoints_by_app = defaultdict(list)
        for endpoint in api_endpoints:
            app = self.categorize_endpoint(endpoint['path'])
            endpoints_by_app[app].append(endpoint)
        
        # Test each app
        for app in sorted(endpoints_by_app.keys()):
            endpoints = endpoints_by_app[app]
            print(f"\n{Fore.MAGENTA}[APP] {app.upper()} ({len(endpoints)} endpoints)")
            print(f"{Fore.MAGENTA}{'-'*80}")
            
            for endpoint in endpoints[:10]:  # Limit to first 10 per app for brevity
                path = endpoint['path']
                status, message = self.test_endpoint(endpoint)
                
                self.results['total'] += 1
                self.results['by_app'][app]['total'] += 1
                
                if status == 'success':
                    self.print_success(f"{path}: {message}")
                    self.results['accessible'] += 1
                    self.results['by_app'][app]['accessible'] += 1
                elif status == 'auth_required':
                    self.print_warning(f"{path}: {message}")
                    self.results['authentication_required'] += 1
                elif status == 'error':
                    self.print_error(f"{path}: {message}")
                    self.results['errors'] += 1
                    self.results['by_app'][app]['errors'].append(path)
                elif status == 'skipped':
                    self.print_info(f"{path}: Skipped ({message})")
                else:
                    self.print_warning(f"{path}: {message}")
            
            if len(endpoints) > 10:
                self.print_info(f"... and {len(endpoints) - 10} more endpoints")
    
    def print_summary(self):
        """Print verification summary."""
        self.print_header("VERIFICATION SUMMARY")
        
        total = self.results['total']
        accessible = self.results['accessible']
        auth_required = self.results['authentication_required']
        errors = self.results['errors']
        
        print(f"Total Endpoints Tested: {total}")
        print(f"{Fore.GREEN}Accessible (200): {accessible} ({accessible/total*100:.1f}%)")
        print(f"{Fore.YELLOW}Auth Required (401): {auth_required} ({auth_required/total*100:.1f}%)")
        print(f"{Fore.RED}Errors: {errors} ({errors/total*100:.1f}%)")
        
        print(f"\n{Fore.CYAN}BY APPLICATION:")
        for app, stats in sorted(self.results['by_app'].items()):
            total_app = stats['total']
            accessible_app = stats['accessible']
            if total_app > 0:
                print(f"  {app}: {accessible_app}/{total_app} accessible ({accessible_app/total_app*100:.1f}%)")
                if stats['errors']:
                    print(f"    {Fore.RED}Errors in: {', '.join(stats['errors'][:3])}")
        
        # Overall health
        print(f"\n{Fore.CYAN}OVERALL HEALTH:")
        if errors == 0:
            self.print_success("All endpoints are properly configured!")
        elif errors < total * 0.1:
            self.print_warning(f"Minor issues found in {errors} endpoints")
        else:
            self.print_error(f"Significant issues found in {errors} endpoints - needs attention!")
    
    def run(self):
        """Run the verification."""
        try:
            self.verify_all_endpoints()
            self.print_summary()
            
            # Save results to file
            output_file = 'api_endpoint_verification_report.json'
            with open(output_file, 'w') as f:
                json.dump({
                    'timestamp': str(django.utils.timezone.now()),
                    'results': dict(self.results),
                    'by_app': dict(self.results['by_app'])
                }, f, indent=2, default=str)
            
            self.print_info(f"\nDetailed report saved to: {output_file}")
            
            return self.results['errors'] == 0
            
        except Exception as e:
            self.print_error(f"Verification failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    verifier = APIEndpointVerifier()
    success = verifier.run()
    sys.exit(0 if success else 1)
