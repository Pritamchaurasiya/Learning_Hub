"""Subscription Celery tasks."""
import logging
from celery import shared_task
from django.utils import timezone

from .models import UserSubscription
from .services import SubscriptionManager

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_subscriptions():
    """
    Mark expired subscriptions and trials as expired.
    Runs every hour via Celery Beat.
    """
    result = SubscriptionManager.cleanup_expired_subscriptions()
    return result


@shared_task
def send_expiry_reminders():
    """
    Send email reminders to users whose subscriptions expire in 7 days.
    Runs daily via Celery Beat.
    """
    from django.conf import settings
    from django.core.mail import send_mail

    now = timezone.now()
    seven_days = now + timezone.timedelta(days=7)

    expiring = UserSubscription.objects.filter(
        status='active',
        current_period_end__lte=seven_days,
        current_period_end__gt=now,
        auto_renew=False,
    ).select_related('user', 'plan')

    sent = 0
    for sub in expiring:
        try:
            send_mail(
                subject=f'Your {sub.plan.name} subscription expires in {sub.days_remaining} days',
                message=f'Your {sub.plan.name} subscription will expire on {sub.current_period_end.strftime("%B %d, %Y")}. Renew now to continue enjoying premium features.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[sub.user.email],
                fail_silently=True,
            )
            sent += 1
        except Exception as e:
            logger.error(f"Failed to send expiry reminder to {sub.user.email}: {e}")

    logger.info(f"Sent {sent} subscription expiry reminders")
    return {'sent': sent}


@shared_task
def convert_expired_trials():
    """
    Convert expired trials to free plan (or prompt for payment).
    Runs daily via Celery Beat.
    """
    from django.conf import settings
    from django.core.mail import send_mail
    from .models import SubscriptionPlan

    now = timezone.now()
    expired_trials = UserSubscription.objects.filter(
        status='trial',
        trial_ends_at__lt=now,
    ).select_related('user', 'plan')

    converted = 0
    free_plan = SubscriptionPlan.objects.filter(price=0).first()

    for sub in expired_trials:
        sub.status = 'expired'
        if free_plan:
            sub.plan = free_plan
            sub.save(update_fields=['status', 'plan'])
        else:
            sub.save(update_fields=['status'])
        converted += 1

        try:
            send_mail(
                subject='Your LearningHub Trial has expired',
                message='Your trial period has ended. You have been downgraded to the free tier. Subscribe now to regain access to premium features.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[sub.user.email],
                fail_silently=True,
            )
        except Exception as e:
            logger.error(f"Failed to send trial expiration email to {sub.user.email}: {e}")

    logger.info(f"Converted {converted} expired trials")
    return {'converted': converted}
