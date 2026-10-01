import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.core.management import call_command
import os

@pytest.mark.django_db
class TestCoreAndOps:
    def setup_method(self):
        self.client = APIClient()

    def test_health_endpoints(self):
        # 1. Base Health
        res = self.client.get(reverse('health-check'))
        assert res.status_code == status.HTTP_200_OK
        assert res.data['data']['status'] == 'healthy'

        # 2. Readiness Probe
        ready_res = self.client.get(reverse('health-ready'))
        assert ready_res.status_code == status.HTTP_200_OK
        assert ready_res.data['data']['ready'] is True

        # 3. Liveness Probe
        live_res = self.client.get(reverse('health-live'))
        assert live_res.status_code == status.HTTP_200_OK
        assert live_res.data['data']['alive'] is True

    def test_system_telemetry_metrics(self):
        from apps.users.models import User
        # Unauthenticated request should be rejected
        unauth_res = self.client.get(reverse('system-metrics'))
        assert unauth_res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

        # Authenticated Admin request should succeed
        admin_user = User.objects.create_user(email='opsadmin@learninghub.app', password='Password123!', username='OpsAdmin', role='ADMIN')
        self.client.force_authenticate(user=admin_user)
        res = self.client.get(reverse('system-metrics'))
        assert res.status_code == status.HTTP_200_OK
        assert res.data['status'] == 'success'
        assert 'memory_rss_mb' in res.data['data']
        assert 'threads_count' in res.data['data']
        assert res.data['data']['service'] == 'learninghub-django-asgi'

    def test_backup_and_verify_commands(self, tmp_path):
        # Test backup_database command
        backup_dir = str(tmp_path / 'backups')
        call_command('backup_database', output_dir=backup_dir)
        files = os.listdir(backup_dir)
        assert len(files) == 1
        assert files[0].endswith('.json.gz')

        # Test verify_system command
        call_command('verify_system')
