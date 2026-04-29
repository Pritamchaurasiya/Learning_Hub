"""
Enhanced Database Connection Pooling
Optimizes database connections for high-load scenarios
"""

import os
from typing import Dict, Any

# Connection Pool Settings
CONNECTION_POOL_SETTINGS = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',  # 30 second query timeout
        },
        'POOL_SIZE': 10,  # Maintain 10 connections in pool
        'MAX_OVERFLOW': 20,  # Allow up to 20 additional connections
        'POOL_RECYCLE': 3600,  # Recycle connections after 1 hour
    }
}

# pgBouncer Configuration
PGBOUNCER_CONFIG = """
[databases]
learning_hub = host=localhost port=5432 dbname=learning_hub

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3

# Connection limits
max_db_connections = 100
max_user_connections = 100

# Timeouts
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 15
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
client_login_timeout = 60
idle_transaction_timeout = 0
"""

def get_optimized_database_settings() -> Dict[str, Any]:
    """Get optimized database settings with connection pooling."""
    db_url = os.getenv('DATABASE_URL', 'postgres://localhost/learning_hub')
    
    return {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'learning_hub',
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
            'CONN_MAX_AGE': 600,  # Persistent connections
            'OPTIONS': {
                'connect_timeout': 10,
                'options': '-c statement_timeout=30000',
            },
        }
    }

def apply_connection_pooling():
    """Apply connection pooling settings to Django."""
    from django.conf import settings
    
    # Update database settings
    if hasattr(settings, 'DATABASES'):
        for db_name, config in settings.DATABASES.items():
            config['CONN_MAX_AGE'] = 600  # 10 minutes
            config['OPTIONS'] = config.get('OPTIONS', {})
            config['OPTIONS']['connect_timeout'] = 10
    
    print("[OK] Connection pooling settings applied")

# Usage in settings.py:
# from .connection_pooling import get_optimized_database_settings
# DATABASES = get_optimized_database_settings()
