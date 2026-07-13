#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Functional API Testing Script
Tests actual API functionality with authentication.
"""

import os
import sys
import django
import json

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class APIFunctionalTester:
    """Tests actual API functionality."""
    
    def __init__(self):
        self.client = APIClient()
        self.test_user = None
        self.access_token = None
        self.results = {
            'passed': 0,
            'failed': 0,
            'tests': []
        }
    
    def log(self, message, status='INFO'):
        """Log message."""
        markers = {
            'INFO': '[INFO]',
            'PASS': '[PASS]',
            'FAIL': '[FAIL]',
            'WARN': '[WARN]'
        }
        print(f"{markers.get(status, '[INFO]')} {message}")
    
    def setup_test_user(self):
        """Create or get test user."""
        try:
            # Try to get existing user first (by username to avoid conflicts)
            try:
                self.test_user = User.objects.get(username='api_tester_2026')
            except User.DoesNotExist:
                self.test_user = User.objects.create_user(
                    email='apitester@learninghub.com',
                    username='api_tester_2026',
                    password='testpass123',
                    display_name='API Tester',
                    is_active=True
                )
            
            # Ensure password is set
            if not self.test_user.check_password('testpass123'):
                self.test_user.set_password('testpass123')
                self.test_user.save()
            
            # Generate JWT token
            refresh = RefreshToken.for_user(self.test_user)
            self.access_token = str(refresh.access_token)
            
            self.log("Test user ready", 'PASS')
            return True
        except Exception as e:
            self.log(f"Failed to setup test user: {e}", 'FAIL')
            import traceback
            traceback.print_exc()
            return False
    
    def authenticate(self):
        """Set authentication header."""
        if self.access_token:
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
    
    def test_health_check(self):
        """Test health check endpoint."""
        try:
            response = self.client.get('/health/')
            assert response.status_code == 200
            data = response.json()
            assert 'status' in data
            self.log("Health check: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'health_check', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Health check: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'health_check', 'status': 'FAIL', 'error': str(e)})
            return False
    
    def test_authentication(self):
        """Test authentication endpoint."""
        try:
            response = self.client.post('/api/v1/auth/login/', {
                'email': 'apitester@learninghub.com',
                'password': 'testpass123'
            })
            assert response.status_code in [200, 201]
            data = response.json()
            assert 'access' in data or 'access_token' in data
            self.log("Authentication: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'authentication', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Authentication: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'authentication', 'status': 'FAIL', 'error': str(e)})
            return False
    
    def test_get_profile(self):
        """Test get user profile."""
        try:
            self.authenticate()
            response = self.client.get('/api/v1/auth/me/')
            assert response.status_code == 200
            data = response.json()
            assert 'email' in data
            assert data['email'] == self.test_user.email
            self.log("Get profile: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'get_profile', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Get profile: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'get_profile', 'status': 'FAIL', 'error': str(e)})
            return False
    
    def test_list_courses(self):
        """Test list courses endpoint."""
        try:
            response = self.client.get('/api/v1/courses/')
            assert response.status_code == 200
            data = response.json()
            # Should return paginated results
            assert isinstance(data, (dict, list))
            self.log("List courses: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'list_courses', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"List courses: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'list_courses', 'status': 'FAIL', 'error': str(e)})
            return False
    
    def test_gamification_stats(self):
        """Test gamification stats."""
        try:
            self.authenticate()
            response = self.client.get('/api/v1/gamification/stats/')
            assert response.status_code == 200
            self.log("Gamification stats: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'gamification_stats', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Gamification stats: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'gamification_stats', 'status': 'FAIL', 'error': str(e)})
            return False
    
    def test_api_documentation(self):
        """Test API documentation endpoint."""
        try:
            response = self.client.get('/api/docs/')
            assert response.status_code == 200
            self.log("API documentation: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'api_documentation', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"API documentation: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'api_documentation', 'status': 'FAIL', 'error': str(e)})
            return False
    
    def run_all_tests(self):
        """Run all functional tests."""
        print("\n" + "="*80)
        print("API FUNCTIONAL TESTING".center(80))
        print("="*80 + "\n")
        
        # Setup
        if not self.setup_test_user():
            self.log("Failed to setup test environment", 'FAIL')
            return False
        
        # Run tests
        tests = [
            ('Health Check', self.test_health_check),
            ('Authentication', self.test_authentication),
            ('Get Profile', self.test_get_profile),
            ('List Courses', self.test_list_courses),
            ('Gamification Stats', self.test_gamification_stats),
            ('API Documentation', self.test_api_documentation),
        ]
        
        for test_name, test_func in tests:
            self.log(f"Running: {test_name}...", 'INFO')
            test_func()
            print()
        
        # Print summary
        print("\n" + "="*80)
        print("TEST SUMMARY".center(80))
        print("="*80 + "\n")
        
        total = self.results['passed'] + self.results['failed']
        passed = self.results['passed']
        failed = self.results['failed']
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ({passed/total*100:.1f}%)")
        print(f"Failed: {failed} ({failed/total*100:.1f}%)")
        
        if failed == 0:
            self.log("\nAll tests passed!", 'PASS')
        else:
            self.log(f"\n{failed} test(s) failed", 'FAIL')
        
        # Save results
        with open('api_functional_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        self.log("\nResults saved to: api_functional_test_results.json", 'INFO')
        
        return failed == 0

if __name__ == '__main__':
    tester = APIFunctionalTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
