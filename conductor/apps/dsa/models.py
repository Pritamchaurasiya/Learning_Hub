from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Problem(models.Model):
    class Difficulty(models.TextChoices):
        EASY = 'EASY', _('Easy')
        MEDIUM = 'MEDIUM', _('Medium')
        HARD = 'HARD', _('Hard')

    title = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(help_text="Markdown supported")
    difficulty = models.CharField(
        max_length=10,
        choices=Difficulty.choices,
        default=Difficulty.EASY
    )
    points = models.IntegerField(default=10)
    tags = models.ManyToManyField(Tag, related_name='problems', blank=True)
    constraints = models.TextField(help_text="Time & Memory constraints")

    # Metadata
    input_format = models.TextField()
    output_format = models.TextField()
    examples = models.JSONField(default=list, help_text="Structured examples for UI")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['difficulty', 'is_active']),  # Common API filter
            models.Index(fields=['is_active']),
        ]


class TestCase(models.Model):
    __test__ = False
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name='test_cases')
    input_data = models.TextField()
    expected_output = models.TextField()
    is_hidden = models.BooleanField(default=True, help_text="Hidden cases are for evaluation, visible for example")
    explanation = models.TextField(blank=True, help_text="Explanation for example cases")

    def __str__(self):
        return f"TestCase for {self.problem.title} (Hidden: {self.is_hidden})"


class Submission(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        ACCEPTED = 'AC', _('Accepted')
        WRONG_ANSWER = 'WA', _('Wrong Answer')
        TIME_LIMIT_EXCEEDED = 'TLE', _('Time Limit Exceeded')
        RUNTIME_ERROR = 'RE', _('Runtime Error')
        COMPILATION_ERROR = 'CE', _('Compilation Error')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name='submissions')
    code = models.TextField()
    language = models.CharField(max_length=50, default='python')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    runtime_ms = models.IntegerField(null=True, blank=True)
    memory_kb = models.IntegerField(null=True, blank=True)
    error_log = models.TextField(blank=True)
    ai_feedback = models.JSONField(null=True, blank=True, help_text="AI generated code review and hints")

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['user', 'problem', 'status']),  # For "Already Solved" check
            models.Index(fields=['status']),  # For filtering by status
            models.Index(fields=['-submitted_at']),  # For rigorous timeline ordering
            models.Index(fields=['user', '-submitted_at']),  # Optimized "My History" query
        ]

    def __str__(self):
        return f"{self.user.username} - {self.problem.title} - {self.status}"
