"""
Gamification Views - DRF API endpoints for XP, badges, streaks, and leaderboard.
Wires the existing GamificationService into REST endpoints that the Flutter
frontend expects at /api/v1/gamification/*.
"""
import logging
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status as drf_status
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from django.core.cache import cache

from .models import UserXP, Badge, UserBadge, Streak
from .services import GamificationService
from .serializers import (
    UserXPSerializer,
    BadgeSerializer,
    UserBadgeSerializer,
    StreakSerializer,
    LeaderboardEntrySerializer,
    AddXPSerializer,
    UnlockAchievementSerializer,
    GuildSerializer,
)

logger = logging.getLogger(__name__)


# =============================================================================
# XP ENDPOINTS
# =============================================================================

@extend_schema(
    tags=["Gamification"],
    description="Get current user's XP profile and stats.",
    responses={200: UserXPSerializer},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_xp(request):
    """Return the authenticated user's XP, level, and streak."""
    try:
        stats = GamificationService.get_user_stats(request.user)
        return Response({
            'status': 'success',
            'data': {
                'totalXP': stats.get('total_xp', 0),
                'weeklyXP': stats.get('weekly_xp', 0),
                'level': stats.get('level', 1),
                'streak': stats.get('current_streak', 0),
                'rank': stats.get('rank', 0),
            }
        })
    except Exception as e:
        logger.exception("Error fetching user XP")
        return Response(
            {'status': 'error', 'message': 'Internal server error'},
            status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    description="Award XP to the current user.",
    request=AddXPSerializer,
)
@extend_schema(tags=["Gamification"], responses={201: UserXPSerializer})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_xp(request):
    """Award XP to the authenticated user."""
    serializer = AddXPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'status': 'error', 'message': serializer.errors},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    amount = serializer.validated_data['amount']
    reason = serializer.validated_data.get('reason', 'Activity')

    try:
        user_xp = GamificationService.award_xp(request.user, amount, reason=reason)
        return Response({
            'status': 'success',
            'data': {
                'totalXP': user_xp.total_xp,
                'level': user_xp.level,
                'message': f'+{amount} XP for {reason}',
            }
        })
    except Exception as e:
        logger.exception("Error awarding XP")
        return Response(
            {'status': 'error', 'message': 'Internal server error'},
            status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# =============================================================================
# ACHIEVEMENT ENDPOINTS
# =============================================================================

@extend_schema(
    tags=["Gamification"],
    description="Get all badges/achievements and mark which ones the user has earned.",
    responses={200: BadgeSerializer(many=True)}, # Assuming AchievementSerializer is BadgeSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_achievements(request):
    """Return all badges with user's unlock status."""
    try:
        all_badges = Badge.objects.all()
        earned_ids = set(
            UserBadge.objects.filter(user=request.user)
            .values_list('badge_id', flat=True)
        )

        data = []
        for badge in all_badges:
            badge_data = BadgeSerializer(badge).data
            badge_data['isUnlocked'] = badge.id in earned_ids
            data.append(badge_data)

        return Response({'status': 'success', 'data': data})
    except Exception as e:
        logger.exception("Error fetching achievements")
        return Response(
            {'status': 'error', 'message': 'Internal server error'},
            status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    description="Unlock an achievement/badge for the current user.",
    request=UnlockAchievementSerializer,
)
@extend_schema(tags=["Gamification"], responses={200: BadgeSerializer}) # Assuming AchievementSerializer is BadgeSerializer
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unlock_achievement(request):
    """Unlock a badge for the authenticated user."""
    serializer = UnlockAchievementSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'status': 'error', 'message': serializer.errors},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    achievement_id = serializer.validated_data['achievementId']

    try:
        # Try to find badge by name or ID
        try:
            badge = Badge.objects.get(id=achievement_id)
        except (Badge.DoesNotExist, ValueError):
            badge = Badge.objects.filter(name=achievement_id).first()

        if not badge:
            return Response(
                {'status': 'error', 'message': 'Achievement not found'},
                status=drf_status.HTTP_404_NOT_FOUND,
            )

        GamificationService.award_badge(request.user, badge.name)
        return Response({
            'status': 'success',
            'message': f'Achievement "{badge.name}" unlocked!',
        })
    except Exception as e:
        logger.exception("Error unlocking achievement")
        return Response(
            {'status': 'error', 'message': 'Internal server error'},
            status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# =============================================================================
# LEADERBOARD ENDPOINTS
# =============================================================================

class LeaderboardView(APIView):
    """Return the XP leaderboard with optional period filter."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(30))  # 30s cache for leaderboard
    @extend_schema(
        tags=["Gamification"],
        description="Get the XP leaderboard. Supports period filter: 'all', 'weekly'.",
        responses={200: LeaderboardEntrySerializer(many=True)},
    )
    def get(self, request):
        period = request.query_params.get('period', 'all')
        limit = min(int(request.query_params.get('limit', 50)), 100)

        try:
            leaderboard = GamificationService.get_leaderboard(limit=limit, period=period)
        except Exception as e:
            logger.warning("Redis leaderboard failed, falling back to DB: %s", e)
            leaderboard = []

        # Fallback to DB if Redis returned nothing or failed
        if not leaderboard:
            try:
                from .models import UserXP
                order_field = '-weekly_xp' if period == 'weekly' else '-total_xp'
                qs = UserXP.objects.select_related('user', 'user__streak_profile').order_by(order_field)[:limit]
                leaderboard = []
                for idx, xp_entry in enumerate(qs, start=1):
                    streak_count = 0
                    try:
                        streak_count = xp_entry.user.streak_profile.current_streak
                    except Exception:
                        pass
                    leaderboard.append({
                        "rank": idx,
                        "id": str(xp_entry.user.id),
                        "username": xp_entry.user.username,
                        "xp": xp_entry.weekly_xp if period == 'weekly' else xp_entry.total_xp,
                        "level": xp_entry.level,
                        "streak": streak_count,
                    })
            except Exception as e:
                logger.exception("DB leaderboard fallback also failed")
                return Response(
                    {'status': 'error', 'message': 'Internal server error'},
                    status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response({
            'status': 'success',
            'data': leaderboard,
        })


# =============================================================================
# STREAK ENDPOINTS
# =============================================================================

@extend_schema(
    tags=["Gamification"],
    description="Get current user's streak information.",
    responses={200: StreakSerializer},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_streak(request):
    """Return user's streak data."""
    try:
        streak, _ = Streak.objects.get_or_create(user=request.user)
        return Response({
            'status': 'success',
            'data': StreakSerializer(streak).data,
        })
    except Exception as e:
        logger.exception("Error fetching streak")
        return Response(
            {'status': 'error', 'message': 'Internal server error'},
            status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(description="Check in for today's streak.")
@extend_schema(tags=["Gamification"], responses={200: StreakSerializer})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkin_streak(request):
    """Update streak for today's activity."""
    try:
        GamificationService.check_streaks(request.user)
        streak = Streak.objects.get(user=request.user)
        return Response({
            'status': 'success',
            'data': {
                'currentStreak': streak.current_streak,
                'longestStreak': streak.longest_streak,
            }
        })
    except Exception as e:
        logger.exception("Error checking in streak")
        return Response(
            {'status': 'error', 'message': 'Internal server error'},
            status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# =============================================================================
# COMBINED STATS ENDPOINT
# =============================================================================

@extend_schema(
    tags=["Gamification"],
    description="Get complete gamification dashboard stats for the current user.",
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_gamification_stats(request):
    """
    Combined endpoint returning full gamification profile:
    XP, level, streak, achievements, rank.
    Cached per-user for 60 seconds via service layer.
    """
    try:
        stats = GamificationService.get_user_stats(request.user)
        rank = GamificationService.get_user_rank(request.user)

        # Get earned badges
        earned_badges = UserBadge.objects.filter(user=request.user).select_related('badge').order_by('-earned_at')
        badge_data = UserBadgeSerializer(earned_badges, many=True).data

        return Response({
            'status': 'success',
            'data': {
                'xp': {
                    'total': stats.get('total_xp', 0),
                    'weekly': stats.get('weekly_xp', 0),
                    'level': stats.get('level', 1),
                },
                'streak': {
                    'current': stats.get('current_streak', 0),
                    'longest': stats.get('longest_streak', 0),
                },
                'rank': rank,
                'badges': badge_data,
                'badgeCount': len(badge_data),
                'totalBadges': cache.get_or_set('total_badge_count', Badge.objects.count, 86400),
            }
        })
    except Exception as e:
        logger.exception("Error fetching gamification stats")
        return Response(
            {'status': 'error', 'message': 'Internal server error'},
            status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
