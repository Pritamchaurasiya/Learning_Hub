"""Gamification views."""

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import UserXP
from .serializers import (
    UserXPSerializer,
    UserBadgeSerializer,
    StreakSerializer,
    GamificationStatsResponseSerializer,
    LeaderboardEntrySerializer,
)
from .services import GamificationService


@extend_schema_view(
    get=extend_schema(responses={200: GamificationStatsResponseSerializer})
)
class GamificationStatsView(generics.GenericAPIView):
    """Get user's gamification stats."""

    permission_classes = [IsAuthenticated]
    serializer_class = GamificationStatsResponseSerializer

    def get(self, request):
        stats = GamificationService.get_user_stats(request.user)

        return Response(
            {
                "status": "success",
                "data": {
                    "xp": UserXPSerializer(stats["xp"]).data,
                    "streak": StreakSerializer(stats["streak"]).data,
                    "badges": UserBadgeSerializer(stats["badges"], many=True).data,
                },
            }
        )


@extend_schema_view(
    get=extend_schema(responses={200: LeaderboardEntrySerializer(many=True)})
)
@method_decorator(cache_page(60 * 15), name="get")
class LeaderboardView(generics.GenericAPIView):
    """Get XP leaderboard."""

    permission_classes = [IsAuthenticated]
    serializer_class = LeaderboardEntrySerializer
    queryset = UserXP.objects.none()

    def get(self, request):
        data = GamificationService.get_leaderboard()
        return Response({"status": "success", "data": data})
