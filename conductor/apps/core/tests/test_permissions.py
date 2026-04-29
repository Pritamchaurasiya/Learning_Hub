from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.permissions import BasePermission
from apps.core.permissions import IsInstructor, IsOwner
from unittest.mock import Mock

User = get_user_model()

class MockView:
    pass

class MockObject:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

class PermissionsTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.instructor = User.objects.create_user(
            username='inst', email='inst@ex.com', password='pass', role='instructor'
        )
        self.student = User.objects.create_user(
            username='stud', email='stud@ex.com', password='pass', role='student'
        )
        self.staff = User.objects.create_user(
            username='admin', email='admin@ex.com', password='pass', is_staff=True
        )

    def test_is_instructor(self):
        perm = IsInstructor()
        view = MockView()
        
        # Instructor should pass
        request = self.factory.get('/')
        request.user = self.instructor
        self.assertTrue(perm.has_permission(request, view))
        
        # Staff should pass
        request.user = self.staff
        self.assertTrue(perm.has_permission(request, view))
        
        # Student should fail
        request.user = self.student
        self.assertFalse(perm.has_permission(request, view))
        
        # Unauthenticated should fail
        request.user = Mock(is_authenticated=False)
        self.assertFalse(perm.has_permission(request, view))

    def test_is_owner(self):
        perm = IsOwner()
        view = MockView()
        obj = MockObject(owner=self.student)
        
        # Owner should pass
        request = self.factory.get('/')
        request.user = self.student
        self.assertTrue(perm.has_object_permission(request, view, obj))
        
        # Non-owner should fail
        request.user = self.instructor
        self.assertFalse(perm.has_object_permission(request, view, obj))
        
        # Check alias 'user'
        obj2 = MockObject(user=self.student)
        request.user = self.student
        self.assertTrue(perm.has_object_permission(request, view, obj2))

        # Check alias 'author'
        obj3 = MockObject(author=self.student)
        self.assertTrue(perm.has_object_permission(request, view, obj3))
