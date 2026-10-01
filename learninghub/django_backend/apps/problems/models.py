import uuid
from django.db import models
from django.conf import settings

def generate_problem_id():
    return f"prob-{uuid.uuid4().hex[:8]}"

def generate_submission_id():
    return f"sub-{uuid.uuid4().hex[:10]}"

class Problem(models.Model):
    DIFFICULTY_CHOICES = (
        ('Easy', 'Easy'),
        ('Medium', 'Medium'),
        ('Hard', 'Hard'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_problem_id)
    title = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField()
    difficulty = models.CharField(max_length=16, choices=DIFFICULTY_CHOICES, default='Medium', db_index=True)
    category = models.CharField(max_length=64, default='Algorithms', db_index=True)
    acceptance_rate = models.FloatField(default=68.5)
    submissions_count = models.IntegerField(default=2450)
    hints = models.JSONField(default=list, blank=True)
    starter_code = models.JSONField(default=dict, blank=True)
    time_limit_sec = models.FloatField(default=2.0)
    memory_limit_mb = models.IntegerField(default=256)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_problems'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.difficulty})"

class TestCase(models.Model):
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name='test_cases')
    input_data = models.TextField()
    expected_output = models.TextField()
    is_hidden = models.BooleanField(default=False)
    order = models.IntegerField(default=1)

    class Meta:
        db_table = 'lh_problem_testcases'
        ordering = ['order']

    def __str__(self):
        return f"TestCase for {self.problem.title} (Hidden: {self.is_hidden})"

class ProblemSubmission(models.Model):
    STATUS_CHOICES = (
        ('Accepted', 'Accepted'),
        ('Wrong Answer', 'Wrong Answer'),
        ('Time Limit Exceeded', 'Time Limit Exceeded'),
        ('Runtime Error', 'Runtime Error'),
        ('Compilation Error', 'Compilation Error'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_submission_id)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='problem_submissions')
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name='submissions')
    language = models.CharField(max_length=32, default='python')
    code = models.TextField()
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='Accepted')
    runtime_ms = models.IntegerField(default=45)
    memory_mb = models.FloatField(default=14.2)
    passed_testcases = models.IntegerField(default=0)
    total_testcases = models.IntegerField(default=0)
    stdout = models.TextField(blank=True, default='')
    stderr = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_problem_submissions'
        ordering = ['-created_at']
