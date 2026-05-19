#!/usr/bin/env python3
"""
Integration Test Runner
Runs all integration and API compatibility tests.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'conductor.settings')
django.setup()

import subprocess
from django.test.utils import get_runner
from django.conf import settings


def run_tests():
    """Run all integration tests."""
    print("=" * 70)
    print("LEARNING HUB - INTEGRATION TEST SUITE")
    print("=" * 70)
    print()
    
    # Test modules to run
    test_modules = [
        'apps.quiz.tests.test_integration',
        'apps.quiz.tests.test_quiz_api',
        'apps.courses.tests.test_integration',
        'apps.api_compat.tests.test_frontend_backend',
    ]
    
    # Use Django's test runner
    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2)
    
    print("Running integration tests...")
    print()
    
    failures = 0
    errors = 0
    
    for test_module in test_modules:
        print(f"\n{'='*70}")
        print(f"Testing: {test_module}")
        print(f"{'='*70}")
        
        try:
            result = test_runner.run_tests([test_module])
            if result.failures:
                failures += len(result.failures)
            if result.errors:
                errors += len(result.errors)
        except Exception as e:
            print(f"Error running {test_module}: {e}")
            errors += 1
    
    print()
    print("=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Total Failures: {failures}")
    print(f"Total Errors: {errors}")
    
    if failures == 0 and errors == 0:
        print("\n✅ All tests passed!")
        return 0
    else:
        print(f"\n❌ Tests failed: {failures} failures, {errors} errors")
        return 1


if __name__ == '__main__':
    sys.exit(run_tests())
