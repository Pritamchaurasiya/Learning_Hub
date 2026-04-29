"""
Database Index Optimization Script
Creates recommended indexes for better query performance
"""

from django.db import connection, transaction


INDEX_RECOMMENDATIONS = {
    # Courses app
    'courses_course': [
        ('is_published', 'created_at'),
        ('category_id', 'is_published', 'avg_rating'),
        ('instructor_id', 'is_published'),
        ('slug',),
    ],
    # Users app
    'users_user': [
        ('email', 'is_active'),
        ('role', 'is_active'),
        ('is_verified',),
    ],
    # Enrollments app
    'courses_enrollment': [
        ('user_id', 'course_id'),
        ('user_id', 'progress_percentage'),
        ('course_id', 'status'),
    ],
    # Notifications app
    'notifications_notification': [
        ('user_id', 'is_read', 'created_at'),
        ('user_id', 'type'),
    ],
    # Gamification app
    'gamification_userxp': [
        ('user_id', 'total_xp'),
        ('weekly_xp',),
    ],
}


def get_existing_indexes(table_name):
    """Get existing indexes for a table."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT index_name, column_name
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
            AND table_name = %s
            AND index_name != 'PRIMARY'
        """, [table_name])
        return cursor.fetchall()


def create_index(table_name, columns):
    """Create index if it doesn't exist."""
    index_name = f"idx_{table_name}_{'_'.join(columns)}"
    column_list = ', '.join(columns)
    
    sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({column_list})"
    
    with connection.cursor() as cursor:
        try:
            cursor.execute(sql)
            return True
        except Exception as e:
            print(f"Error creating index {index_name}: {e}")
            return False


def optimize_database_indexes():
    """Apply all recommended indexes."""
    created = 0
    failed = 0
    
    for table, indexes in INDEX_RECOMMENDATIONS.items():
        for columns in indexes:
            if create_index(table, columns):
                created += 1
            else:
                failed += 1
    
    return {'created': created, 'failed': failed}


if __name__ == '__main__':
    import django
    django.setup()
    
    print("Applying database index optimizations...")
    result = optimize_database_indexes()
    print(f"Created {result['created']} indexes, {result['failed']} failed")
