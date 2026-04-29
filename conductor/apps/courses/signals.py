import logging
from django.db.models.signals import post_save, post_delete
from django.db.models import F
from django.dispatch import receiver
from .models import Course, Enrollment

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Course)
def auto_transcode_video(sender, instance, created, **kwargs):
    """
    Automatically trigger HLS transcoding when a video is uploaded.
    """
    if instance.preview_video and not instance.hls_playlist:
        try:
            from .tasks import generate_course_hls_task
            generate_course_hls_task.delay(instance.id)
        except Exception as e:
            logger.error("Auto-transcode signal failed for course %s: %s", instance.id, e)


@receiver(post_save, sender=Enrollment)
def increment_enrollment_count(sender, instance, created, **kwargs):
    if created:
        try:
            Course.objects.filter(id=instance.course_id).update(enrollment_count=F('enrollment_count') + 1)
        except Exception as e:
            logger.error("Enrollment count increment failed for course %s: %s", instance.course_id, e)


@receiver(post_delete, sender=Enrollment)
def decrement_enrollment_count(sender, instance, **kwargs):
    try:
        Course.objects.filter(id=instance.course_id).update(enrollment_count=F('enrollment_count') - 1)
    except Exception as e:
        logger.error("Enrollment count decrement failed for course %s: %s", instance.course_id, e)
