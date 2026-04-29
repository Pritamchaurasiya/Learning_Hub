import logging

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Submission
from apps.gamification.models import UserXP
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Submission)
def award_xp_on_accepted(sender, instance, created, **kwargs):
    """
    Award XP when a submission is successfully accepted.
    Only awards XP for the first successful submission of a specific problem.
    Fully guarded — signal failures never propagate to the request.
    """
    if instance.status == Submission.Status.ACCEPTED:
        user = instance.user
        problem = instance.problem

        # Check if the user has any OTHER accepted submissions for this problem
        already_solved = Submission.objects.filter(
            user=user,
            problem=problem,
            status=Submission.Status.ACCEPTED
        ).exclude(id=instance.id).exists()

        if not already_solved:
            try:
                # Award points defined in the Problem model
                user_xp, _ = UserXP.objects.get_or_create(user=user)
                user_xp.add_xp(problem.points)
            except Exception as e:
                logger.error("XP award failed for user %s problem %s: %s", user.id, problem.id, e)
                return  # Don't proceed to broadcast if XP failed

            # Broadcast to social feed (non-critical)
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    'social_updates',
                    {
                        'type': 'social_message',
                        'data': {
                            'type': 'xp_gain',
                            'username': user.username,
                            'problem_title': problem.title,
                            'xp': problem.points,
                            'level': user_xp.level
                        }
                    }
                )
            except Exception as e:
                logger.warning("Social broadcast failed for user %s: %s", user.id, e)

            # Invalidate Leaderboard Cache (non-critical)
            try:
                from apps.gamification.leaderboard_service import LeaderboardService
                LeaderboardService.update_score(user.id, user_xp.total_xp)
            except Exception as e:
                logger.warning("Leaderboard update after XP award failed: %s", e)

            logger.info(
                "Awarded %d XP to %s for problem %s",
                problem.points, user.username, problem.title
            )
