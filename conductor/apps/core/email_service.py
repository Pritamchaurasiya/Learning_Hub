"""
Email Service with Templates

Professional email system with:
1. HTML email templates
2. Transactional emails
3. Marketing emails
4. Email verification
5. Welcome series
6. Analytics tracking
"""

import logging
from datetime import timedelta
from typing import Dict, Any, List, Optional
from enum import Enum

from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger(__name__)


class EmailType(Enum):
    """Types of emails."""
    # Authentication
    WELCOME = "welcome"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    LOGIN_ALERT = "login_alert"
    
    # Course related
    COURSE_ENROLLED = "course_enrolled"
    COURSE_COMPLETED = "course_completed"
    LESSON_REMINDER = "lesson_reminder"
    CERTIFICATE_READY = "certificate_ready"
    
    # Payment related
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    SUBSCRIPTION_EXPIRING = "subscription_expiring"
    SUBSCRIPTION_RENEWED = "subscription_renewed"
    REFUND_PROCESSED = "refund_processed"
    INVOICE = "invoice"
    
    # Engagement
    STREAK_REMINDER = "streak_reminder"
    CHALLENGE_INVITE = "challenge_invite"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    WEEKLY_DIGEST = "weekly_digest"
    
    # Social
    NEW_FOLLOWER = "new_follower"
    DISCUSSION_REPLY = "discussion_reply"
    MENTION = "mention"
    
    # Live sessions
    SESSION_REMINDER = "session_reminder"
    SESSION_RECORDING = "session_recording"


class EmailTemplate:
    """Email template configuration."""
    
    TEMPLATES = {
        EmailType.WELCOME: {
            "subject": "🎉 Welcome to Learning Hub, {first_name}!",
            "template": "emails/welcome.html",
            "text_template": "emails/welcome.txt"
        },
        EmailType.EMAIL_VERIFICATION: {
            "subject": "Verify your email address",
            "template": "emails/verify_email.html",
            "text_template": "emails/verify_email.txt"
        },
        EmailType.PASSWORD_RESET: {
            "subject": "Reset your password",
            "template": "emails/password_reset.html",
            "text_template": "emails/password_reset.txt"
        },
        EmailType.COURSE_ENROLLED: {
            "subject": "🎓 You're enrolled in {course_name}!",
            "template": "emails/course_enrolled.html",
            "text_template": "emails/course_enrolled.txt"
        },
        EmailType.COURSE_COMPLETED: {
            "subject": "🏆 Congratulations! You completed {course_name}",
            "template": "emails/course_completed.html",
            "text_template": "emails/course_completed.txt"
        },
        EmailType.CERTIFICATE_READY: {
            "subject": "📜 Your certificate is ready!",
            "template": "emails/certificate_ready.html",
            "text_template": "emails/certificate_ready.txt"
        },
        EmailType.PAYMENT_SUCCESS: {
            "subject": "✅ Payment confirmed - Order #{order_id}",
            "template": "emails/payment_success.html",
            "text_template": "emails/payment_success.txt"
        },
        EmailType.STREAK_REMINDER: {
            "subject": "🔥 Don't break your {streak_days}-day streak!",
            "template": "emails/streak_reminder.html",
            "text_template": "emails/streak_reminder.txt"
        },
        EmailType.ACHIEVEMENT_UNLOCKED: {
            "subject": "🏅 Achievement unlocked: {achievement_name}",
            "template": "emails/achievement_unlocked.html",
            "text_template": "emails/achievement_unlocked.txt"
        },
        EmailType.WEEKLY_DIGEST: {
            "subject": "📊 Your weekly learning summary",
            "template": "emails/weekly_digest.html",
            "text_template": "emails/weekly_digest.txt"
        },
        EmailType.SESSION_REMINDER: {
            "subject": "📺 Live session starting soon: {session_title}",
            "template": "emails/session_reminder.html",
            "text_template": "emails/session_reminder.txt"
        },
    }


class EmailService:
    """
    Professional email sending service.
    """
    
    DEFAULT_FROM = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Learning Hub <noreply@learninghub.com>')
    FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'https://learninghub.com')
    
    # ==========================================================================
    # CORE EMAIL SENDING
    # ==========================================================================
    
    @classmethod
    def send_email(
        cls,
        to_email: str,
        email_type: EmailType,
        context: Dict[str, Any],
        from_email: Optional[str] = None,
        attachments: Optional[List[tuple]] = None
    ) -> bool:
        """
        Send an email using template.
        
        Args:
            to_email: Recipient email
            email_type: Type of email to send
            context: Template context variables
            from_email: Sender email (optional)
            attachments: List of (filename, content, mimetype) tuples
            
        Returns:
            True if sent successfully
        """
        template_config = EmailTemplate.TEMPLATES.get(email_type)
        if not template_config:
            logger.error(f"Unknown email type: {email_type}")
            return False
        
        try:
            # Format subject
            subject = template_config["subject"].format(**context)
            
            # Add default context
            context.update({
                'frontend_url': cls.FRONTEND_URL,
                'current_year': timezone.now().year,
                'support_email': 'support@learninghub.com'
            })
            
            # Render templates
            html_content = cls._render_template(template_config["template"], context)
            text_content = cls._render_template(template_config.get("text_template"), context)
            
            # If attachments are present, we must send synchronously (serializing attachments is complex)
            if attachments:
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=from_email or cls.DEFAULT_FROM,
                    to=[to_email]
                )
                email.attach_alternative(html_content, "text/html")
                for filename, content, mimetype in attachments:
                    email.attach(filename, content, mimetype)
                email.send(fail_silently=False)
                logger.info(f"Sync email with attachments sent to {to_email}")
            else:
                # Async Send
                from apps.core.tasks import send_email_task
                send_email_task.delay(
                    subject=subject,
                    body=text_content,
                    to_email=to_email,
                    html_content=html_content,
                    from_email=from_email or cls.DEFAULT_FROM
                )
            
            # Log for analytics
            cls._log_email_sent(to_email, email_type)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email {email_type.value} to {to_email}: {e}")
            return False
    
    @classmethod
    def _render_template(cls, template_path: Optional[str], context: Dict) -> str:
        """Render email template or return fallback."""
        if not template_path:
            return ""
        
        try:
            return render_to_string(template_path, context)
        except Exception:
            # Fallback to inline template
            return cls._get_fallback_template(template_path, context)
    
    @classmethod
    def _get_fallback_template(cls, template_type: str, context: Dict) -> str:
        """Get fallback inline template."""
        # Simplified fallback templates
        return f"""
        <html>
        <body>
            <h1>Learning Hub</h1>
            <p>Hello {context.get('first_name', 'Learner')},</p>
            <p>{context.get('message', 'Thank you for using Learning Hub!')}</p>
        </body>
        </html>
        """
    
    @classmethod
    def _log_email_sent(cls, to_email: str, email_type: EmailType) -> None:
        """Log email for analytics."""
        # In production, save to EmailLog model
        pass
    
    # ==========================================================================
    # SPECIFIC EMAIL FUNCTIONS
    # ==========================================================================
    
    @classmethod
    def send_welcome_email(cls, user) -> bool:
        """Send welcome email to new user."""
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.WELCOME,
            context={
                'first_name': user.first_name or user.username,
                'username': user.username,
                'dashboard_url': f"{cls.FRONTEND_URL}/dashboard"
            }
        )
    
    @classmethod
    def send_verification_email(cls, user, token: str) -> bool:
        """Send email verification link."""
        verification_url = f"{cls.FRONTEND_URL}/verify-email?token={token}"
        
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.EMAIL_VERIFICATION,
            context={
                'first_name': user.first_name or user.username,
                'verification_url': verification_url,
                'expires_in': '24 hours'
            }
        )
    
    @classmethod
    def send_password_reset_email(cls, user, token: str) -> bool:
        """Send password reset link."""
        reset_url = f"{cls.FRONTEND_URL}/reset-password?token={token}"
        
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.PASSWORD_RESET,
            context={
                'first_name': user.first_name or user.username,
                'reset_url': reset_url,
                'expires_in': '1 hour'
            }
        )
    
    @classmethod
    def send_course_enrolled_email(cls, user, course) -> bool:
        """Send course enrollment confirmation."""
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.COURSE_ENROLLED,
            context={
                'first_name': user.first_name or user.username,
                'course_name': course.title,
                'course_url': f"{cls.FRONTEND_URL}/courses/{course.id}",
                'instructor_name': course.instructor.username if course.instructor else 'Instructor',
                'lesson_count': course.lessons.count()
            }
        )
    
    @classmethod
    def send_course_completed_email(cls, user, course, certificate=None) -> bool:
        """Send course completion congratulations."""
        context = {
            'first_name': user.first_name or user.username,
            'course_name': course.title,
            'completion_date': timezone.now().strftime('%B %d, %Y')
        }
        
        if certificate:
            context['certificate_url'] = f"{cls.FRONTEND_URL}/certificates/{certificate.id}"
        
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.COURSE_COMPLETED,
            context=context
        )
    
    @classmethod
    def send_payment_success_email(cls, user, payment) -> bool:
        """Send payment confirmation."""
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.PAYMENT_SUCCESS,
            context={
                'first_name': user.first_name or user.username,
                'order_id': payment.order_id,
                'amount': f"₹{payment.amount}",
                'course_name': payment.course.title if payment.course else 'Subscription',
                'payment_date': payment.completed_at.strftime('%B %d, %Y'),
                'receipt_url': f"{cls.FRONTEND_URL}/payments/{payment.id}/receipt"
            }
        )
    
    @classmethod
    def send_streak_reminder_email(cls, user, streak_days: int) -> bool:
        """Send streak reminder to prevent break."""
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.STREAK_REMINDER,
            context={
                'first_name': user.first_name or user.username,
                'streak_days': streak_days,
                'learn_url': f"{cls.FRONTEND_URL}/learn"
            }
        )
    
    @classmethod
    def send_achievement_email(cls, user, achievement) -> bool:
        """Send achievement unlocked notification."""
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.ACHIEVEMENT_UNLOCKED,
            context={
                'first_name': user.first_name or user.username,
                'achievement_name': achievement.name,
                'achievement_description': achievement.description,
                'badge_url': achievement.badge_url if hasattr(achievement, 'badge_url') else None,
                'profile_url': f"{cls.FRONTEND_URL}/profile"
            }
        )
    
    @classmethod
    def send_session_reminder_email(cls, user, session) -> bool:
        """Send live session reminder."""
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.SESSION_REMINDER,
            context={
                'first_name': user.first_name or user.username,
                'session_title': session.title,
                'start_time': session.scheduled_start.strftime('%B %d, %Y at %I:%M %p'),
                'host_name': session.host.username,
                'join_url': f"{cls.FRONTEND_URL}/live/{session.id}"
            }
        )
    
    @classmethod
    def send_weekly_digest(cls, user, stats: Dict) -> bool:
        """Send weekly learning digest."""
        return cls.send_email(
            to_email=user.email,
            email_type=EmailType.WEEKLY_DIGEST,
            context={
                'first_name': user.first_name or user.username,
                'lessons_completed': stats.get('lessons_completed', 0),
                'minutes_learned': stats.get('minutes_learned', 0),
                'problems_solved': stats.get('problems_solved', 0),
                'current_streak': stats.get('streak', 0),
                'achievements_earned': stats.get('achievements', []),
                'recommended_courses': stats.get('recommendations', [])
            }
        )
    
    # ==========================================================================
    # BULK EMAIL
    # ==========================================================================
    
    @classmethod
    def send_bulk_email(
        cls,
        recipients: List[str],
        email_type: EmailType,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Send bulk emails (for marketing, announcements).
        """
        sent = 0
        failed = 0
        
        for email in recipients:
            if cls.send_email(email, email_type, context):
                sent += 1
            else:
                failed += 1
        
        return {
            'total': len(recipients),
            'sent': sent,
            'failed': failed
        }
