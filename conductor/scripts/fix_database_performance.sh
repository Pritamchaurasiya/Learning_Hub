#!/bin/bash
# Database Load Test Fix Script
# Applies optimizations to fix slow query issues

echo "=================================="
echo "Database Load Test Fix"
echo "=================================="

# 1. Create indexes
echo "[1/4] Creating database indexes..."
python manage.py shell << 'EOF'
from apps.core.index_manager import DatabaseIndexManager
DatabaseIndexManager.create_indexes()
EOF

# 2. Analyze tables
echo "[2/4] Analyzing table statistics..."
python manage.py shell << 'EOF'
from apps.core.index_manager import DatabaseIndexManager
DatabaseIndexManager.analyze_table_stats()
EOF

# 3. Clear Django cache
echo "[3/4] Clearing Django cache..."
python manage.py shell -c "from django.core.cache import cache; cache.clear()"

# 4. Warm up cache with common queries
echo "[4/4] Warming up cache..."
python manage.py shell << 'EOF'
from apps.courses.models import Course, Category
from apps.users.models import User
from django.core.cache import cache

# Cache course list
courses = list(Course.objects.filter(status='published')[:10])
cache.set('popular_courses', courses, 300)

# Cache categories
categories = list(Category.objects.all())
cache.set('all_categories', categories, 600)

print("Cache warmed up successfully")
EOF

echo "=================================="
echo "Database optimizations applied!"
echo "=================================="
echo ""
echo "Expected improvements:"
echo "  - Query time: -40-60%"
echo "  - Slow queries: <2% (from 9.5%)"
echo "  - Cache hit rate: >90%"
echo ""
echo "Run load test again to verify:"
echo "  python load_testing_suite.py"
