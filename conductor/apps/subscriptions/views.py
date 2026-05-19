"""Subscription API views."""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import SubscriptionPlan, UserSubscription, UsageTracking, PaymentTransaction, Coupon
from .serializers import (
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
    UsageTrackingSerializer,
    UsageSummarySerializer,
    PaymentTransactionSerializer,
    CouponSerializer,
    CreateSubscriptionSerializer,
    CancelSubscriptionSerializer,
)
from .services import SubscriptionManager


@extend_schema(tags=['Subscriptions - Plans'])
class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Subscription plans.
    GET /api/v1/subscriptions/plans/ - List all plans
    GET /api/v1/subscriptions/plans/{id}/ - Plan detail
    """
    queryset = SubscriptionPlan.objects.filter(is_active=True).order_by('display_order')
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [AllowAny]
    lookup_field = 'pk'


@extend_schema(tags=['Subscriptions - User'])
class SubscriptionViewSet(viewsets.ViewSet):
    """
    User subscription management.
    GET /api/v1/subscriptions/my-subscription/ - Current subscription
    POST /api/v1/subscriptions/create/ - Create/upgrade subscription
    POST /api/v1/subscriptions/cancel/ - Cancel subscription
    POST /api/v1/subscriptions/trial/ - Start free trial
    GET /api/v1/subscriptions/usage/ - Current usage summary
    GET /api/v1/subscriptions/history/ - Subscription history
    GET /api/v1/subscriptions/transactions/ - Payment history
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(description='Get current active subscription')
    @action(detail=False, methods=['get'], url_path='my-subscription')
    def my_subscription(self, request):
        """Get user's current active subscription."""
        subscription = SubscriptionManager.get_user_subscription(request.user)
        if subscription:
            return Response({
                'status': 'success',
                'data': UserSubscriptionSerializer(subscription).data,
            })

        # Return free plan info
        plan = SubscriptionManager.get_user_plan(request.user)
        return Response({
            'status': 'success',
            'data': {
                'plan': SubscriptionPlanSerializer(plan).data,
                'is_free': True,
            },
        })

    @extend_schema(
        description='Create or upgrade subscription',
        request=CreateSubscriptionSerializer,
        responses={201: UserSubscriptionSerializer},
    )
    @action(detail=False, methods=['post'], url_path='create')
    def create_subscription(self, request):
        """Create or upgrade a subscription."""
        serializer = CreateSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            subscription = SubscriptionManager.create_subscription(
                user=request.user,
                plan_code=serializer.validated_data['plan_code'],
                billing_cycle=serializer.validated_data['billing_cycle'],
                coupon_code=serializer.validated_data.get('coupon_code'),
            )
            return Response({
                'status': 'success',
                'data': UserSubscriptionSerializer(subscription).data,
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        description='Cancel subscription',
        request=CancelSubscriptionSerializer,
    )
    @action(detail=False, methods=['post'], url_path='cancel')
    def cancel_subscription(self, request):
        """Cancel user's subscription."""
        serializer = CancelSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            subscription = SubscriptionManager.cancel_subscription(
                user=request.user,
                cancel_at_period_end=serializer.validated_data['cancel_at_period_end'],
            )
            return Response({
                'status': 'success',
                'data': UserSubscriptionSerializer(subscription).data,
            })
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description='Start free trial')
    @action(detail=False, methods=['post'], url_path='trial')
    def start_trial(self, request):
        """Start a free trial."""
        plan_code = request.data.get('plan_code', 'pro')
        trial_days = int(request.data.get('trial_days', 7))

        try:
            subscription = SubscriptionManager.start_trial(
                user=request.user,
                plan_code=plan_code,
                trial_days=trial_days,
            )
            return Response({
                'status': 'success',
                'data': UserSubscriptionSerializer(subscription).data,
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({
                'status': 'error',
                'message': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(description='Get current usage vs limits')
    @action(detail=False, methods=['get'], url_path='usage')
    def usage(self, request):
        """Get current usage summary."""
        summary = SubscriptionManager.get_usage_summary(request.user)
        return Response({
            'status': 'success',
            'data': summary,
        })

    @extend_schema(description='Get subscription history')
    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """Get user's subscription history."""
        subscriptions = UserSubscription.objects.filter(
            user=request.user
        ).select_related('plan').order_by('-started_at')

        serializer = UserSubscriptionSerializer(subscriptions, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
        })

    @extend_schema(description='Get payment transaction history')
    @action(detail=False, methods=['get'], url_path='transactions')
    def transactions(self, request):
        """Get user's payment history."""
        transactions = PaymentTransaction.objects.filter(
            user=request.user
        ).order_by('-created_at')

        serializer = PaymentTransactionSerializer(transactions, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
        })


@extend_schema(tags=['Subscriptions - Coupons'])
class CouponViewSet(viewsets.ViewSet):
    """
    Coupon validation.
    POST /api/v1/subscriptions/coupons/validate/ - Validate a coupon
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(description='Validate a coupon code')
    @action(detail=False, methods=['post'], url_path='validate')
    def validate(self, request):
        """Validate a coupon code."""
        code = request.data.get('code')
        if not code:
            return Response({
                'status': 'error',
                'message': 'Coupon code is required',
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.get(code=code, is_active=True)
            if not coupon.is_valid:
                return Response({
                    'status': 'error',
                    'message': 'Coupon is no longer valid',
                }, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'status': 'success',
                'data': CouponSerializer(coupon).data,
            })
        except Coupon.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Invalid coupon code',
            }, status=status.HTTP_404_NOT_FOUND)
