"""
Async Task Optimizer
Optimizes Celery task execution for better performance
"""

from celery import Celery
from celery.signals import task_prerun, task_postrun
import time


class AsyncTaskOptimizer:
    """
    Optimizes async task execution and monitoring.
    """
    
    # Task priority levels
    PRIORITY_HIGH = 0
    PRIORITY_NORMAL = 5
    PRIORITY_LOW = 10
    
    @staticmethod
    def optimize_task_routing(task_name, queue='default'):
        """
        Route tasks to appropriate queues based on priority.
        """
        routing_config = {
            'send_notification': {'queue': 'notifications', 'priority': 0},
            'process_payment': {'queue': 'payments', 'priority': 0},
            'generate_report': {'queue': 'reports', 'priority': 5},
            'cleanup_old_data': {'queue': 'maintenance', 'priority': 10},
            'sync_external_data': {'queue': 'sync', 'priority': 5},
        }
        return routing_config.get(task_name, {'queue': queue, 'priority': 5})
    
    @staticmethod
    def batch_tasks(task_list, batch_size=100):
        """
        Batch multiple tasks for efficient processing.
        """
        batches = []
        for i in range(0, len(task_list), batch_size):
            batch = task_list[i:i + batch_size]
            batches.append(batch)
        return batches
    
    @staticmethod
    def optimize_task_rate(task_name, max_rate='10/m'):
        """
        Configure rate limiting for tasks.
        """
        rate_limits = {
            'send_email': '30/m',
            'send_notification': '60/m',
            'api_request': '100/m',
            'process_payment': '10/m',
            'generate_report': '5/m',
        }
        return rate_limits.get(task_name, max_rate)


@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, **kwargs):
    """Track task start time."""
    task._start_time = time.time()


@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, **kwargs):
    """Log task execution time."""
    if hasattr(task, '_start_time'):
        execution_time = time.time() - task._start_time
        print(f"[TASK] {task.name} completed in {execution_time:.3f}s")


def create_optimized_task(task_name, queue='default', priority=5, max_retries=3):
    """
    Decorator factory for creating optimized tasks.
    """
    from celery import shared_task
    
    def decorator(func):
        @shared_task(
            bind=True,
            name=task_name,
            queue=queue,
            priority=priority,
            max_retries=max_retries,
            default_retry_delay=60,
            rate_limit=AsyncTaskOptimizer.optimize_task_rate(task_name)
        )
        def wrapper(self, *args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as exc:
                # Retry with exponential backoff
                countdown = 60 * (2 ** self.request.retries)
                raise self.retry(exc=exc, countdown=countdown)
        
        return wrapper
    return decorator
