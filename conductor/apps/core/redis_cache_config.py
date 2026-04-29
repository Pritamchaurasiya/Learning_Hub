"""
Redis Cache Configuration
Optimized Redis settings for production caching
"""

from django.conf import settings
import redis


class RedisCacheConfigurator:
    """
    Configures Redis cache for optimal performance.
    """
    
    # Optimized Redis settings
    REDIS_SETTINGS = {
        'SOCKET_TIMEOUT': 5,
        'SOCKET_CONNECT_TIMEOUT': 5,
        'RETRY_ON_TIMEOUT': True,
        'MAX_CONNECTIONS': 50,
        'HEALTH_CHECK_INTERVAL': 30,
        'CONNECTION_POOL_CLASS_KWARGS': {
            'max_connections': 50,
            'retry_on_timeout': True,
        }
    }
    
    # Cache timeout settings (in seconds)
    CACHE_TIMEOUTS = {
        'default': 300,           # 5 minutes
        'session': 3600,          # 1 hour
        'view': 300,              # 5 minutes
        'api_response': 120,    # 2 minutes
        'template_fragment': 600, # 10 minutes
        'query_result': 300,      # 5 minutes
        'static_page': 3600,      # 1 hour
    }
    
    @classmethod
    def get_cache_config(cls):
        """Generate optimal cache configuration."""
        return {
            'default': {
                'BACKEND': 'django_redis.cache.RedisCache',
                'LOCATION': settings.REDIS_URL or 'redis://127.0.0.1:6379/1',
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                    'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
                    **cls.REDIS_SETTINGS
                },
                'KEY_PREFIX': 'learninghub',
                'TIMEOUT': cls.CACHE_TIMEOUTS['default'],
            },
            'sessions': {
                'BACKEND': 'django_redis.cache.RedisCache',
                'LOCATION': settings.REDIS_URL or 'redis://127.0.0.1:6379/2',
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                },
                'TIMEOUT': cls.CACHE_TIMEOUTS['session'],
            }
        }
    
    @classmethod
    def test_connection(cls):
        """Test Redis connection."""
        try:
            cache_config = cls.get_cache_config()
            redis_url = cache_config['default']['LOCATION']
            client = redis.from_url(redis_url)
            client.ping()
            print("[OK] Redis connection successful")
            return True
        except Exception as e:
            print(f"[ERROR] Redis connection failed: {e}")
            return False
    
    @staticmethod
    def get_cache_stats():
        """Get Redis cache statistics."""
        try:
            from django.core.cache import cache
            stats = cache._cache.info()
            return {
                'used_memory': stats.get('used_memory_human', 'N/A'),
                'connected_clients': stats.get('connected_clients', 0),
                'total_commands': stats.get('total_commands_processed', 0),
                'keyspace_hits': stats.get('keyspace_hits', 0),
                'keyspace_misses': stats.get('keyspace_misses', 0),
            }
        except:
            return None


def configure_cache():
    """Configure optimal caching."""
    config = RedisCacheConfigurator.get_cache_config()
    print("[OK] Redis cache configured")
    return config
