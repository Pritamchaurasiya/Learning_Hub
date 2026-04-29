"""
Database Connection Pooling Configuration
Optimize database connections for high load
"""

# PostgreSQL connection pooling with PgBouncer settings
# Add to settings/production.py

DATABASE_CONNECTION_POOLING = {
    'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
    'CONN_HEALTH_CHECKS': True,
    'OPTIONS': {
        # Connection pool settings
        'MIN_CONNS': 4,
        'MAX_CONNS': 20,
        
        # Connection timeout
        'connect_timeout': 10,
        
        # SSL settings for production
        'sslmode': 'require',
    },
}

# Django database configuration with pooling
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600,
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}
