"""
Database Index Manager
Manages and optimizes database indexes for better query performance
"""

from django.db import connection, transaction
from django.db.models import Index


class DatabaseIndexManager:
    """
    Manages database indexes for optimal performance.
    """
    
    RECOMMENDED_INDEXES = {
        'courses_course': [
            ('status', 'slug'),
            ('category_id', 'status'),
            ('instructor_id', 'created_at'),
            ('avg_rating', 'status'),
            ('created_at', 'status'),
        ],
        'users_user': [
            ('email', 'is_active'),
            ('username', 'is_active'),
            ('date_joined', 'is_active'),
        ],
        'courses_enrollment': [
            ('user_id', 'course_id', 'status'),
            ('course_id', 'status'),
            ('enrolled_at', 'status'),
        ],
        'content_lesson': [
            ('course_id', 'order_index'),
            ('course_id', 'status'),
        ],
        'gamification_userxp': [
            ('user_id', 'total_xp'),
            ('total_xp', 'level'),
        ],
        'notifications_notification': [
            ('user_id', 'is_read', 'created_at'),
            ('user_id', 'created_at'),
        ],
    }
    
    @classmethod
    def create_indexes(cls):
        """Create recommended indexes."""
        with connection.cursor() as cursor:
            for table, indexes in cls.RECOMMENDED_INDEXES.items():
                for columns in indexes:
                    index_name = f"idx_{table}_{'_'.join(columns)}"
                    try:
                        sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table} ({', '.join(columns)})"
                        cursor.execute(sql)
                        print(f"[OK] Created index: {index_name}")
                    except Exception as e:
                        print(f"[SKIP] {index_name}: {e}")
    
    @classmethod
    def analyze_table_stats(cls):
        """Analyze table statistics for query optimizer."""
        with connection.cursor() as cursor:
            for table in cls.RECOMMENDED_INDEXES.keys():
                try:
                    cursor.execute(f"ANALYZE {table}")
                    print(f"[OK] Analyzed: {table}")
                except Exception as e:
                    print(f"[SKIP] {table}: {e}")
    
    @classmethod
    def get_table_stats(cls):
        """Get table statistics."""
        stats = {}
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schemaname, tablename, attname, n_distinct, correlation
                FROM pg_stats
                WHERE schemaname = 'public'
            """)
            for row in cursor.fetchall():
                table = row[1]
                column = row[2]
                if table not in stats:
                    stats[table] = {}
                stats[table][column] = {
                    'distinct_values': row[3],
                    'correlation': row[4]
                }
        return stats


def optimize_slow_queries():
    """
    Analyze and optimize slow queries.
    """
    from django.conf import settings
    
    # Check if slow query logging is enabled
    if not settings.DEBUG:
        print("[INFO] Enable Django DEBUG to capture queries")
        return
    
    from django.db import connection
    
    # Get slow queries
    slow_threshold = 0.1  # 100ms
    queries = connection.queries
    
    slow_queries = []
    for query in queries:
        time = float(query.get('time', 0))
        if time > slow_threshold:
            slow_queries.append({
                'sql': query['sql'][:200],
                'time': time
            })
    
    if slow_queries:
        print(f"[WARN] Found {len(slow_queries)} slow queries:")
        for q in slow_queries[:10]:
            print(f"  {q['time']}s: {q['sql']}...")
    else:
        print("[OK] No slow queries detected")
