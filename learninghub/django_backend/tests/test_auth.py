import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User

@pytest.mark.django_db
class TestAuthEndpoints:
    def setup_method(self):
        self.client = APIClient()

    def test_register_success(self):
        url = reverse('auth-register')
        payload = {
            'email': 'newstudent@learninghub.app',
            'password': 'SecurePassword123!',
            'username': 'NewStudent'
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['status'] == 'success'
        assert 'token' in res.data['data']
        assert res.data['data']['user']['email'] == 'newstudent@learninghub.app'

    def test_register_duplicate_email(self):
        User.objects.create_user(email='existing@learninghub.app', password='Password123!')
        url = reverse('auth-register')
        payload = {
            'email': 'existing@learninghub.app',
            'password': 'Password123!',
            'username': 'Existing'
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_success(self):
        User.objects.create_user(email='testlogin@learninghub.app', password='Password123!', username='TestLogin')
        url = reverse('auth-login')
        payload = {
            'email': 'testlogin@learninghub.app',
            'password': 'Password123!'
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        assert 'token' in res.data['data']
        assert res.data['data']['user']['username'] == 'TestLogin'

    def test_login_invalid_password_lockout(self):
        user = User.objects.create_user(email='lockout@learninghub.app', password='CorrectPassword123!')
        url = reverse('auth-login')

        for _ in range(5):
            self.client.post(url, {'email': 'lockout@learninghub.app', 'password': 'WrongPassword'}, format='json')

        user.refresh_from_db()
        assert user.failed_logins >= 5
        assert user.is_locked

        res = self.client.post(url, {'email': 'lockout@learninghub.app', 'password': 'WrongPassword'}, format='json')
        assert res.status_code == status.HTTP_401_UNAUTHORIZED
        assert res.data['code'] == 'ACCOUNT_LOCKED'

    def test_admin_auth_flow(self):
        # Admin Register
        admin_reg_url = reverse('admin-auth-register')
        res = self.client.post(admin_reg_url, {
            'email': 'newadmin@learninghub.app',
            'password': 'AdminPassword123!',
            'username': 'NewAdmin',
            'adminSecret': 'test-admin-secret-key-32charslong!!'
        }, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['data']['user']['role'] == 'ADMIN'

        # Admin Login
        admin_login_url = reverse('admin-auth-login')
        login_res = self.client.post(admin_login_url, {
            'email': 'newadmin@learninghub.app',
            'password': 'AdminPassword123!'
        }, format='json')
        assert login_res.status_code == status.HTTP_200_OK
        assert login_res.data['data']['user']['role'] == 'ADMIN'

    def test_admin_endpoints_require_admin_role(self):
        # 1. Unauthenticated request to admin endpoints should fail (401/403)
        admin_users_url = reverse('admin-users-list')
        res_unauth = self.client.get(admin_users_url)
        assert res_unauth.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

        # 2. Authenticated STUDENT request to admin endpoints should be forbidden (403)
        student = User.objects.create_user(email='regularstudent@learninghub.app', password='Password123!', role='STUDENT')
        self.client.force_authenticate(user=student)
        res_student = self.client.get(admin_users_url)
        assert res_student.status_code == status.HTTP_403_FORBIDDEN

        # 3. Authenticated ADMIN request to admin endpoints should succeed (200)
        admin = User.objects.create_user(email='realadmin@learninghub.app', password='Password123!', role='ADMIN')
        self.client.force_authenticate(user=admin)
        res_admin = self.client.get(admin_users_url)
        assert res_admin.status_code == status.HTTP_200_OK

