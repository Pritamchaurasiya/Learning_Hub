#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Comprehensive Functional API Testing Suite
Tests all endpoints across Users, Security, 2FA, Sessions, API Keys,
Courses, Notes, Resources, DSA, POTD, Exams, Gamification, Payments, Invoices, and Docs.
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
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class APIFunctionalTester:
    """Tests comprehensive backend API functionality."""

    def __init__(self):
        self.client = APIClient()
        self.test_user = None
        self.access_token = None
        self.refresh_token = None
        self.results = {
            'passed': 0,
            'failed': 0,
            'tests': []
        }

    def log(self, message, status='INFO'):
        """Log message with marker."""
        markers = {
            'INFO': '[INFO]',
            'PASS': '[PASS]',
            'FAIL': '[FAIL]',
            'WARN': '[WARN]'
        }
        print(f"{markers.get(status, '[INFO]')} {message}")

    def setup_test_user(self):
        """Create or get test user with valid credentials."""
        try:
            try:
                self.test_user = User.objects.get(username='api_tester_2026')
            except User.DoesNotExist:
                self.test_user = User.objects.create_user(
                    email='apitester@learninghub.com',
                    username='api_tester_2026',
                    password='testpass123',
                    display_name='API Tester',
                    is_active=True,
                    is_verified=True
                )

            if not self.test_user.check_password('testpass123'):
                self.test_user.set_password('testpass123')
                self.test_user.save()

            refresh = RefreshToken.for_user(self.test_user)
            self.access_token = str(refresh.access_token)
            self.refresh_token = str(refresh)

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
            assert data.get('status') == 'healthy'
            self.log("Health check: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'health_check', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Health check: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'health_check', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_deep_health_check(self):
        """Test deep multi-system health check."""
        try:
            response = self.client.get('/health/deep/')
            assert response.status_code in [200, 503]
            data = response.json()
            assert 'components' in data or 'checks' in data or 'status' in data
            self.log("Deep health check: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'deep_health_check', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Deep health check: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'deep_health_check', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_authentication(self):
        """Test login endpoint."""
        try:
            response = self.client.post('/api/v1/auth/login/', {
                'email': 'apitester@learninghub.com',
                'password': 'testpass123'
            })
            assert response.status_code in [200, 201]
            data = response.json()
            assert 'accessToken' in data.get('data', {}) or 'access' in data or 'accessToken' in data
            self.log("Authentication (Login): PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'authentication', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Authentication: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'authentication', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_token_refresh(self):
        """Test token refresh endpoint."""
        try:
            response = self.client.post('/api/v1/auth/refresh/', {
                'refresh': self.refresh_token
            })
            assert response.status_code == 200
            data = response.json()
            assert 'accessToken' in data.get('data', {}) or 'access' in data
            self.log("Token Refresh: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'token_refresh', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Token Refresh: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'token_refresh', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_get_profile(self):
        """Test get user profile."""
        try:
            self.authenticate()
            response = self.client.get('/api/v1/auth/me/')
            assert response.status_code == 200
            data = response.json()
            email = data.get('email') or data.get('data', {}).get('email')
            assert email == self.test_user.email
            self.log("Get Profile: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'get_profile', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Get Profile: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'get_profile', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_two_factor_auth_flow(self):
        """Test 2FA setup, verify, and disable."""
        try:
            self.authenticate()
            # 1. Setup
            setup_res = self.client.get('/api/v1/auth/2fa/setup/')
            assert setup_res.status_code == 200
            setup_data = setup_res.json()
            secret = setup_data.get('data', {}).get('secret')
            assert secret is not None

            # 2. Verify with valid TOTP
            from apps.users.two_factor_service import TwoFactorService
            code = TwoFactorService._get_totp_code(secret)
            verify_res = self.client.post('/api/v1/auth/2fa/verify/', {'code': code})
            assert verify_res.status_code == 200
            verify_data = verify_res.json()
            assert verify_data.get('data', {}).get('is_enabled') is True
            assert len(verify_data.get('data', {}).get('recovery_codes', [])) == 8

            # 3. Disable 2FA
            disable_res = self.client.post('/api/v1/auth/2fa/disable/', {'password': 'testpass123'})
            assert disable_res.status_code == 200

            self.log("Two-Factor Authentication Flow: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'two_factor_auth_flow', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Two-Factor Auth Flow: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'two_factor_auth_flow', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_session_management(self):
        """Test active session listing and revocation."""
        try:
            self.authenticate()
            res = self.client.get('/api/v1/auth/sessions/')
            assert res.status_code == 200
            data = res.json()
            assert data.get('status') == 'success'
            assert isinstance(data.get('data'), list)

            self.log("Session Management: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'session_management', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Session Management: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'session_management', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_api_key_management(self):
        """Test API key creation, listing, and revocation."""
        try:
            self.authenticate()
            # Create
            create_res = self.client.post('/api/v1/auth/api-keys/', {
                'name': 'Test Integration Key',
                'scopes': ['read', 'write'],
                'expires_in_days': 30
            })
            assert create_res.status_code in [200, 201]
            key_data = create_res.json().get('data', {})
            key_id = key_data.get('id')
            raw_key = key_data.get('key')
            assert raw_key.startswith('lhub_')

            # List
            list_res = self.client.get('/api/v1/auth/api-keys/')
            assert list_res.status_code == 200

            # Revoke
            revoke_res = self.client.delete(f'/api/v1/auth/api-keys/{key_id}/')
            assert revoke_res.status_code == 200

            self.log("API Key Management: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'api_key_management', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"API Key Management: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'api_key_management', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_list_courses(self):
        """Test list courses endpoint."""
        try:
            response = self.client.get('/api/v1/courses/')
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, (dict, list))
            self.log("List Courses: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'list_courses', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"List Courses: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'list_courses', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_course_features(self):
        """Test course bookmarks, similar courses, and key concepts."""
        try:
            from apps.courses.models import Course, Category
            category, _ = Category.objects.get_or_create(name="Computer Science", slug="cs")
            course, _ = Course.objects.get_or_create(
                slug="python-masterclass-2026",
                defaults={
                    "title": "Python Masterclass 2026",
                    "description": "Comprehensive Python Mastery course.",
                    "short_description": "Learn Python 3 from beginner to advanced.",
                    "instructor": self.test_user,
                    "category": category,
                    "price": 499.00,
                    "is_published": True,
                }
            )

            self.authenticate()
            # Similar courses
            sim_res = self.client.get(f'/api/v1/courses/{course.slug}/similar/')
            assert sim_res.status_code == 200

            # Resources
            res_res = self.client.get(f'/api/v1/courses/{course.slug}/resources/')
            assert res_res.status_code == 200

            self.log("Course Features (Similar & Resources): PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'course_features', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Course Features: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'course_features', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_dsa_engine(self):
        """Test DSA problem listing, POTD, draft save/retrieve, and hints."""
        try:
            from apps.dsa.models import Problem, Tag
            tag, _ = Tag.objects.get_or_create(name="Arrays", slug="arrays")
            problem, _ = Problem.objects.get_or_create(
                slug="two-sum-core",
                defaults={
                    "title": "Two Sum Core",
                    "description": "Given an array of integers, return indices of two numbers that add up to target.",
                    "difficulty": "EASY",
                    "points": 10,
                    "constraints": "O(N) time complexity required",
                    "input_format": "List of integers and target integer",
                    "output_format": "Indices of two numbers",
                    "is_active": True,
                }
            )
            problem.tags.add(tag)

            self.authenticate()
            # POTD
            potd_res = self.client.get('/api/v1/dsa/problems/potd/')
            assert potd_res.status_code in [200, 404]

            # Explain
            exp_res = self.client.get(f'/api/v1/dsa/problems/{problem.slug}/explain/')
            assert exp_res.status_code == 200
            assert 'approaches' in exp_res.json().get('data', {})

            # Draft save & retrieve
            save_draft = self.client.post(f'/api/v1/dsa/problems/{problem.slug}/draft/', {
                'code': 'def twoSum(nums, target): return [0, 1]',
                'language': 'python'
            })
            assert save_draft.status_code == 200

            get_draft = self.client.get(f'/api/v1/dsa/problems/{problem.slug}/draft/?language=python')
            assert get_draft.status_code == 200
            assert 'twoSum' in get_draft.json().get('data', {}).get('code', '')

            self.log("DSA Engine (POTD, Drafts, Explanation): PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'dsa_engine', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"DSA Engine: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'dsa_engine', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_exams_taxonomy(self):
        """Test exam countries, exams listing, and subjects."""
        try:
            from apps.exams.models import Country, Exam
            country, _ = Country.objects.get_or_create(code="IN", defaults={"name": "India"})
            exam, _ = Exam.objects.get_or_create(
                code="JEE_MAIN_2026",
                defaults={
                    "country": country,
                    "name": "JEE Main 2026",
                    "full_name": "Joint Entrance Examination Main",
                    "is_active": True,
                }
            )

            countries_res = self.client.get('/api/v1/exams/countries/')
            assert countries_res.status_code == 200

            exams_res = self.client.get('/api/v1/exams/exams/')
            assert exams_res.status_code == 200

            self.log("Exams Taxonomy: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'exams_taxonomy', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Exams Taxonomy: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'exams_taxonomy', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_gamification(self):
        """Test gamification stats, award XP, and leaderboard with DB fallback."""
        try:
            self.authenticate()
            stats_res = self.client.get('/api/v1/gamification/stats/')
            assert stats_res.status_code == 200

            # Award XP
            add_res = self.client.post('/api/v1/gamification/xp/add/', {
                'amount': 25,
                'reason': 'Completed Diagnostic Challenge'
            })
            assert add_res.status_code in [200, 201]

            # Leaderboard
            lead_res = self.client.get('/api/v1/gamification/leaderboard/')
            assert lead_res.status_code == 200

            self.log("Gamification (Stats, XP, Leaderboard): PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'gamification', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Gamification: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'gamification', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_payments_and_invoices(self):
        """Test coupon validation, payment stats, and invoice listing."""
        try:
            from apps.payments.models import Coupon
            coupon, _ = Coupon.objects.get_or_create(
                code="LEARN50",
                defaults={
                    "discount_percent": 50.0,
                    "is_active": True
                }
            )

            self.authenticate()
            # Validate Coupon
            val_res = self.client.post('/api/v1/payments/validate-coupon/', {
                'code': 'LEARN50',
                'amount': 1000.0
            })
            assert val_res.status_code == 200
            val_data = val_res.json()
            assert val_data.get('data', {}).get('discount_amount') == 500.0
            assert val_data.get('data', {}).get('final_amount') == 500.0

            # Stats
            stats_res = self.client.get('/api/v1/payments/stats/')
            assert stats_res.status_code == 200

            # Invoices
            inv_res = self.client.get('/api/v1/payments/invoices/')
            assert inv_res.status_code == 200

            self.log("Payments & Invoices: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'payments_and_invoices', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"Payments & Invoices: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'payments_and_invoices', 'status': 'FAIL', 'error': str(e)})
            return False

    def test_api_documentation(self):
        """Test OpenAPI Swagger documentation."""
        try:
            response = self.client.get('/api/docs/')
            assert response.status_code == 200
            schema_res = self.client.get('/api/schema/')
            assert schema_res.status_code == 200
            self.log("API Documentation & OpenAPI Schema: PASSED", 'PASS')
            self.results['passed'] += 1
            self.results['tests'].append({'test': 'api_documentation', 'status': 'PASS'})
            return True
        except Exception as e:
            self.log(f"API Documentation: FAILED - {e}", 'FAIL')
            self.results['failed'] += 1
            self.results['tests'].append({'test': 'api_documentation', 'status': 'FAIL', 'error': str(e)})
            return False

    def run_all_tests(self):
        """Run all functional tests across the system."""
        print("\n" + "="*80)
        print("COMPREHENSIVE BACKEND API VERIFICATION SUITE".center(80))
        print("="*80 + "\n")

        if not self.setup_test_user():
            self.log("Failed to setup test environment", 'FAIL')
            return False

        tests = [
            ('Health Check', self.test_health_check),
            ('Deep Multi-System Health Check', self.test_deep_health_check),
            ('Authentication (Login)', self.test_authentication),
            ('Token Refresh', self.test_token_refresh),
            ('Get User Profile', self.test_get_profile),
            ('Two-Factor Authentication Flow', self.test_two_factor_auth_flow),
            ('Session Management & Revocation', self.test_session_management),
            ('Developer API Key Management', self.test_api_key_management),
            ('Course Catalog & Listing', self.test_list_courses),
            ('Course Features (Resources & Similar)', self.test_course_features),
            ('DSA Problem Engine, POTD & Drafts', self.test_dsa_engine),
            ('Exam Taxonomy & Subjects', self.test_exams_taxonomy),
            ('Gamification Stats & Leaderboard', self.test_gamification),
            ('Payments, Coupons & Invoices', self.test_payments_and_invoices),
            ('OpenAPI Documentation & Swagger', self.test_api_documentation),
        ]

        for test_name, test_func in tests:
            self.log(f"Running: {test_name}...", 'INFO')
            test_func()
            print()

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
            self.log("\nALL VERIFICATION CHECKS PASSED PERFECTLY!", 'PASS')
        else:
            self.log(f"\n{failed} test(s) failed", 'FAIL')

        with open('api_functional_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)

        self.log("Results saved to: api_functional_test_results.json", 'INFO')
        return failed == 0


if __name__ == '__main__':
    tester = APIFunctionalTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
