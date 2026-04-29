"""
Performance Monitoring Tool
Monitors and reports database and API performance metrics
"""

import time
import statistics
from collections import defaultdict
from django.db import connection
from django.core.cache import cache


class PerformanceMonitor:
    """
    Monitors application performance metrics.
    """
    
    def __init__(self):
        self.metrics = defaultdict(list)
    
    def record_query_time(self, operation, duration):
        """Record database query time."""
        self.metrics[f"query_{operation}"].append(duration)
    
    def record_api_time(self, endpoint, duration):
        """Record API response time."""
        self.metrics[f"api_{endpoint}"].append(duration)
    
    def get_statistics(self):
        """Get performance statistics."""
        stats = {}
        
        for metric_name, values in self.metrics.items():
            if values:
                stats[metric_name] = {
                    'count': len(values),
                    'avg': statistics.mean(values),
                    'median': statistics.median(values),
                    'min': min(values),
                    'max': max(values),
                    'p95': self._percentile(values, 95),
                    'p99': self._percentile(values, 99),
                }
        
        return stats
    
    @staticmethod
    def _percentile(data, percentile):
        """Calculate percentile."""
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        lower = int(index)
        upper = lower + 1
        if upper >= len(sorted_data):
            return sorted_data[-1]
        weight = index - lower
        return sorted_data[lower] * (1 - weight) + sorted_data[upper] * weight
    
    def print_report(self):
        """Print performance report."""
        stats = self.get_statistics()
        
        print("\n" + "=" * 80)
        print("PERFORMANCE REPORT")
        print("=" * 80)
        
        for metric_name, metric_stats in stats.items():
            print(f"\n{metric_name}:")
            print(f"  Count: {metric_stats['count']}")
            print(f"  Avg: {metric_stats['avg']:.4f}s")
            print(f"  Median: {metric_stats['median']:.4f}s")
            print(f"  P95: {metric_stats['p95']:.4f}s")
            print(f"  P99: {metric_stats['p99']:.4f}s")
            print(f"  Min/Max: {metric_stats['min']:.4f}s / {metric_stats['max']:.4f}s")


def monitor_database_performance():
    """
    Monitor current database performance.
    """
    with connection.cursor() as cursor:
        # Get connection count
        cursor.execute("SELECT count(*) FROM pg_stat_activity")
        connections = cursor.fetchone()[0]
        
        # Get cache hit ratio (if pg_buffercache is available)
        try:
            cursor.execute("""
                SELECT 
                    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as hit_ratio
                FROM pg_statio_user_tables
            """)
            hit_ratio = cursor.fetchone()[0]
        except:
            hit_ratio = None
        
        print(f"[INFO] Database Connections: {connections}")
        if hit_ratio:
            print(f"[INFO] Cache Hit Ratio: {hit_ratio:.2%}")


def check_query_performance():
    """
    Check for query performance issues.
    """
    from django.db import connection
    
    # This requires Django DEBUG to be True
    queries = connection.queries
    
    if not queries:
        print("[INFO] No queries captured. Enable DEBUG mode.")
        return
    
    # Analyze queries
    total_time = sum(float(q['time']) for q in queries)
    avg_time = total_time / len(queries)
    
    slow_queries = [q for q in queries if float(q['time']) > 0.1]
    
    print(f"\n[QUERY STATS]")
    print(f"  Total Queries: {len(queries)}")
    print(f"  Total Time: {total_time:.4f}s")
    print(f"  Average Time: {avg_time:.4f}s")
    print(f"  Slow Queries (>100ms): {len(slow_queries)}")
    
    if slow_queries:
        print(f"\n[SLOW QUERIES]")
        for q in slow_queries[:5]:
            print(f"  {q['time']}s: {q['sql'][:80]}...")
