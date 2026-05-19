"""
Usage enforcement middleware.
Checks subscription limits before allowing test attempts, AI generation, etc.
"""
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.urls import resolve

logger = logging.getLogger(__name__)

# Map URL patterns to usage limit fields
USAGE_LIMIT_MAP = {
    'test-start': 'daily_test_limit',
    'test-generate': 'monthly_ai_generations',
}


class UsageEnforcementMiddleware(MiddlewareMixin):
    """
    Enforces subscription usage limits on specific endpoints.
    Returns 429 Too Many Requests when limits are exceeded.
    """

    def process_request(self, request):
        # Skip for unauthenticated users (handled by permission classes)
        if not request.user or not request.user.is_authenticated:
            return None

        # Skip for admin/superadmin
        if hasattr(request.user, 'role') and request.user.role in ('admin', 'superadmin'):
            return None

        # Resolve the URL to check if it's a limited endpoint
        try:
            match = resolve(request.path_info)
            url_name = match.url_name
            namespace = match.namespace if hasattr(match, 'namespace') else ''
        except Exception:
            return None

        # Check if this endpoint has a usage limit
        limit_field = USAGE_LIMIT_MAP.get(url_name)
        if not limit_field:
            return None

        # Check usage limit
        from apps.subscriptions.services import SubscriptionManager
        has_limit, current, limit = SubscriptionManager.check_usage_limit(request.user, limit_field)

        if not has_limit:
            logger.warning(
                f"User {request.user.email} exceeded {limit_field} "
                f"({current}/{limit}) on {request.path_info}"
            )
            return JsonResponse({
                'status': 'error',
                'message': f'Usage limit reached. Upgrade your plan to continue.',
                'limit': limit,
                'current': current,
                'upgrade_url': '/subscriptions/plans/',
            }, status=429)

        return None
