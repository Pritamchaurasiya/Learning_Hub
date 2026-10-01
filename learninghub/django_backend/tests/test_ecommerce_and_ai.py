import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.courses.models import Course
from apps.ecommerce.models import Coupon, Certificate
from apps.ai_tutor.models import SpacedRepetitionSchedule

@pytest.mark.django_db
class TestEcommerceAndAi:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='shopper@learninghub.app', password='Password123!', username='Shopper')
        self.client.force_authenticate(user=self.user)

    def test_cart_coupon_and_certificates(self):
        course = Course.objects.create(
            id='crs-cart-test',
            title='Cart Test Course',
            slug='cart-test-course',
            description='Test',
            price=100.00
        )
        Coupon.objects.create(code='SAVE20', discount_percent=20, is_active=True)

        # 1. Add to cart
        cart_url = reverse('cart-view')
        self.client.post(cart_url, {'course_id': course.id, 'quantity': 1}, format='json')

        # 2. Apply coupon
        coupon_url = reverse('apply-coupon')
        c_res = self.client.post(coupon_url, {'code': 'SAVE20'}, format='json')
        assert c_res.status_code == status.HTTP_200_OK
        assert c_res.data['data']['discount_amount'] == 20.0
        assert c_res.data['data']['new_total'] == 80.0

        # 3. Generate certificate
        cert_gen_url = reverse('generate-certificate')
        cert_res = self.client.post(cert_gen_url, {'course_id': course.id}, format='json')
        assert cert_res.status_code == status.HTTP_201_CREATED
        code = cert_res.data['data']['certificate']['certificate_code']

        # 4. Verify certificate
        verify_url = reverse('verify-certificate', kwargs={'code': code})
        v_res = self.client.get(verify_url)
        assert v_res.status_code == status.HTTP_200_OK
        assert v_res.data['data']['valid'] is True

    def test_ai_tutor_and_spaced_repetition(self):
        # 1. Query AI Tutor
        ai_url = reverse('ai-tutor-query')
        res = self.client.post(ai_url, {'prompt': 'Give me a hint for Dynamic Programming'}, format='json')
        assert res.status_code == status.HTTP_200_OK
        assert 'Socratic' in res.data['data']['reply'] or 'Guidance' in res.data['data']['reply']

        # 2. Spaced repetition review (SM-2)
        sr_url = reverse('ai-spaced-review')
        sr_res = self.client.post(sr_url, {'topic': 'Binary Trees', 'quality': 5}, format='json')
        assert sr_res.status_code == status.HTTP_200_OK
        assert SpacedRepetitionSchedule.objects.filter(user=self.user, topic='Binary Trees').exists()

        # 3. Study plan generation
        plan_url = reverse('study-planner-generate')
        plan_res = self.client.post(plan_url, {'targetExam': 'JEE Advanced', 'dailyHours': 5, 'weeks': 8}, format='json')
        assert plan_res.status_code == status.HTTP_200_OK
        assert len(plan_res.data['data']['weekly_breakdown']) >= 5

    def test_social_discussions_comments_and_mentors(self):
        # 1. Create Discussion
        disc_url = reverse('discussions-list')
        res = self.client.post(disc_url, {
            'title': 'Best way to learn Graph Algorithms?',
            'content': 'Looking for recommended resources and practice strategies.',
            'category': 'DSA',
            'tags': ['graphs', 'algorithms', 'dsa']
        }, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        disc_id = res.data['data']['id']

        # 2. Add Comment
        comment_url = reverse('discussion-comments', kwargs={'pk': disc_id})
        c_res = self.client.post(comment_url, {'content': 'Start with BFS/DFS and topological sort!'}, format='json')
        assert c_res.status_code == status.HTTP_201_CREATED

        # 3. Upvote Discussion
        upvote_url = reverse('discussion-upvote', kwargs={'pk': disc_id})
        u_res = self.client.post(upvote_url)
        assert u_res.status_code == status.HTTP_200_OK
        assert u_res.data['data']['upvotes'] == 1

        # 4. View Discussion Detail
        detail_url = reverse('discussion-detail', kwargs={'pk': disc_id})
        d_res = self.client.get(detail_url)
        assert d_res.status_code == status.HTTP_200_OK
        assert d_res.data['data']['title'] == 'Best way to learn Graph Algorithms?'
        assert len(d_res.data['data']['comments']) == 1

        # 5. List Mentors
        mentor_url = reverse('mentors-list')
        m_res = self.client.get(mentor_url)
        assert m_res.status_code == status.HTTP_200_OK

    def test_checkout_and_orders(self):
        course = Course.objects.create(
            id='crs-buy-1',
            title='Concurrency Masterclass',
            slug='concurrency-masterclass',
            description='Mastering asyncio and multiprocessing',
            price=150.00
        )
        # Add to cart
        self.client.post(reverse('cart-view'), {'course_id': course.id, 'quantity': 1}, format='json')

        # Checkout
        checkout_res = self.client.post(reverse('checkout'), {'payment_method': 'CREDIT_CARD'}, format='json')
        assert checkout_res.status_code == status.HTTP_201_CREATED
        assert 'order' in checkout_res.data['data']
        assert checkout_res.data['data']['order']['total_amount'] == '150.00'

        # List user orders
        orders_res = self.client.get(reverse('user-orders'))
        assert orders_res.status_code == status.HTTP_200_OK
        assert len(orders_res.data['data']['orders']) >= 1

    def test_admin_management_and_analytics(self):
        admin_user = User.objects.create_user(
            email='adminmaster@learninghub.app',
            password='Password123!',
            username='AdminMaster',
            role='SUPERADMIN'
        )
        self.client.force_authenticate(user=admin_user)

        # 1. Admin Users List & Role Filter
        users_res = self.client.get(reverse('admin-users-list'), {'role': 'STUDENT'})
        assert users_res.status_code == status.HTTP_200_OK
        assert 'users' in users_res.data['data']

        # 2. Admin Analytics Overview
        overview_res = self.client.get(reverse('admin-analytics-overview'))
        assert overview_res.status_code == status.HTTP_200_OK
        assert 'totalUsers' in overview_res.data['data']
        assert 'revenue' in overview_res.data['data']

        # 3. Admin User & Course Analytics
        user_an_res = self.client.get(reverse('admin-analytics-users'))
        assert user_an_res.status_code == status.HTTP_200_OK
        assert 'byRole' in user_an_res.data['data']
        assert 'growth' in user_an_res.data['data']

        course_an_res = self.client.get(reverse('admin-analytics-courses'))
        assert course_an_res.status_code == status.HTTP_200_OK
        assert 'byCategory' in course_an_res.data['data']

        # 4. Admin AI Course Generator
        ai_course_res = self.client.post(reverse('admin-ai-generate-course'), {
            'prompt': 'Distributed Consensus Raft & Paxos',
            'difficulty': 'ADVANCED',
            'modulesCount': 3
        }, format='json')
        assert ai_course_res.status_code == status.HTTP_201_CREATED
        assert 'courseId' in ai_course_res.data['data']

        # 5. Admin Course CRUD
        create_res = self.client.post(reverse('admin-courses-manage'), {
            'title': 'High Performance Rust',
            'description': 'Memory safe systems programming',
            'category': 'Systems',
            'level': 'Advanced',
            'price': 200.0
        }, format='json')
        assert create_res.status_code == status.HTTP_201_CREATED
        new_course_id = create_res.data['data']['id']

        # Update course
        update_res = self.client.put(reverse('admin-course-manage-detail', kwargs={'pk': new_course_id}), {
            'title': 'High Performance Rust 2026',
            'isPublished': False
        }, format='json')
        assert update_res.status_code == status.HTTP_200_OK
        assert update_res.data['data']['isPublished'] is False

        # Delete course
        delete_res = self.client.delete(reverse('admin-course-manage-detail', kwargs={'pk': new_course_id}))
        assert delete_res.status_code == status.HTTP_200_OK


