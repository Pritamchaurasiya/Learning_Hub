#!/usr/bin/env python
"""
Database Index Optimization Script
Creates optimized indexes for slow queries identified in load testing
"""

import os
import sys
import time
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

import django
django.setup()

from django.db import connection, transaction

INDEXES_TO_CREATE = [
    # Course-related indexes
    ('courses_course', 'idx_course_status_slug', 'status, slug'),
    ('courses_course', 'idx_course_category', 'category_id'),
    ('courses_course', 'idx_course_instructor', 'instructor_id'),
    ('courses_course', 'idx_course_created_at', 'created_at DESC'),
    ('courses_course', 'idx_course_avg_rating', 'avg_rating DESC'),
    
    # User-related indexes
    ('users_user', 'idx_user_email', 'email'),
    ('users_user', 'idx_user_username', 'username'),
    ('users_user', 'idx_user_is_active', 'is_active'),
    ('users_user', 'idx_user_date_joined', 'date_joined DESC'),
    
    # Enrollment indexes
    ('courses_enrollment', 'idx_enrollment_user_course', 'user_id, course_id'),
    ('courses_enrollment', 'idx_enrollment_status', 'status'),
    ('courses_enrollment', 'idx_enrollment_enrolled_at', 'enrolled_at DESC'),
    
    # Content indexes
    ('content_lesson', 'idx_lesson_course_order', 'course_id, order_index'),
    ('content_quiz', 'idx_quiz_lesson', 'lesson_id'),
    
    # Gamification indexes
    ('gamification_userxp', 'idx_xp_user', 'user_id'),
    ('gamification_userxp', 'idx_xp_total', 'total_xp DESC'),
    ('gamification_streak', 'idx_streak_user', 'user_id'),
    
    # Payment indexes
    ('payments_payment', 'idx_payment_user', 'user_id'),
    ('payments_payment', 'idx_payment_status', 'status'),
    ('payments_payment', 'idx_payment_created', 'created_at DESC'),
    
    # Notification indexes
    ('notifications_notification', 'idx_notif_user_read', 'user_id, is_read'),
    ('notifications_notification', 'idx_notif_created', 'created_at DESC'),
]

def create_indexes():
    """Create database indexes."""
    print("Creating database indexes...")
    print("=" * 60)
    
    created_count = 0
    
    with connection.cursor() as cursor:
        for table, index_name, columns in INDEXES_TO_CREATE:
            try:
                sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table} ({columns})"
                cursor.execute(sql)
                print(f"[OK] Created index: {index_name} on {table}({columns})")
                created_count += 1
            except Exception as e:
                print(f"[SKIP] {index_name}: {e}")
    
    print("=" * 60)
    print(f"Total indexes created/verified: {created_count}")
    print("[DONE] Database index optimization complete")

def analyze_tables():
    """Run ANALYZE on tables for query planner optimization."""
    print("
Analyzing tables...")
    
    tables = [
        'courses_course', 'courses_category', 'courses_enrollment',
        'users_user', 'content_lesson', 'content_quiz',
        'gamification_userxp', 'gamification_streak', 'gamification_badge',
        'payments_payment', 'notifications_notification'
    ]
    
    with connection.cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(f"ANALYZE {table}")
                print(f"[OK] Analyzed: {table}")
            except Exception as e:
                print(f"[SKIP] {table}: {e}")
    
    print("[DONE] Table analysis complete")

if __name__ == "__main__":
    print(f"Database Index Optimization - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    create_indexes()
    analyze_tables()
    
    print("
" + "=" * 60)
    print("Index optimization complete!")
    print("Monitor query performance improvement.")
    print("=" * 60)
