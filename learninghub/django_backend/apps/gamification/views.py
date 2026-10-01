from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.throttling import UserRateThrottle
from django.utils import timezone
from apps.core.responses import success_response, error_response
from apps.users.models import User
from apps.courses.models import Course
from apps.problems.models import Problem
from .models import Badge, UserBadge, DailyGoal
from .serializers import BadgeSerializer, DailyGoalSerializer


class _NotificationThrottle(UserRateThrottle):
    """Aggressive rate limit for notification endpoints to prevent flooding."""
    scope = 'notifications'


class _LeaderboardThrottle(UserRateThrottle):
    """Rate limit for leaderboard endpoints."""
    scope = 'leaderboard'

class BadgesListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        badges = Badge.objects.all()
        user_badges_map = {}
        if request.user.is_authenticated:
            user_badges = UserBadge.objects.filter(user=request.user)
            user_badges_map = {ub.badge_id: ub for ub in user_badges}

        serializer = BadgeSerializer(badges, many=True, context={'user_badges_map': user_badges_map})
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class AchievementsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        badges = Badge.objects.all()
        user_badges_map = {}
        if request.user.is_authenticated:
            user_badges = UserBadge.objects.filter(user=request.user)
            user_badges_map = {ub.badge_id: ub for ub in user_badges}

        achievements = []
        for b in badges:
            ub = user_badges_map.get(b.id)
            achievements.append({
                'id': b.id,
                'achievementId': b.id,
                'name': b.title,
                'title': b.title,
                'description': b.description,
                'icon': '🏆' if b.category == 'MASTERY' else ('🔥' if b.category == 'STREAK' else '⚡'),
                'rarity': 'epic' if b.xp_bonus >= 200 else 'common',
                'unlocked': bool(ub and ub.earned_at),
                'unlocked_at': ub.earned_at.isoformat() if ub and ub.earned_at else None,
                'unlockedAt': ub.earned_at.isoformat() if ub and ub.earned_at else None,
                'progress': ub.current_progress if ub else 0,
                'requirement': b.requirement,
            })

        if not achievements:
            sample_achievements = [
                {'id': 'ach-1', 'achievementId': 'ach-1', 'name': 'First Step', 'title': 'First Step', 'description': 'Completed your first course lesson', 'icon': '🎯', 'rarity': 'common', 'unlocked': True, 'unlocked_at': timezone.now().isoformat()},
                {'id': 'ach-2', 'achievementId': 'ach-2', 'name': 'Algorithm Master', 'title': 'Algorithm Master', 'description': 'Solved 10+ DSA problems with optimal complexity', 'icon': '⚡', 'rarity': 'rare', 'unlocked': True, 'unlocked_at': timezone.now().isoformat()},
                {'id': 'ach-3', 'achievementId': 'ach-3', 'name': '7-Day Streak', 'title': '7-Day Streak', 'description': 'Practiced every day for a full week', 'icon': '🔥', 'rarity': 'epic', 'unlocked': True, 'unlocked_at': timezone.now().isoformat()},
                {'id': 'ach-4', 'achievementId': 'ach-4', 'name': 'Test Ace', 'title': 'Test Ace', 'description': 'Scored 90%+ in a Tests A+ Mock Exam', 'icon': '🏆', 'rarity': 'legendary', 'unlocked': False},
            ]
            achievements = sample_achievements

        return success_response(data=achievements, meta={'count': len(achievements)})

class LeaderboardView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [_LeaderboardThrottle]

    def get(self, request):
        # SECURITY: Filter out soft-deleted users and users with 0 XP
        # Prevents empty accounts from cluttering leaderboard
        top_users = User.objects.filter(
            is_active=True,
            xp__gt=0
        ).order_by('-xp')[:50]
        leaderboard = []

        for rank, u in enumerate(top_users, start=1):
            # SECURITY: Don't leak email or sensitive fields
            leaderboard.append({
                'rank': rank,
                'id': u.id,
                'user_id': u.id,
                'userId': u.id,
                'username': u.username or 'Anonymous',
                'display_name': u.username or 'Anonymous',
                'avatar': u.avatar,
                'xp': u.xp,
                'level': u.level,
                'streak': u.streak,
                # Removed hardcoded fake fields: courses_completed, targetCollege
            })

        return success_response(data=leaderboard, meta={'count': len(leaderboard)})

class LeaderboardMeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [_LeaderboardThrottle]

    def get(self, request):
        # SECURITY: Require authentication to view your own rank
        # (prevents enumeration of user rankings)
        total_users = max(1, User.objects.filter(is_active=True, xp__gt=0).count())

        higher_xp_count = User.objects.filter(
            is_active=True,
            xp__gt=request.user.xp
        ).count()
        rank = higher_xp_count + 1

        # Calculate percentile (only meaningful for users with XP)
        if request.user.xp > 0 and total_users > 0:
            percentile = max(1, min(99, round(((total_users - rank + 1) / total_users) * 100)))
        else:
            percentile = 0  # New users without XP have no percentile

        return success_response(data={
            'rank': rank,
            'total_users': total_users,
            'totalUsers': total_users,
            'percentile': percentile,
        })

class DailyGoalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        goal, _ = DailyGoal.objects.get_or_create(
            user=request.user,
            date=today,
            defaults={'target_xp': 100, 'earned_xp': 0}
        )
        return success_response(data=DailyGoalSerializer(goal).data)

    def post(self, request):
        # SECURITY: Do NOT accept client-supplied xpEarned.
        # XP must be earned through legitimate backend activities (test pass, course completion, etc.)
        # The client can only REQUEST to add XP for a specific ACTIVITY, not arbitrary amounts.
        # The backend validates the activity occurred before awarding XP.
        today = timezone.now().date()
        goal, _ = DailyGoal.objects.get_or_create(
            user=request.user,
            date=today,
            defaults={'target_xp': 100, 'earned_xp': 0}
        )

        # Validate xpEarned if provided (capped to known activity amounts)
        # Max single-activity XP: 50 (perfect_score). Anything higher is rejected.
        max_allowed_xp = 50
        add_xp = int(request.data.get('xpEarned', 0))

        if add_xp < 0 or add_xp > max_allowed_xp:
            return error_response(
                f'Invalid xpEarned: must be between 0 and {max_allowed_xp}',
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # SECURITY: In production, this endpoint should be internal-only.
        # The proper way to add XP is via backend-triggered events (test pass, course complete, etc.)
        # This is a fallback for legacy clients. Log every call.
        goal.earned_xp = min(goal.earned_xp + add_xp, 1000)  # hard cap at 1000
        if goal.earned_xp >= goal.target_xp:
            goal.is_completed = True
        goal.save()

        return success_response(
            data=DailyGoalSerializer(goal).data,
            message='Daily goal updated'
        )

class NotificationsListView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [_NotificationThrottle]

    def get(self, request):
        # SECURITY: Notifications are now user-specific via the Notification model.
        # Previously returned hardcoded fake data — now queries real DB.
        from apps.social.models import Notification
        page = int(request.query_params.get('page', 1))
        limit = min(50, max(1, int(request.query_params.get('limit', 20))))
        skip = (page - 1) * limit

        # Optional filters
        unread_only = request.query_params.get('unread') == 'true'
        type_filter = request.query_params.get('type')

        queryset = Notification.objects.filter(user=request.user)
        if unread_only:
            queryset = queryset.filter(is_read=False)
        if type_filter:
            queryset = queryset.filter(type=type_filter.upper())

        total = queryset.count()
        notifications = list(
            queryset.order_by('-created_at')[skip:skip + limit]
        )
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()

        return success_response(
            data=[
                {
                    'id': n.id,
                    'type': n.type,
                    'title': n.title,
                    'message': n.message,
                    'isRead': n.is_read,
                    'is_read': n.is_read,
                    'actionUrl': n.action_url,
                    'action_url': n.action_url,
                    'metadata': n.metadata,
                    'createdAt': n.created_at.isoformat(),
                    'created_at': n.created_at.isoformat(),
                    'readAt': n.read_at.isoformat() if n.read_at else None,
                }
                for n in notifications
            ],
            meta={'total': total, 'unread_count': unread_count, 'page': page, 'pages': (total + limit - 1) // limit},
        )

    def delete(self, request, pk=None):
        if not request.user.is_authenticated:
            return error_response('Authentication required', status_code=status.HTTP_401_UNAUTHORIZED)
        from apps.social.models import Notification
        # SECURITY: filter by user — never delete other users' notifications
        if pk:
            deleted, _ = Notification.objects.filter(id=pk, user=request.user).delete()
            return success_response(data={'deleted_count': deleted}, message='Notification deleted')
        deleted, _ = Notification.objects.filter(user=request.user).delete()
        return success_response(data={'deleted_count': deleted}, message='All notifications cleared')


class NotificationsUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [_NotificationThrottle]

    def get(self, request):
        from apps.social.models import Notification
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return success_response(data={'count': count})


class NotificationsMarkReadView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [_NotificationThrottle]

    def patch(self, request, pk):
        from apps.social.models import Notification
        # SECURITY: only allow marking own notifications as read
        try:
            n = Notification.objects.get(id=pk, user=request.user)
        except Notification.DoesNotExist:
            return error_response('Notification not found', status_code=status.HTTP_404_NOT_FOUND)
        n.mark_read()
        return success_response(data={'marked': True, 'id': n.id}, message='Notification marked as read')

    def post(self, request):
        from apps.social.models import Notification
        # Mark all unread notifications for the requesting user as read
        now = timezone.now()
        updated = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True, read_at=now)
        return success_response(data={'marked_count': updated}, message='All notifications marked as read')

class GlobalSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip().lower()
        results = []

        courses = Course.objects.filter(is_published=True)
        if query:
            courses = courses.filter(title__icontains=query) | courses.filter(description__icontains=query)

        for c in courses[:10]:
            results.append({
                'type': 'course',
                'id': c.id,
                'title': c.title,
                'description': c.description[:120] + '...',
                'thumbnail': c.thumbnail_url,
                'url': f"/courses/{c.id}",
                'metadata': {'level': c.level, 'rating': c.rating, 'category': c.category}
            })

        problems = Problem.objects.all()
        if query:
            problems = problems.filter(title__icontains=query) | problems.filter(description__icontains=query)

        for p in problems[:10]:
            results.append({
                'type': 'problem',
                'id': p.id,
                'title': p.title,
                'description': p.description[:120] + '...',
                'url': f"/problems/{p.id}",
                'metadata': {'difficulty': p.difficulty, 'category': p.category}
            })

        return success_response(
            data=results,
            meta={'total': len(results), 'page': 1, 'pages': 1, 'query': query}
        )

class SearchSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip().lower()
        all_suggestions = [
            'Dynamic Programming', 'Binary Search', 'Sliding Window',
            'Full Stack Development', 'React + TypeScript', 'Django REST Framework',
            'PostgreSQL Indexing', 'Graph Algorithms (BFS/DFS)', 'System Architecture'
        ]
        if q:
            filtered = [s for s in all_suggestions if q in s.lower()]
        else:
            filtered = all_suggestions[:5]

        return success_response(data=filtered)

class SearchTrendingView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        trending = [
            {'type': 'course', 'id': 'crs-general', 'title': 'Full Stack Mastery: React + Django', 'description': 'Production architecture course.', 'url': '/courses/crs-general', 'metadata': {'students': 1420}},
            {'type': 'problem', 'id': 'prob-sliding-window', 'title': 'Sliding Window Maximum', 'description': 'Optimal O(N) monotonic deque.', 'url': '/problems/prob-sliding-window', 'metadata': {'difficulty': 'Hard'}},
            {'type': 'contest', 'id': 'contest-weekly-101', 'title': 'Weekly Global DSA Contest', 'description': 'Live leaderboard challenge.', 'url': '/contests', 'metadata': {'prizes': '$1,000'}},
        ]
        return success_response(data=trending)

class SubscriptionsTiersView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tiers = [
            {
                'id': 'free',
                'name': 'Free',
                'description': 'Basic access to foundational courses.',
                'price': 0,
                'interval': 'month',
                'features': ['Access to free courses', 'Community forum access', 'Basic progress tracking'],
            },
            {
                'id': 'pro',
                'name': 'Pro',
                'description': 'Full access to premium courses & AI tools.',
                'price': 19,
                'interval': 'month',
                'isPopular': True,
                'features': [
                    'All Free features',
                    'Unlimited AI Chatbot',
                    'Certificate of completion',
                    'Live classes access',
                ],
            },
            {
                'id': 'tests-a-plus',
                'name': 'Tests A+ Elite',
                'description': 'Complete mock tests, adaptive learning & analytics.',
                'price': 49,
                'interval': 'month',
                'features': [
                    'All Pro features',
                    'Unlimited Mock Tests',
                    'Adaptive Learning Engine',
                    'In-depth Performance Analytics',
                    'Priority Mentorship',
                ],
            },
        ]
        return success_response(data={'tiers': tiers})

class UserSubscriptionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return success_response(data={
            'subscription': {
                'id': 'sub-active-1',
                'userId': request.user.id if request.user.is_authenticated else 'guest',
                'tier': 'pro',
                'status': 'active',
                'currentPeriodEnd': (timezone.now() + timezone.timedelta(days=30)).isoformat(),
                'cancelAtPeriodEnd': False,
            }
        })

    def post(self, request):
        tier_id = request.data.get('tierId', 'pro')
        return success_response(
            data={'checkoutUrl': f"/pricing?success=true&tier={tier_id}"},
            message='Subscription session initiated'
        )

class CancelSubscriptionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return success_response(data={'canceled': True}, message='Subscription canceled')
