"""
Learning Hub SDK Exceptions
"""

class LearningHubError(Exception):
    """Base exception for all Learning Hub SDK errors."""
    pass

class AuthenticationError(LearningHubError):
    """Raised when authentication fails."""
    pass

class APIError(LearningHubError):
    """Raised when API request fails."""
    def __init__(self, message, status_code=None, response=None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response

class NotFoundError(APIError):
    """Raised when resource is not found."""
    pass

class ValidationError(LearningHubError):
    """Raised when validation fails."""
    pass

class RateLimitError(APIError):
    """Raised when rate limit is exceeded."""
    pass

class ServerError(APIError):
    """Raised when server error occurs."""
    pass
