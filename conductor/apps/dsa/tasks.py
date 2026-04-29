from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Submission
from .services import SandboxService


def send_update(user_id, status, submission_id=None):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{user_id}_submissions',
        {
            'type': 'submission_update',
            'message': {
                'status': status,
                'submission_id': submission_id
            }
        }
    )


@shared_task(bind=True, time_limit=10, soft_time_limit=8, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 2})
def evaluate_submission_task(self, submission_id):
    """
    Asynchronous task to evaluate a submission and generate AI feedback.
    Retries up to 2 times with exponential backoff on transient failures.
    """
    try:
        submission = Submission.objects.get(id=submission_id)
        user_id = submission.user.id

        send_update(user_id, 'PROCESSING', submission_id)

        SandboxService.evaluate(submission)

        # Refetch to get updated status and runtime
        submission.refresh_from_db()

        if submission.status == 'AC':
            # Award XP based on problem difficulty points
            from apps.gamification.services import GamificationService
            points = submission.problem.points or 10
            GamificationService.award_xp(
                submission.user, points,
                f"Solved: {submission.problem.title}"
            )

        send_update(user_id, submission.status, submission_id)

        return f"Submission {submission_id} evaluated with status {submission.status}"
    except Submission.DoesNotExist:
        return f"Submission {submission_id} not found"
    except Exception as e:
        return f"Error evaluating submission {submission_id}: {str(e)}"
