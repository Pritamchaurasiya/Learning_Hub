from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True, db_index=True)
    slug = models.SlugField(unique=True, max_length=60, db_index=True)
    description = models.TextField(blank=True)
    problem_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "dsa_tags"
        ordering = ['name']
        verbose_name = "Problem Tag"
        verbose_name_plural = "Problem Tags"
        indexes = [
            models.Index(fields=['name'], name='idx_dsa_tag_name'),
            models.Index(fields=['-problem_count'], name='idx_tag_popular'),
        ]


class Problem(models.Model):
    class Difficulty(models.TextChoices):
        EASY = 'EASY', _('Easy')
        MEDIUM = 'MEDIUM', _('Medium')
        HARD = 'HARD', _('Hard')

    title = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(unique=True, max_length=280, db_index=True)
    description = models.TextField(help_text="Markdown supported")
    difficulty = models.CharField(
        max_length=10,
        choices=Difficulty.choices,
        default=Difficulty.EASY,
        db_index=True
    )
    points = models.IntegerField(default=10, db_index=True)
    tags = models.ManyToManyField(Tag, related_name='problems', blank=True)
    constraints = models.TextField(help_text="Time & Memory constraints")

    # Metadata
    input_format = models.TextField()
    output_format = models.TextField()
    examples = models.JSONField(default=list, help_text="Structured examples for UI")

    # Stats
    total_submissions = models.PositiveIntegerField(default=0)
    accepted_submissions = models.PositiveIntegerField(default=0)
    acceptance_rate = models.FloatField(default=0.0, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    def __str__(self):
        return self.title

    class Meta:
        db_table = "dsa_problems"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['difficulty', 'is_active'], name='idx_problem_diff_active'),  # Common API filter
            models.Index(fields=['is_active'], name='idx_problem_active'),
            models.Index(fields=['is_active', '-created_at'], name='idx_problem_active_recent'),
            models.Index(fields=['difficulty', 'points'], name='idx_problem_diff_points'),
            models.Index(fields=['-acceptance_rate'], name='idx_problem_acceptance'),
            models.Index(fields=['title'], name='idx_problem_title'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(points__gte=0),
                name='problem_points_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(acceptance_rate__gte=0, acceptance_rate__lte=100),
                name='problem_acceptance_rate_range'
            ),
        ]
    
    def update_acceptance_rate(self):
        """Update acceptance rate based on submissions."""
        if self.total_submissions > 0:
            self.acceptance_rate = round((self.accepted_submissions / self.total_submissions) * 100, 2)
        else:
            self.acceptance_rate = 0.0
        self.save(update_fields=['acceptance_rate'])


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
    
    class Language(models.TextChoices):
        PYTHON = 'python', 'Python'
        JAVASCRIPT = 'javascript', 'JavaScript'
        CPP = 'cpp', 'C++'
        JAVA = 'java', 'Java'
        C = 'c', 'C'
        GO = 'go', 'Go'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions', db_index=True)
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name='submissions', db_index=True)
    code = models.TextField()
    language = models.CharField(max_length=50, choices=Language.choices, default=Language.PYTHON, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    runtime_ms = models.IntegerField(null=True, blank=True, db_index=True)
    memory_kb = models.IntegerField(null=True, blank=True)
    error_log = models.TextField(blank=True)
    ai_feedback = models.JSONField(null=True, blank=True, help_text="AI generated code review and hints")
    
    test_cases_passed = models.PositiveIntegerField(default=0)
    test_cases_total = models.PositiveIntegerField(default=0)

    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "dsa_submissions"
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['user', 'problem', 'status'], name='idx_sub_user_prob_status'),  # For "Already Solved" check
            models.Index(fields=['status'], name='idx_submission_status'),  # For filtering by status
            models.Index(fields=['-submitted_at'], name='idx_submission_recent'),  # For rigorous timeline ordering
            models.Index(fields=['user', '-submitted_at'], name='idx_submission_user_recent'),  # Optimized "My History" query
            models.Index(fields=['problem', '-submitted_at'], name='idx_submission_problem_recent'),  # Problem submissions
            models.Index(fields=['user', 'status', '-submitted_at'], name='idx_submission_user_status'),  # User accepted solutions
            models.Index(fields=['language', 'status'], name='idx_submission_lang_status'),  # Language stats
            models.Index(fields=['runtime_ms'], name='idx_submission_runtime'),  # Fastest solutions
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(runtime_ms__isnull=True) | models.Q(runtime_ms__gte=0),
                name='submission_runtime_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(memory_kb__isnull=True) | models.Q(memory_kb__gte=0),
                name='submission_memory_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(test_cases_passed__lte=models.F('test_cases_total')),
                name='submission_passed_less_than_total'
            ),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.problem.title} - {self.status}"
    
    def is_accepted(self):
        """Check if submission was accepted."""
        return self.status == self.Status.ACCEPTED


class DailyProblem(models.Model):
    """Problem of the Day (POTD) with bonus XP rewards."""
    date = models.DateField(unique=True, db_index=True)
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name='daily_features')
    bonus_xp = models.PositiveIntegerField(default=50)
    solved_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        verbose_name = "Problem of the Day"
        verbose_name_plural = "Problems of the Day"

    def __str__(self):
        return f"POTD {self.date}: {self.problem.title}"


class UserCodeDraft(models.Model):
    """Saves user's in-progress code drafts per problem and language."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dsa_drafts')
    problem = models.ForeignKey(Problem, on_delete=models.CASCADE, related_name='user_drafts')
    language = models.CharField(max_length=50, default='python')
    code = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'problem', 'language']
        indexes = [
            models.Index(fields=['user', 'problem']),
        ]

    def __str__(self):
        return f"Draft for {self.user.username} on {self.problem.title} ({self.language})"
