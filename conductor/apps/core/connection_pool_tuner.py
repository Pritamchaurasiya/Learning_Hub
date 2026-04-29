"""
Database Connection Pool Tuner
Optimizes connection pool settings for production workloads
"""

import time
from django.db import connection, connections
from django.conf import settings


class ConnectionPoolTuner:
    """
    Tunes database connection pool settings.
    """
    
    # Optimal pool settings for production
    PRODUCTION_SETTINGS = {
        'CONN_MAX_AGE': 600,           # 10 minutes
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'MAX_CONNS': 20,           # Max connections per pool
            'MIN_CONNS': 5,            # Min connections to maintain
            'CONNECT_TIMEOUT': 10,     # Connection timeout
            'MAX_IDLE_TIME': 300,      # Max idle time
        }
    }
    
    @classmethod
    def tune_for_workload(cls, workload_type='mixed'):
        """
        Tune connection pool for specific workload.
        
        Args:
            workload_type: 'read_heavy', 'write_heavy', 'mixed'
        """
        settings_map = {
            'read_heavy': {
                'MAX_CONNS': 30,
                'MIN_CONNS': 10,
            },
            'write_heavy': {
                'MAX_CONNS': 20,
                'MIN_CONNS': 5,
            },
            'mixed': {
                'MAX_CONNS': 25,
                'MIN_CONNS': 8,
            }
        }
        
        return settings_map.get(workload_type, cls.PRODUCTION_SETTINGS)
    
    @classmethod
    def apply_settings(cls, db_config_name='default'):
        """Apply tuned settings to database configuration."""
        db_settings = settings.DATABASES.get(db_config_name, {})
        
        db_settings.update({
            'CONN_MAX_AGE': cls.PRODUCTION_SETTINGS['CONN_MAX_AGE'],
            'CONN_HEALTH_CHECKS': cls.PRODUCTION_SETTINGS['CONN_HEALTH_CHECKS'],
        })
        
        if 'OPTIONS' not in db_settings:
            db_settings['OPTIONS'] = {}
        
        db_settings['OPTIONS'].update(cls.PRODUCTION_SETTINGS['OPTIONS'])
        
        settings.DATABASES[db_config_name] = db_settings
        print(f"[OK] Connection pool tuned for '{db_config_name}'")
    
    @staticmethod
    def get_connection_stats():
        """Get current connection statistics."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT count(*) as total_connections,
                           count(*) FILTER (WHERE state = 'active') as active_connections,
                           count(*) FILTER (WHERE state = 'idle') as idle_connections
                    FROM pg_stat_activity
                    WHERE backend_type = 'client backend'
                """)
                return cursor.fetchone()
        except:
            return None


def test_connection_pool():
    """Test connection pool performance."""
    start_time = time.time()
    
    # Simulate multiple connections
    for _ in range(10):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    
    total_time = time.time() - start_time
    avg_time = total_time / 10
    
    print(f"[TEST] Connection pool test: {avg_time:.4f}s avg")
    return avg_time < 0.01  # Pass if < 10ms
