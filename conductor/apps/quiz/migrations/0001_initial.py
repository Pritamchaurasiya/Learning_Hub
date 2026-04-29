# Generated initial migration for quiz app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('courses', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Quiz',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('time_limit_minutes', models.PositiveIntegerField(default=30)),
                ('passing_score', models.PositiveIntegerField(default=70)),
                ('max_attempts', models.PositiveIntegerField(default=3)),
                ('is_published', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quizzes', to='courses.course')),
            ],
            options={
                'db_table': 'quizzes',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Question',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('text', models.TextField()),
                ('question_type', models.CharField(choices=[('mcq', 'Multiple Choice'), ('true_false', 'True/False'), ('short_answer', 'Short Answer')], default='mcq', max_length=20)),
                ('marks', models.PositiveIntegerField(default=1)),
                ('order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('quiz', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='quiz.quiz')),
            ],
            options={
                'db_table': 'quiz_questions',
                'ordering': ['order', 'created_at'],
            },
        ),
        migrations.CreateModel(
            name='Option',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('text', models.CharField(max_length=255)),
                ('is_correct', models.BooleanField(default=False)),
                ('order', models.PositiveIntegerField(default=0)),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='options', to='quiz.question')),
            ],
            options={
                'db_table': 'quiz_options',
                'ordering': ['order'],
            },
        ),
        migrations.CreateModel(
            name='QuizAttempt',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('in_progress', 'In Progress'), ('completed', 'Completed'), ('abandoned', 'Abandoned')], default='in_progress', max_length=20)),
                ('score', models.PositiveIntegerField(default=0)),
                ('max_score', models.PositiveIntegerField(default=0)),
                ('percentage_score', models.FloatField(default=0)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('time_taken_seconds', models.PositiveIntegerField(default=0)),
                ('attempt_number', models.PositiveIntegerField(default=1)),
                ('quiz', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attempts', to='quiz.quiz')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_attempts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'quiz_attempts',
                'ordering': ['-started_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='quizattempt',
            constraint=models.UniqueConstraint(fields=('user', 'quiz', 'attempt_number'), name='unique_quiz_attempt'),
        ),
        migrations.CreateModel(
            name='QuizAnswer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('text_answer', models.TextField(blank=True)),
                ('is_correct', models.BooleanField(default=False)),
                ('marks_obtained', models.PositiveIntegerField(default=0)),
                ('answered_at', models.DateTimeField(auto_now_add=True)),
                ('attempt', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='quiz.quizattempt')),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='quiz.question')),
                ('selected_option', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='quiz.option')),
            ],
            options={
                'db_table': 'quiz_answers',
                'ordering': ['answered_at'],
            },
        ),
    ]
