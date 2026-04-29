"""
Rate Limiting (Throttling) for API Security.

This module provides granular rate limits for different API operations
to prevent abuse, DoS attacks, and ensure fair usage.

Rate limits are configured in settings.py under REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
"""

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


# =============================================================================
# Authentication Throttles (Critical - Prevent Brute Force)
# =============================================================================

class LoginRateThrottle(AnonRateThrottle):
    """
    Limit login attempts to prevent brute force attacks.
    Rate: 5/min (configured in settings)
    """
    scope = 'login'


class RegistrationRateThrottle(AnonRateThrottle):
    """
    Limit registration to prevent spam account creation.
    Rate: 3/hour (configured in settings)
    """
    scope = 'register'


class PasswordResetThrottle(AnonRateThrottle):
    """
    Limit password reset requests to prevent email bombing.
    Rate: 3/hour
    """
    scope = 'password_reset'


# =============================================================================
# AI Feature Throttles (Resource Intensive)
# =============================================================================

class AIChatRateThrottle(UserRateThrottle):
    """
    Limit AI chat interactions (expensive compute).
    Rate: 60/min for authenticated users
    """
    scope = 'ai_chat'


class AICriticRateThrottle(UserRateThrottle):
    """
    Limit AI code review requests.
    Rate: 30/min
    """
    scope = 'ai_critic'


class AIGenerationThrottle(UserRateThrottle):
    """
    Limit AI content generation (daily challenges, outlines).
    Rate: 20/hour
    """
    scope = 'ai_generation'


# =============================================================================
# Payment & Transaction Throttles (Fraud Prevention)
# =============================================================================

class PaymentThrottle(UserRateThrottle):
    """
    Limit payment creation to prevent fraud.
    Rate: 10/hour
    """
    scope = 'payment'


class SubscriptionThrottle(UserRateThrottle):
    """
    Limit subscription operations.
    Rate: 5/hour
    """
    scope = 'subscription'


# =============================================================================
# Submission Throttles (Code Execution)
# =============================================================================

class DSASubmissionThrottle(UserRateThrottle):
    """
    Limit code submissions (sandboxed execution).
    Rate: 30/hour
    """
    scope = 'dsa_submission'


class QuizSubmissionThrottle(UserRateThrottle):
    """
    Limit quiz submissions.
    Rate: 20/min
    """
    scope = 'quiz_submission'


# =============================================================================
# Content Upload Throttles
# =============================================================================

class FileUploadThrottle(UserRateThrottle):
    """
    Limit file uploads (avatars, course materials).
    Rate: 20/hour
    """
    scope = 'file_upload'


class BulkOperationThrottle(UserRateThrottle):
    """
    Limit bulk operations (exports, batch updates).
    Rate: 5/hour
    """
    scope = 'bulk_operation'


# =============================================================================
# API Health Check Throttle
# =============================================================================

class HealthCheckThrottle(AnonRateThrottle):
    """
    Limit health check endpoint access.
    Rate: 60/min
    """
    scope = 'health_check'


# =============================================================================
# WebSocket Connection Throttle
# =============================================================================

class WebSocketConnectionThrottle(UserRateThrottle):
    """
    Limit WebSocket connection attempts.
    Rate: 10/min
    """
    scope = 'websocket_connect'


# =============================================================================
# Search & Heavy Query Throttles
# =============================================================================

class SearchThrottle(UserRateThrottle):
    """
    Limit search requests (database intensive).
    Rate: 100/min
    """
    scope = 'search'


class SemanticSearchThrottle(UserRateThrottle):
    """
    Limit semantic/vector search (AI embeddings).
    Rate: 30/min
    """
    scope = 'semantic_search'

