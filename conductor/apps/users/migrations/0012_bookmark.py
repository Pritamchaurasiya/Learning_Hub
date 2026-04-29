# Generated migration for Bookmark model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0001_initial'),
        ('users', '0005_remove_organization_idx_org_active_name_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Bookmark',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True, help_text='User notes about this bookmark')),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookmarked_by', to='courses.course')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookmarks', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'user_bookmarks',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='bookmark',
            constraint=models.UniqueConstraint(fields=('user', 'course'), name='unique_user_course_bookmark'),
        ),
        migrations.AddIndex(
            model_name='bookmark',
            index=models.Index(fields=['user', 'created_at'], name='user_bookmarks_user_id_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='bookmark',
            index=models.Index(fields=['course'], name='user_bookmarks_course_id_idx'),
        ),
    ]
