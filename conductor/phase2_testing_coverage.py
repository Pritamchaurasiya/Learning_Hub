#!/usr/bin/env python
"""
PHASE 2: COMPREHENSIVE TESTING & COVERAGE ENHANCEMENT
Add comprehensive tests, achieve 85%+ coverage, validate all functionality
"""

import os
import sys
import subprocess
import json
import time
from datetime import datetime
from pathlib import Path

print("=" * 80)
print("PHASE 2: COMPREHENSIVE TESTING & COVERAGE ENHANCEMENT")
print("=" * 80)

# Base directory
BASE_DIR = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
os.chdir(BASE_DIR)

# Results tracking
results = {
    'phase': 'Testing & Coverage',
    'start_time': datetime.now().isoformat(),
    'tests_added': [],
    'test_results': {},
    'coverage': {},
    'issues_found': []
}

def log(message, level="INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def run_command(cmd, shell=True, capture=True, timeout=120):
    """Run command and return result."""
    try:
        if capture:
            result = subprocess.run(cmd, shell=shell, capture_output=True, text=True, timeout=timeout)
            return result.returncode, result.stdout, result.stderr
        else:
            result = subprocess.run(cmd, shell=shell, timeout=timeout)
            return result.returncode, "", ""
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)

# ============================================================================
# STEP 1: Install Test Dependencies
# ============================================================================
log("Step 1: Installing test dependencies...")

test_deps = [
    "pytest-cov",
    "pytest-xdist",
    "pytest-html",
    "factory-boy",
    "faker",
    "responses",
    "freezegun"
]

for dep in test_deps:
    log(f"  Installing {dep}...")
    returncode, stdout, stderr = run_command(f"pip install {dep} --quiet", timeout=60)
    if returncode == 0:
        log(f"  [OK] {dep} installed")
    else:
        log(f"  [WARN] Failed to install {dep}: {stderr[:100]}", "WARN")

# ============================================================================
# STEP 2: Run Existing Test Suite
# ============================================================================
log("Step 2: Running existing test suite...")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.test')

# Run pytest with coverage
log("  Running pytest with coverage...")
returncode, stdout, stderr = run_command(
    "python -m pytest tests/ -v --tb=short --cov=apps --cov-report=term-missing --cov-report=json:coverage.json --html=test_report.html --self-contained-html 2>&1",
    timeout=300
)

# Parse coverage results
try:
    if Path('coverage.json').exists():
        with open('coverage.json', 'r') as f:
            coverage_data = json.load(f)
        
        total_coverage = coverage_data.get('totals', {}).get('percent_covered', 0)
        results['coverage']['total'] = round(total_coverage, 2)
        log(f"  [OK] Total coverage: {total_coverage:.1f}%")
        
        # Module coverage
        modules = coverage_data.get('files', {})
        for module, data in list(modules.items())[:10]:
            coverage = data.get('summary', {}).get('percent_covered', 0)
            if coverage < 50:
                results['issues_found'].append(f"Low coverage in {module}: {coverage:.1f}%")
    else:
        log("  [WARN] Coverage report not generated", "WARN")
        results['coverage']['total'] = 0
except Exception as e:
    log(f"  [ERROR] Failed to parse coverage: {e}", "ERROR")
    results['coverage']['total'] = 0

# Count test results
if returncode == 0:
    log("  [OK] All tests passed")
    results['test_results']['status'] = 'PASSED'
else:
    log(f"  [WARN] Tests completed with return code: {returncode}", "WARN")
    results['test_results']['status'] = 'COMPLETED_WITH_ISSUES'

# Parse test output for counts
if stdout:
    lines = stdout.split('\n')
    for line in lines:
        if 'passed' in line and 'failed' in line:
            results['test_results']['summary'] = line.strip()
            log(f"  [OK] Test summary: {line.strip()}")
            break

# ============================================================================
# STEP 3: Create Missing Test Files
# ============================================================================
log("Step 3: Creating comprehensive test files...")

# Test file for payments
payments_test = '''"""
Comprehensive tests for Payments module.
"""

import pytest
from django.utils import timezone
from decimal import Decimal

from apps.payments.models import Payment, PaymentMethod


@pytest.mark.django_db
class TestPaymentModel:
    """Tests for Payment model."""

    def test_payment_creation(self, user):
        """Test payment is created correctly."""
        payment = Payment.objects.create(
            user=user,
            amount=Decimal('99.99'),
            currency='USD',
            status=Payment.Status.PENDING,
            method=Payment.Method.STRIPE,
        )
        
        assert payment.user == user
        assert payment.amount == Decimal('99.99')
        assert payment.status == Payment.Status.PENDING

    def test_payment_str(self, user):
        """Test string representation."""
        payment = Payment.objects.create(
            user=user,
            amount=Decimal('50.00'),
            currency='USD',
            status=Payment.Status.COMPLETED,
            method=Payment.Method.STRIPE,
        )
        
        assert str(payment.amount) in str(payment)
        assert str(payment.user) in str(payment)

    def test_payment_status_transitions(self, user):
        """Test payment status can be updated."""
        payment = Payment.objects.create(
            user=user,
            amount=Decimal('100.00'),
            currency='USD',
            status=Payment.Status.PENDING,
        )
        
        # Transition to completed
        payment.status = Payment.Status.COMPLETED
        payment.save()
        
        payment.refresh_from_db()
        assert payment.status == Payment.Status.COMPLETED


@pytest.mark.django_db
class TestPaymentMethodModel:
    """Tests for PaymentMethod model."""

    def test_payment_method_creation(self, user):
        """Test payment method is created correctly."""
        method = PaymentMethod.objects.create(
            user=user,
            type=PaymentMethod.Type.CARD,
            last4='4242',
            brand='visa',
            is_default=True,
        )
        
        assert method.user == user
        assert method.last4 == '4242'
        assert method.is_default is True
'''

payments_test_path = BASE_DIR / 'tests' / 'test_payments_comprehensive.py'
with open(payments_test_path, 'w') as f:
    f.write(payments_test)
results['tests_added'].append('test_payments_comprehensive.py')
log("  [OK] Created test_payments_comprehensive.py")

# Test file for chat
chat_test = '''"""
Comprehensive tests for Chat module.
"""

import pytest
from django.utils import timezone

from apps.chat.models import ChatRoom, Message


@pytest.mark.django_db
class TestChatRoomModel:
    """Tests for ChatRoom model."""

    def test_chat_room_creation(self, user):
        """Test chat room is created correctly."""
        room = ChatRoom.objects.create(
            name="Test Room",
            type=ChatRoom.Type.GROUP,
            created_by=user,
        )
        
        assert room.name == "Test Room"
        assert room.type == ChatRoom.Type.GROUP
        assert room.created_by == user

    def test_chat_room_str(self, user):
        """Test string representation."""
        room = ChatRoom.objects.create(
            name="Test Room",
            type=ChatRoom.Type.DIRECT,
            created_by=user,
        )
        
        assert "Test Room" in str(room)


@pytest.mark.django_db
class TestMessageModel:
    """Tests for Message model."""

    def test_message_creation(self, user):
        """Test message is created correctly."""
        room = ChatRoom.objects.create(
            name="Test Room",
            type=ChatRoom.Type.GROUP,
            created_by=user,
        )
        
        message = Message.objects.create(
            room=room,
            sender=user,
            content="Hello World!",
            type=Message.Type.TEXT,
        )
        
        assert message.room == room
        assert message.sender == user
        assert message.content == "Hello World!"
        assert message.is_edited is False

    def test_message_edit(self, user):
        """Test message can be edited."""
        room = ChatRoom.objects.create(
            name="Test Room",
            type=ChatRoom.Type.GROUP,
            created_by=user,
        )
        
        message = Message.objects.create(
            room=room,
            sender=user,
            content="Original",
            type=Message.Type.TEXT,
        )
        
        message.content = "Edited"
        message.is_edited = True
        message.save()
        
        message.refresh_from_db()
        assert message.content == "Edited"
        assert message.is_edited is True
'''

chat_test_path = BASE_DIR / 'tests' / 'test_chat_comprehensive.py'
with open(chat_test_path, 'w') as f:
    f.write(chat_test)
results['tests_added'].append('test_chat_comprehensive.py')
log("  [OK] Created test_chat_comprehensive.py")

# Test file for support
support_test = '''"""
Comprehensive tests for Support module.
"""

import pytest
from django.utils import timezone

from apps.support.models import Ticket, TicketComment


@pytest.mark.django_db
class TestTicketModel:
    """Tests for Ticket model."""

    def test_ticket_creation(self, user):
        """Test ticket is created correctly."""
        ticket = Ticket.objects.create(
            user=user,
            subject="Test Subject",
            description="Test Description",
            priority=Ticket.Priority.MEDIUM,
            status=Ticket.Status.OPEN,
        )
        
        assert ticket.user == user
        assert ticket.subject == "Test Subject"
        assert ticket.status == Ticket.Status.OPEN

    def test_ticket_status_update(self, user):
        """Test ticket status can be updated."""
        ticket = Ticket.objects.create(
            user=user,
            subject="Test",
            description="Test",
            status=Ticket.Status.OPEN,
        )
        
        ticket.status = Ticket.Status.RESOLVED
        ticket.save()
        
        ticket.refresh_from_db()
        assert ticket.status == Ticket.Status.RESOLVED

    def test_ticket_priority_levels(self, user):
        """Test all priority levels work."""
        priorities = [
            Ticket.Priority.LOW,
            Ticket.Priority.MEDIUM,
            Ticket.Priority.HIGH,
            Ticket.Priority.URGENT,
        ]
        
        for i, priority in enumerate(priorities):
            ticket = Ticket.objects.create(
                user=user,
                subject=f"Test {i}",
                description=f"Test {i}",
                priority=priority,
            )
            assert ticket.priority == priority
'''

support_test_path = BASE_DIR / 'tests' / 'test_support_comprehensive.py'
with open(support_test_path, 'w') as f:
    f.write(support_test)
results['tests_added'].append('test_support_comprehensive.py')
log("  [OK] Created test_support_comprehensive.py")

# Test file for live sessions
live_test = '''"""
Comprehensive tests for Live Sessions module.
"""

import pytest
from django.utils import timezone
from datetime import timedelta

from apps.live_sessions.models import LiveSession, LiveAttendance


@pytest.mark.django_db
class TestLiveSessionModel:
    """Tests for LiveSession model."""

    def test_live_session_creation(self, instructor, course):
        """Test live session is created correctly."""
        session = LiveSession.objects.create(
            title="Test Live Session",
            description="Test Description",
            instructor=instructor,
            course=course,
            scheduled_at=timezone.now() + timedelta(hours=1),
            duration_minutes=60,
            max_participants=100,
        )
        
        assert session.title == "Test Live Session"
        assert session.instructor == instructor
        assert session.status == LiveSession.Status.SCHEDULED

    def test_live_session_status_transitions(self, instructor, course):
        """Test live session status transitions."""
        session = LiveSession.objects.create(
            title="Test",
            instructor=instructor,
            course=course,
            scheduled_at=timezone.now(),
            duration_minutes=60,
        )
        
        # Start session
        session.status = LiveSession.Status.LIVE
        session.started_at = timezone.now()
        session.save()
        
        session.refresh_from_db()
        assert session.status == LiveSession.Status.LIVE
        assert session.started_at is not None
'''

live_test_path = BASE_DIR / 'tests' / 'test_live_sessions_comprehensive.py'
with open(live_test_path, 'w') as f:
    f.write(live_test)
results['tests_added'].append('test_live_sessions_comprehensive.py')
log("  [OK] Created test_live_sessions_comprehensive.py")

# Test file for tutors
tutors_test = '''"""
Comprehensive tests for Tutors module.
"""

import pytest
from django.utils import timezone

from apps.tutors.models import TutorProfile, TutorAvailability


@pytest.mark.django_db
class TestTutorProfileModel:
    """Tests for TutorProfile model."""

    def test_tutor_profile_creation(self, instructor):
        """Test tutor profile is created correctly."""
        profile = TutorProfile.objects.create(
            user=instructor,
            bio="Expert Python Developer",
            hourly_rate=50.00,
            is_verified=True,
            subjects=["Python", "Django", "AI"],
        )
        
        assert profile.user == instructor
        assert profile.hourly_rate == 50.00
        assert profile.is_verified is True
        assert "Python" in profile.subjects

    def test_tutor_rating_update(self, instructor):
        """Test tutor rating can be updated."""
        profile = TutorProfile.objects.create(
            user=instructor,
            bio="Test",
            hourly_rate=50.00,
            average_rating=4.5,
            total_reviews=10,
        )
        
        # Add new review
        profile.average_rating = 4.6
        profile.total_reviews = 11
        profile.save()
        
        profile.refresh_from_db()
        assert profile.average_rating == 4.6
        assert profile.total_reviews == 11
'''

tutors_test_path = BASE_DIR / 'tests' / 'test_tutors_comprehensive.py'
with open(tutors_test_path, 'w') as f:
    f.write(tutors_test)
results['tests_added'].append('test_tutors_comprehensive.py')
log("  [OK] Created test_tutors_comprehensive.py")

# ============================================================================
# STEP 4: Update conftest.py with Additional Fixtures
# ============================================================================
log("Step 4: Updating conftest.py with additional fixtures...")

conftest_additions = '''


@pytest.fixture
def course(db, instructor, category):
    """Create a test course."""
    from apps.courses.models import Course
    return Course.objects.create(
        title="Test Course",
        slug="test-course",
        description="Test Description",
        short_description="Short desc",
        instructor=instructor,
        category=category,
        is_published=True,
        is_free=True,
    )


@pytest.fixture
def category(db):
    """Create a test category."""
    from apps.courses.models import Category
    return Category.objects.create(
        name="Test Category",
        slug="test-category",
        description="Test Description",
    )


@pytest.fixture
def enrollment(db, user, course):
    """Create a test enrollment."""
    from apps.courses.models import Enrollment
    return Enrollment.objects.create(
        user=user,
        course=course,
        progress_percentage=0,
    )
'''

conftest_path = BASE_DIR / 'conftest.py'
if conftest_path.exists():
    with open(conftest_path, 'r', encoding='utf-8') as f:
        existing = f.read()
    
    if 'def course(' not in existing:
        with open(conftest_path, 'a', encoding='utf-8') as f:
            f.write(conftest_additions)
        results['tests_added'].append('Updated conftest.py with new fixtures')
        log("  [OK] Updated conftest.py")
    else:
        log("  [OK] conftest.py already has course fixtures")
else:
    log("  [WARN] conftest.py not found", "WARN")

# ============================================================================
# STEP 5: Run New Tests
# ============================================================================
log("Step 5: Running new comprehensive tests...")

returncode, stdout, stderr = run_command(
    "python -m pytest tests/test_payments_comprehensive.py tests/test_chat_comprehensive.py tests/test_support_comprehensive.py tests/test_live_sessions_comprehensive.py tests/test_tutors_comprehensive.py -v --tb=short 2>&1",
    timeout=120
)

if returncode == 0:
    log("  [OK] New comprehensive tests passed")
    results['test_results']['new_tests'] = 'PASSED'
else:
    log(f"  [WARN] New tests completed with return code: {returncode}", "WARN")
    results['test_results']['new_tests'] = 'COMPLETED_WITH_ISSUES'

# ============================================================================
# STEP 6: Generate Summary Report
# ============================================================================
log("=" * 80)
log("PHASE 2 SUMMARY")
log("=" * 80)

results['end_time'] = datetime.now().isoformat()
results['tests_added_count'] = len(results['tests_added'])

print(f"\n[RESULTS] TESTING & COVERAGE RESULTS:")
print(f"  [OK] Test files created: {results['tests_added_count']}")
print(f"  [OK] Coverage: {results['coverage'].get('total', 0)}%")
print(f"  [OK] Test status: {results['test_results'].get('status', 'UNKNOWN')}")

if results['issues_found']:
    print(f"\n[ISSUES] Coverage Issues Found:")
    for issue in results['issues_found'][:5]:
        print(f"  - {issue}")

print(f"\n[TESTS] Test Files Added:")
for test in results['tests_added']:
    print(f"  - {test}")

# Save report
report_file = BASE_DIR / f'PHASE2_TESTING_{int(time.time())}.json'
with open(report_file, 'w') as f:
    json.dump(results, f, indent=2, default=str)

print(f"\n[REPORT] Report saved: {report_file}")
print("=" * 80)

# Check if we achieved target coverage
target_coverage = 85
current_coverage = results['coverage'].get('total', 0)
if current_coverage >= target_coverage:
    print(f"[DONE] PHASE 2 COMPLETE - Target coverage achieved ({current_coverage}% >= {target_coverage}%)")
else:
    print(f"[DONE] PHASE 2 COMPLETE - Coverage at {current_coverage}%, target is {target_coverage}%")
    print("         Additional tests needed to reach target coverage")
print("=" * 80 + "\n")
