"""
Seed command: Populate subscription plans and sample coupons.
Usage: python manage.py seed_subscriptions
"""
from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.subscriptions.models import SubscriptionPlan, Coupon


class Command(BaseCommand):
    help = 'Seed subscription plans and sample coupons'

    def handle(self, *args, **options):
        self.stdout.write('Seeding subscription plans...')
        self._seed_plans()
        self._seed_coupons()
        self.stdout.write(self.style.SUCCESS('Subscription plans seeded successfully!'))

    def _seed_plans(self):
        plans = [
            {
                'code': 'free',
                'name': 'Free',
                'description': 'Get started with basic practice tests.',
                'price_monthly': 0,
                'price_yearly': 0,
                'daily_test_limit': 3,
                'monthly_ai_generations': 2,
                'max_analytics_depth': 1,
                'max_bookmarks': 20,
                'max_notes': 50,
                'features': {
                    'instant_feedback': False,
                    'detailed_explanations': True,
                    'basic_analytics': True,
                    'ai_test_generation': True,
                    'performance_trends': False,
                    'weak_area_analysis': False,
                    'priority_support': False,
                    'offline_access': False,
                    'certificate': False,
                },
                'display_order': 0,
                'is_active': True,
            },
            {
                'code': 'pro',
                'name': 'Pro',
                'description': 'Unlimited practice tests with AI-powered insights.',
                'price_monthly': Decimal('9.99'),
                'price_yearly': Decimal('99.99'),
                'daily_test_limit': 20,
                'monthly_ai_generations': 50,
                'max_analytics_depth': 2,
                'max_bookmarks': 200,
                'max_notes': 500,
                'features': {
                    'instant_feedback': True,
                    'detailed_explanations': True,
                    'basic_analytics': True,
                    'ai_test_generation': True,
                    'performance_trends': True,
                    'weak_area_analysis': True,
                    'priority_support': False,
                    'offline_access': True,
                    'certificate': True,
                },
                'display_order': 1,
                'is_active': True,
                'is_featured': True,
                'badge_text': 'Most Popular',
            },
            {
                'code': 'enterprise',
                'name': 'Enterprise',
                'description': 'For institutions and organizations. Unlimited everything.',
                'price_monthly': Decimal('49.99'),
                'price_yearly': Decimal('499.99'),
                'daily_test_limit': 0,  # 0 = unlimited
                'monthly_ai_generations': 0,  # 0 = unlimited
                'max_analytics_depth': 3,
                'max_bookmarks': 0,  # 0 = unlimited
                'max_notes': 0,  # 0 = unlimited
                'features': {
                    'instant_feedback': True,
                    'detailed_explanations': True,
                    'basic_analytics': True,
                    'ai_test_generation': True,
                    'performance_trends': True,
                    'weak_area_analysis': True,
                    'priority_support': True,
                    'offline_access': True,
                    'certificate': True,
                    'custom_branding': True,
                    'admin_dashboard': True,
                    'api_access': True,
                    'sso': True,
                },
                'display_order': 2,
                'is_active': True,
            },
        ]

        for plan_data in plans:
            plan, created = SubscriptionPlan.objects.get_or_create(
                code=plan_data['code'],
                defaults=plan_data,
            )
            if created:
                self.stdout.write(f"  Created plan: {plan.name} (${plan.price_monthly}/mo)")
            else:
                self.stdout.write(f"  Plan exists: {plan.name}")

    def _seed_coupons(self):
        now = timezone.now()
        coupons = [
            {
                'code': 'WELCOME20',
                'description': '20% off your first Pro subscription',
                'discount_type': 'percentage',
                'discount_value': Decimal('20'),
                'max_uses': 1000,
                'uses_per_user': 1,
                'valid_from': now,
                'valid_until': now + timedelta(days=90),
                'is_active': True,
            },
            {
                'code': 'STUDENT50',
                'description': '50% off Pro for students',
                'discount_type': 'percentage',
                'discount_value': Decimal('50'),
                'max_discount': Decimal('25'),
                'max_uses': 500,
                'uses_per_user': 1,
                'valid_from': now,
                'valid_until': now + timedelta(days=180),
                'is_active': True,
            },
            {
                'code': 'ANNUAL15',
                'description': 'Extra 15% off annual plans',
                'discount_type': 'percentage',
                'discount_value': Decimal('15'),
                'max_uses': None,  # Unlimited
                'uses_per_user': 1,
                'valid_from': now,
                'valid_until': now + timedelta(days=365),
                'is_active': True,
            },
        ]

        for coupon_data in coupons:
            coupon, created = Coupon.objects.get_or_create(
                code=coupon_data['code'],
                defaults=coupon_data,
            )
            if created:
                self.stdout.write(f"  Created coupon: {coupon.code} ({coupon.discount_value}%)")
            else:
                self.stdout.write(f"  Coupon exists: {coupon.code}")
