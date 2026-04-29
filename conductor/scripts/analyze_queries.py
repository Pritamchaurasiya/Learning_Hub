#!/usr/bin/env python
"""
Query Analysis Tool
Identifies slow queries and provides optimization recommendations
"""

import os
import sys
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

import django
django.setup()

from django.db import connection, reset_queries
from django.conf import settings

class QueryAnalyzer:
    """Analyzes database queries for performance issues."""
    
    def __init__(self):
        self.slow_queries = []
        self.duplicate_queries = []
        self.missing_indexes = []
    
    def analyze_queries(self, queries):
        """Analyze a list of queries."""
        print(f"Analyzing {len(queries)} queries...")
        
        # Check for slow queries (>100ms)
        for query in queries:
            time_ms = float(query.get('time', 0)) * 1000
            
            if time_ms > 100:
                self.slow_queries.append({
                    'sql': query['sql'][:200],
                    'time_ms': round(time_ms, 2),
                    'recommendation': self._get_recommendation(query['sql'])
                })
        
        # Check for duplicate queries (N+1)
        query_counts = {}
        for query in queries:
            sql = query['sql'][:100]  # First 100 chars
            query_counts[sql] = query_counts.get(sql, 0) + 1
        
        for sql, count in query_counts.items():
            if count > 5:
                self.duplicate_queries.append({
                    'sql': sql,
                    'count': count,
                    'recommendation': 'Consider caching or eager loading (select_related/prefetch_related)'
                })
    
    def _get_recommendation(self, sql):
        """Get optimization recommendation for a slow query."""
        sql_upper = sql.upper()
        
        if 'SELECT' in sql_upper and 'WHERE' in sql_upper:
            return 'Add index on WHERE clause columns'
        elif 'JOIN' in sql_upper:
            return 'Add indexes on JOIN columns, consider denormalization'
        elif 'ORDER BY' in sql_upper:
            return 'Add composite index including ORDER BY columns'
        elif 'GROUP BY' in sql_upper:
            return 'Add index on GROUP BY columns'
        else:
            return 'Review query structure and add appropriate indexes'
    
    def print_report(self):
        """Print analysis report."""
        print("
" + "=" * 80)
        print("QUERY ANALYSIS REPORT")
        print("=" * 80)
        
        print(f"
[SLOW QUERIES] Found: {len(self.slow_queries)}")
        if self.slow_queries:
            for i, query in enumerate(self.slow_queries[:5], 1):
                print(f"
  {i}. Time: {query['time_ms']}ms")
                print(f"     SQL: {query['sql'][:80]}...")
                print(f"     Fix: {query['recommendation']}")
        else:
            print("  No slow queries detected (threshold: 100ms)")
        
        print(f"
[DUPLICATE QUERIES] Found: {len(self.duplicate_queries)}")
        if self.duplicate_queries:
            for query in self.duplicate_queries[:5]:
                print(f"
  Count: {query['count']} executions")
                print(f"  SQL: {query['sql']}...")
                print(f"  Fix: {query['recommendation']}")
        else:
            print("  No N+1 query issues detected")
        
        print("
" + "=" * 80)
        print("Recommendations:")
        print("1. Add suggested indexes to improve query performance")
        print("2. Use select_related() for foreign key relationships")
        print("3. Use prefetch_related() for many-to-many relationships")
        print("4. Consider caching frequently accessed data")
        print("5. Review and optimize slow queries in application code")
        print("=" * 80)

def main():
    """Main analysis function."""
    print(f"Query Analysis Tool - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Enable query logging
    settings.DEBUG = True
    
    # Run sample queries to analyze
    from apps.courses.models import Course
    from apps.users.models import User
    
    reset_queries()
    
    # Simulate some queries
    try:
        list(Course.objects.all()[:10])
        list(User.objects.all()[:10])
    except:
        pass
    
    # Analyze queries
    from django.db import connection
    queries = connection.queries
    
    analyzer = QueryAnalyzer()
    analyzer.analyze_queries(queries)
    analyzer.print_report()

if __name__ == "__main__":
    main()
