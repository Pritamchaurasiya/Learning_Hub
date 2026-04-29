"""
Celery tasks for Learning Hub Backend.
"""

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import datetime


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id):
    """Send welcome email to newly registered user."""
    from apps.users.models import User

    try:
        user = User.objects.get(id=user_id)
        send_mail(
            subject="Welcome to Learning Hub!",
            message=f"""
Hi {user.display_name or user.username},

Welcome to Learning Hub! We're excited to have you join our learning community.

Start exploring courses and begin your learning journey today!

Best regards,
The Learning Hub Team
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return f"Welcome email sent to {user.email}"
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email(self, user_id, reset_token):
    """Send password reset email."""
    from apps.users.models import User

    try:
        user = User.objects.get(id=user_id)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        send_mail(
            subject="Reset Your Password - Learning Hub",
            message=f"""
Hi {user.display_name or user.username},

You requested to reset your password. Click the link below:

{reset_url}

If you didn't request this, please ignore this email.

Best regards,
The Learning Hub Team
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return f"Reset email sent to {user.email}"
    except Exception as exc:
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3)
def send_enrollment_confirmation(self, enrollment_id):
    """Send enrollment confirmation email."""
    from apps.courses.models import Enrollment

    try:
        enrollment = Enrollment.objects.select_related("user", "course").get(
            id=enrollment_id
        )
        user = enrollment.user
        course = enrollment.course

        send_mail(
            subject=f"You're enrolled in {course.title}!",
            message=f"""
Hi {user.display_name or user.username},

Congratulations! You're now enrolled in "{course.title}".

Start learning now and track your progress.

Best regards,
The Learning Hub Team
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return f"Enrollment confirmation sent for {course.title}"
    except Exception as exc:
        self.retry(exc=exc)


@shared_task
def check_streak_expiry():
    """Check and update expired streaks. Run daily at midnight."""
    from apps.gamification.models import Streak

    yesterday = timezone.now().date() - datetime.timedelta(days=1)
    expired = Streak.objects.filter(
        last_activity_date__lt=yesterday, current_streak__gt=0
    )

    count = expired.update(current_streak=0)
    return f"Reset {count} expired streaks"


@shared_task
def calculate_course_stats():
    """Update denormalized course statistics. Run daily."""
    from django.db.models import Avg, Count
    from apps.courses.models import Course

    courses = Course.objects.annotate(
        _avg_rating=Avg("reviews__rating"),
        _review_count=Count("reviews"),
        _enrollment_count=Count("enrollments"),
    )

    for course in courses:
        course.avg_rating = course._avg_rating or 0
        course.review_count = course._review_count
        course.enrollment_count = course._enrollment_count
        course.save(update_fields=["avg_rating", "review_count", "enrollment_count"])

    return f"Updated stats for {courses.count()} courses"


@shared_task
def reset_weekly_xp():
    """Reset weekly XP for all users. Run every Monday."""
    from apps.gamification.models import UserXP

    count = UserXP.objects.all().update(weekly_xp=0)
    return f"Reset weekly XP for {count} users"


@shared_task(bind=True, max_retries=2)
def generate_certificate(self, enrollment_id):
    """Generate completion certificate. Called when course completed."""
    from apps.courses.models import Enrollment

    try:
        enrollment = Enrollment.objects.select_related("user", "course").get(
            id=enrollment_id
        )

        # Generate Certificate Image
        from PIL import Image, ImageDraw, ImageFont
        import io
        from django.core.files.base import ContentFile
        from django.core.mail import EmailMessage

        # Create basic certificate
        width, height = 1200, 800
        image = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(image)
        
        # Simple styling
        draw.rectangle([20, 20, width-20, height-20], outline="#7C3AED", width=10)
        
        # Add Text (Fallbacks for fonts)
        try:
            title_font = ImageFont.truetype("arial.ttf", 60)
            text_font = ImageFont.truetype("arial.ttf", 40)
        except IOError:
            title_font = ImageFont.load_default()
            text_font = ImageFont.load_default()

        draw.text((width/2, 200), "Certificate of Completion", font=title_font, fill="black", anchor="mm")
        draw.text((width/2, 350), f"Proudly presented to", font=text_font, fill="gray", anchor="mm")
        draw.text((width/2, 450), enrollment.user.display_name, font=title_font, fill="#7C3AED", anchor="mm")
        draw.text((width/2, 600), f"For completing: {enrollment.course.title}", font=text_font, fill="black", anchor="mm")
        
        # Save to buffer
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        
        # Attach to email
        email = EmailMessage(
            subject=f"Congratulations! You completed {enrollment.course.title}",
            body=f"""
Hi {enrollment.user.display_name},

Congratulations on completing "{enrollment.course.title}"!

Your certificate of completion is attached.

Best regards,
The Learning Hub Team
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[enrollment.user.email],
        )
        email.attach(f'certificate_{enrollment.id}.png', buffer.getvalue(), 'image/png')
        email.send()

        return f"Certificate generated and sent to {enrollment.user.email}"
    except Exception as exc:
        self.retry(exc=exc)
