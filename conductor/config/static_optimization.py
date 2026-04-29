"""
Static File Optimization Configuration
WhiteNoise with compression and caching headers
"""

# Add to settings/production.py

STATIC_FILE_OPTIMIZATION = {
    # Enable WhiteNoise compression
    'WHITENOISE_USE_FINDERS': True,
    'WHITENOISE_AUTOREFRESH': False,
    'WHITENOISE_MIMETYPES': {
        '.js': 'application/javascript',
        '.css': 'text/css',
    },
    
    # Cache headers for static files
    'CACHE_CONTROL': {
        'javascript': 'public, max-age=31536000, immutable',
        'css': 'public, max-age=31536000, immutable',
        'images': 'public, max-age=2592000',
        'fonts': 'public, max-age=31536000, immutable',
    },
}

# Additional middleware configuration
STATIC_MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
]

# Whitenoise settings
WHITENOISE_ROOT = None  # Will be set to STATIC_ROOT in production
WHITENOISE_MAX_AGE = 31536000  # 1 year
