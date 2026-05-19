
import pytest
from unittest.mock import patch, MagicMock


@pytest.mark.django_db
class TestRazorpayService:
    """Tests for RazorpayService with mocked Razorpay client."""
    
    @pytest.fixture
    def mock_course(self):
        """Create a mock course for testing."""
        from apps.courses.models import Course, Category
        from apps.users.models import User
        
        instructor = User.objects.create_user(
            email='instructor@test.com',
            username='instructor',
            password='testpass123'
        )
        category = Category.objects.create(name='Test Category', slug='test-cat')
        course = Course.objects.create(
            title='Test Course',
            slug='test-course-pay',
            instructor=instructor,
            category=category,
            price=500.00,
            is_free=True,  # Set free for enrollment after payment
            is_published=True
        )
        return course

    @pytest.fixture
    def mock_user(self):
        """Create a test user."""
        from apps.users.models import User
        return User.objects.create_user(
            email='buyer@test.com',
            username='buyer',
            password='testpass123'
        )

    @pytest.fixture
    def service(self):
        """Create RazorpayService with mocked client."""
        with patch('apps.payments.services.settings') as mock_settings:
            mock_settings.RAZORPAY_KEY_ID = 'test_key_id'
            mock_settings.RAZORPAY_KEY_SECRET = 'test_key_secret'
            
            with patch('apps.payments.services.razorpay') as mock_razorpay:
                mock_client = MagicMock()
                mock_razorpay.Client.return_value = mock_client
                
                from apps.payments.services import RazorpayService
                service = RazorpayService()
                service.client = mock_client
                yield service

    def test_create_order(self, service, mock_user, mock_course):
        """Test order creation with user and course."""
        # Setup mock
        mock_order = {'id': 'order_123', 'amount': 50000, 'currency': 'INR'}
        service.client.order.create.return_value = mock_order
        
        # Execute
        order = service.create_order(mock_user, mock_course.id)
        
        # Verify
        service.client.order.create.assert_called_once()
        assert order['id'] == 'order_123'
        assert order['currency'] == 'INR'

    def test_verify_signature_success(self, service, mock_user, mock_course):
        """Test successful payment verification."""
        from apps.payments.models import Payment
        
        # Create a pending payment
        payment = Payment.objects.create(
            user=mock_user,
            course=mock_course,
            amount=500.00,
            currency='INR',
            status=Payment.Status.PENDING,
            gateway='razorpay',
            gateway_order_id='order_123'
        )
        
        # Mock successful verification
        service.client.utility.verify_payment_signature.return_value = True
        
        # Execute
        result = service.verify_payment('order_123', 'pay_123', 'sig_123')
        
        # Verify
        assert result.status == Payment.Status.COMPLETED
        service.client.utility.verify_payment_signature.assert_called_once()

    def test_verify_signature_failure(self, service, mock_user, mock_course):
        """Test failed signature verification."""
        from apps.payments.models import Payment
        
        # Create a pending payment
        Payment.objects.create(
            user=mock_user,
            course=mock_course,
            amount=500.00,
            currency='INR',
            status=Payment.Status.PENDING,
            gateway='razorpay',
            gateway_order_id='order_456'
        )
        
        # Mock verification failure
        service.client.utility.verify_payment_signature.side_effect = Exception("Invalid signature")
        
        # Execute and expect error
        with pytest.raises(ValueError, match="Signature Verification Failed"):
            service.verify_payment('order_456', 'pay_456', 'sig_bad')
