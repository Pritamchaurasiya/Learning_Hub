from django.db import models
from django.conf import settings
from apps.core.models import BaseModel

class TutorProfile(BaseModel):
    """Profile for users registered as Tutors."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutor_profile'
    )
    bio = models.TextField()
    hourly_rate = models.DecimalField(max_digits=6, decimal_places=2)
    skills = models.CharField(max_length=255, help_text="Comma separated skills")
    rating = models.FloatField(default=0.0)
    total_reviews = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"Tutor: {self.user.get_full_name()}"

class Booking(BaseModel):
    """A booking session between a student and a tutor."""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    )

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    tutor = models.ForeignKey(
        TutorProfile,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    meeting_link = models.URLField(blank=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.student} with {self.tutor} on {self.start_time}"
