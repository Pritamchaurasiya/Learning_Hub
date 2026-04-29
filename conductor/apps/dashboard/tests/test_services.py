from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import connection, reset_queries
from apps.courses.models import Course, Enrollment, Category
from apps.dashboard.services import InstructorService
from decimal import Decimal

User = get_user_model()

class InstructorServiceTest(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username='instructor', email='inst@example.com', password='pass', role='instructor'
        )
        self.student1 = User.objects.create_user(
            username='s1', email='s1@example.com', password='pass'
        )
        self.student2 = User.objects.create_user(
            username='s2', email='s2@example.com', password='pass'
        )
        self.category = Category.objects.create(name='Dev', slug='dev')

        # Create courses
        self.course1 = Course.objects.create(
            title='Course 1', slug='c1', instructor=self.instructor, 
            price=Decimal('10.00'), category=self.category, is_published=True
        )
        self.course2 = Course.objects.create(
            title='Course 2', slug='c2', instructor=self.instructor, 
            price=Decimal('20.00'), category=self.category, is_published=True
        )
        
        # Enrollments
        Enrollment.objects.create(user=self.student1, course=self.course1)
        Enrollment.objects.create(user=self.student2, course=self.course1)
        Enrollment.objects.create(user=self.student1, course=self.course2)
        
        # Update enrollment_count manually (signals should do this, but test may need explicit update)
        self.course1.enrollment_count = 2
        self.course1.save(update_fields=['enrollment_count'])
        self.course2.enrollment_count = 1
        self.course2.save(update_fields=['enrollment_count'])

    def test_get_stats_accuracy(self):
        # Refresh courses from DB to get updated enrollment_count
        self.course1.refresh_from_db()
        self.course2.refresh_from_db()
        
        stats = InstructorService.get_stats(self.instructor)
        
        self.assertEqual(stats['total_courses'], 2)
        # Distinct students: s1 and s2
        self.assertEqual(stats['total_students'], 2)
        
        # Revenue: (10*2) + (20*1) = 40
        self.assertEqual(stats['total_revenue'], Decimal('40.00'))

    def test_get_stats_performance(self):
        """Ensure get_stats does not execute N+1 queries."""
        reset_queries()
        
        # We expect a constant number of queries regardless of course count
        # 1. Filter courses
        # 2. Count courses
        # 3. Count students
        # 4. Aggregate revenue
        # 5. Aggregate rating
        # Should be around 4-5 queries max.
        
        with self.assertNumQueries(4):
            InstructorService.get_stats(self.instructor)
