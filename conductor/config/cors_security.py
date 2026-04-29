"""
Secure CORS Configuration
Controls cross-origin resource sharing
"""

# Production CORS settings
CORS_PRODUCTION = {
    # Only allow specific origins in production
    'CORS_ALLOWED_ORIGINS': [
        'https://yourdomain.com',
        'https://app.yourdomain.com',
    ],
    
    # Allow specific headers
    'CORS_ALLOW_HEADERS': [
        'accept',
        'accept-encoding',
        'authorization',
        'content-type',
        'dnt',
        'origin',
        'user-agent',
        'x-csrftoken',
        'x-requested-with',
    ],
    
    # Allow specific methods
    'CORS_ALLOW_METHODS': [
        'DELETE',
        'GET',
        'OPTIONS',
        'PATCH',
        'POST',
        'PUT',
    ],
    
    # Don't allow credentials from unknown origins
    'CORS_ALLOW_CREDENTIALS': True,
    
    # Max age for preflight cache
    'CORS_PREFLIGHT_MAX_AGE': 86400,  # 24 hours
}

# Development CORS settings (more permissive)
CORS_DEVELOPMENT = {
    'CORS_ALLOW_ALL_ORIGINS': True,
    'CORS_ALLOW_CREDENTIALS': True,
}
