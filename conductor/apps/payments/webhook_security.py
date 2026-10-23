"""
Payment Webhook Security - Enhanced Signature Verification
Prevents webhook spoofing and replay attacks.
"""

import hashlib
import hmac
import logging
import time
from typing import Dict, Any, Optional
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


class WebhookSecurityError(Exception):
    """Raised when webhook security validation fails."""
    pass


class RazorpayWebhookValidator:
    """
    Validates Razorpay webhooks with signature verification and replay protection.
    
    Security Features:
    - HMAC-SHA256 signature verification
    - Replay attack prevention (timestamp + nonce)
    - Rate limiting per webhook event
    """
    
    @staticmethod
    def verify_signature(payload: str, signature: str, secret: Optional[str] = None) -> bool:
        """
        Verify Razorpay webhook signature.
        
        Args:
            payload: Raw webhook payload (as string)
            signature: X-Razorpay-Signature header value
            secret: Webhook secret (defaults to settings.RAZORPAY_WEBHOOK_SECRET)
        
        Returns:
            bool: True if signature is valid
            
        Raises:
            WebhookSecurityError: If signature verification fails
        """
        if not secret:
            secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '')
        
        if not secret:
            logger.error("RAZORPAY_WEBHOOK_SECRET not configured")
            raise WebhookSecurityError("Webhook secret not configured")
        
        try:
            # Compute expected signature
            expected_signature = hmac.new(
                key=secret.encode('utf-8'),
                msg=payload.encode('utf-8'),
                digestmod=hashlib.sha256
            ).hexdigest()
            
            # Constant-time comparison to prevent timing attacks
            if not hmac.compare_digest(expected_signature, signature):
                logger.warning("Webhook signature mismatch")
                raise WebhookSecurityError("Invalid webhook signature")
            
            return True
            
        except Exception as e:
            logger.error(f"Webhook signature verification failed: {e}")
            raise WebhookSecurityError(f"Signature verification error: {e}")
    
    @staticmethod
    def prevent_replay_attack(event_id: str, max_age: int = 300) -> bool:
        """
        Prevent replay attacks by tracking processed event IDs.
        
        Args:
            event_id: Unique event identifier from webhook
            max_age: Maximum age in seconds (default 5 minutes)
        
        Returns:
            bool: True if event is new, False if already processed
            
        Raises:
            WebhookSecurityError: If replay attack detected
        """
        cache_key = f"webhook_event:{event_id}"
        
        # Check if event already processed
        if cache.get(cache_key):
            logger.warning(f"Replay attack detected: Event {event_id} already processed")
            raise WebhookSecurityError(f"Duplicate event: {event_id}")
        
        # Mark event as processed (TTL = max_age)
        cache.set(cache_key, True, timeout=max_age)
        return True
    
    @staticmethod
    def validate_timestamp(timestamp: int, tolerance: int = 300) -> bool:
        """
        Validate webhook timestamp to prevent old webhooks.
        
        Args:
            timestamp: Unix timestamp from webhook
            tolerance: Maximum age in seconds (default 5 minutes)
        
        Returns:
            bool: True if timestamp is within tolerance
            
        Raises:
            WebhookSecurityError: If timestamp too old or in future
        """
        current_time = int(time.time())
        time_diff = abs(current_time - timestamp)
        
        if time_diff > tolerance:
            logger.warning(f"Webhook timestamp outside tolerance: {time_diff}s")
            raise WebhookSecurityError(
                f"Webhook timestamp too old or in future (diff: {time_diff}s)"
            )
        
        return True
    
    @classmethod
    def validate_webhook(
        cls,
        payload: str,
        signature: str,
        event_data: Dict[str, Any],
        secret: Optional[str] = None
    ) -> bool:
        """
        Complete webhook validation pipeline.
        
        Args:
            payload: Raw webhook payload
            signature: Signature header value
            event_data: Parsed event data (for timestamp/ID extraction)
            secret: Webhook secret
        
        Returns:
            bool: True if all validations pass
            
        Raises:
            WebhookSecurityError: If any validation fails
        """
        # 1. Verify signature
        cls.verify_signature(payload, signature, secret)
        
        # 2. Validate timestamp (if present)
        if 'created_at' in event_data:
            cls.validate_timestamp(event_data['created_at'])
        
        # 3. Prevent replay attacks
        event_id = event_data.get('id')
        if event_id:
            cls.prevent_replay_attack(event_id)
        else:
            logger.warning("Webhook missing event ID - replay protection skipped")
        
        return True


class StripeWebhookValidator:
    """
    Validates Stripe webhooks with signature verification.
    
    Uses Stripe's construct_event for built-in security.
    """
    
    @staticmethod
    def verify_signature(
        payload: bytes,
        signature: str,
        secret: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verify Stripe webhook signature using stripe library.
        
        Args:
            payload: Raw webhook payload (bytes)
            signature: Stripe-Signature header value
            secret: Webhook signing secret
        
        Returns:
            Dict: Verified event object
            
        Raises:
            WebhookSecurityError: If signature verification fails
        """
        if not secret:
            secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
        
        if not secret:
            logger.error("STRIPE_WEBHOOK_SECRET not configured")
            raise WebhookSecurityError("Webhook secret not configured")
        
        try:
            import stripe
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature,
                secret=secret
            )
            return event
            
        except ValueError as e:
            logger.error(f"Invalid Stripe webhook payload: {e}")
            raise WebhookSecurityError(f"Invalid payload: {e}")
            
        except stripe.error.SignatureVerificationError as e:
            logger.warning(f"Stripe signature verification failed: {e}")
            raise WebhookSecurityError(f"Invalid signature: {e}")
        
        except Exception as e:
            logger.error(f"Stripe webhook verification error: {e}")
            raise WebhookSecurityError(f"Verification error: {e}")
    
    @classmethod
    def validate_webhook(
        cls,
        payload: bytes,
        signature: str,
        secret: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Complete Stripe webhook validation.
        
        Returns verified event object with built-in replay protection.
        """
        return cls.verify_signature(payload, signature, secret)


class WebhookRateLimiter:
    """
    Rate limit webhook processing to prevent abuse.
    """
    
    @staticmethod
    def check_rate_limit(
        identifier: str,
        limit: int = 10,
        window: int = 60
    ) -> bool:
        """
        Check if rate limit exceeded for webhook source.
        
        Args:
            identifier: Unique identifier (e.g., payment_id, IP address)
            limit: Maximum requests in window
            window: Time window in seconds
        
        Returns:
            bool: True if within limit
            
        Raises:
            WebhookSecurityError: If rate limit exceeded
        """
        cache_key = f"webhook_ratelimit:{identifier}"
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit:
            logger.warning(f"Webhook rate limit exceeded: {identifier}")
            raise WebhookSecurityError(
                f"Rate limit exceeded: {current_count}/{limit} requests"
            )
        
        # Increment counter
        cache.set(cache_key, current_count + 1, timeout=window)
        return True


# Usage Example in views.py:
"""
from apps.payments.webhook_security import (
    RazorpayWebhookValidator,
    StripeWebhookValidator,
    WebhookSecurityError,
    WebhookRateLimiter
)

@csrf_exempt
def razorpay_webhook(request):
    try:
        # 1. Extract data
        payload = request.body.decode('utf-8')
        signature = request.META.get('HTTP_X_RAZORPAY_SIGNATURE', '')
        event_data = json.loads(payload)
        
        # 2. Validate webhook
        RazorpayWebhookValidator.validate_webhook(
            payload=payload,
            signature=signature,
            event_data=event_data
        )
        
        # 3. Rate limiting
        payment_id = event_data.get('payload', {}).get('payment', {}).get('entity', {}).get('id')
        if payment_id:
            WebhookRateLimiter.check_rate_limit(payment_id, limit=5, window=60)
        
        # 4. Process webhook
        process_payment_webhook(event_data)
        
        return JsonResponse({'status': 'success'})
        
    except WebhookSecurityError as e:
        logger.error(f"Webhook security error: {e}")
        return JsonResponse({'error': str(e)}, status=400)
"""
