
from celery import shared_task
from .models import Course
from .video_service import VideoTranscodingService
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, queue="default", soft_time_limit=300, time_limit=360, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 2})
def generate_course_hls_task(self, course_id):
    """
    Async task to transcode course video to HLS.
    Time-limited to 5 minutes (soft) / 6 minutes (hard) to prevent worker starvation.
    """
    try:
        course = Course.objects.get(id=course_id)
        if course.preview_video:
            logger.info("Starting HLS conversion for Course %s", course_id)
            VideoTranscodingService.process_course_video(course)
            logger.info("Finished HLS conversion for Course %s", course_id)
    except Course.DoesNotExist:
        logger.error("Course %s not found during transcoding task", course_id)
    except Exception as e:
        logger.error("Error in HLS task for Course %s: %s", course_id, e)
        raise  # Let autoretry handle transient failures

@shared_task(bind=True, queue="default", autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def generate_certificate_task(self, user_id, course_id):
    """
    Async task to generate course completion certificate.
    """
    from .certificate_service import CertificateService, CertificateType
    from apps.users.models import User
    
    try:
        user = User.objects.get(id=user_id)
        CertificateService.check_and_generate_course_certificate(user, course_id)
        logger.info("Certificate check completed for User %s, Course %s", user_id, course_id)
    except User.DoesNotExist:
        logger.error("User %s not found during certificate task", user_id)
    except Exception as e:
        logger.exception("Error in certificate task for User %s, Course %s: %s", user_id, course_id, e)

@shared_task(bind=True, queue="default", autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def generate_course_embedding_task(self, course_id):
    """
    Async task to generate semantic embedding for a course.
    """
    try:
        from apps.core.vector_service import VectorService
        course = Course.objects.get(id=course_id)
        if course.description:
            text = f"{course.title}: {course.description}"
            embedding = VectorService.get_embedding(text)
            if embedding:
                course.embedding = embedding
                # Use update_fields to avoid race conditions with other updates
                course.save(update_fields=['embedding'])
                logger.info("Generated embedding for Course %s", course_id)
    except Course.DoesNotExist:
        logger.error("Course %s not found during embedding task", course_id)
    except Exception as e:
        logger.error("Error generating embedding for Course %s: %s", course_id, e)
