# Generated manually for database optimization
from django.db import migrations, models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_initial'),  # Adjust based on your latest migration
    ]

    operations = [
        # Enable PostgreSQL extensions
        TrigramExtension(),
        
        # Add indexes to AuditLog
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['created_at'], name='auditlog_created_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['is_active', 'created_at'], name='auditlog_active_time_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['-created_at'], name='auditlog_recent_idx'),
        ),
        
        # Add indexes to EnterpriseAuditLog
        migrations.AddIndex(
            model_name='enterpriseauditlog',
            index=models.Index(fields=['created_at'], name='entaudit_created_idx'),
        ),
        migrations.AddIndex(
            model_name='enterpriseauditlog',
            index=models.Index(fields=['is_active', 'created_at'], name='entaudit_active_time_idx'),
        ),
        migrations.AddIndex(
            model_name='enterpriseauditlog',
            index=models.Index(fields=['username'], name='entaudit_username_idx'),
        ),
        migrations.AddIndex(
            model_name='enterpriseauditlog',
            index=models.Index(fields=['resource_name'], name='entaudit_resource_idx'),
        ),
    ]
