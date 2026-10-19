# Celery Tasks & Logging Improvements Guide

## Overview
Comprehensive guide for optimizing Celery tasks, implementing robust error handling, and establishing production-grade logging across the Learning Hub Django backend.

---

## Part 1: Celery Task Optimization (Task #7)

### 1.1 Enhanced Celery Configuration

#### Improved celery.py
```python
# config/celery.py
from celery import Celery
from celery.signals import task_failure, task_success, task_retry
import logging

logger = logging.getLogger('celery')

app = Celery("learning_hub")

# Enhanced Configuration
app.conf.update(
    # Broker settings with reliability
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    
    # Result backend
    result_backend='redis://localhost:6379/0',
    result_expires=3600,  # 1 hour
    result_extended=True,
    
    # Task execution settings
    task_acks_late=True,  # Acknowledge only after completion
    task_reject_on_worker_lost=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes hard limit
    task_soft_time_limit=540,  # 9 minutes soft limit
    
    # Retry settings
    task_autoretry_for=(Exception,),
    task_max_retries=3,
    task_default_retry_delay=60,  # 1 minute
    
    # Rate limiting
    task_default_rate_limit='100/m',
    worker_prefetch_multiplier=1,
    
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Priority queues
    task_queues={
        'default': {
            'exchange': 'default',
            'routing_key': 'default',
        },
        'high_priority': {
            'exchange': 'high_priority',
            'routing_key': 'high_priority',
        },
        'ai_computation': {
            'exchange': 'ai_computation',
            'routing_key': 'ai_computation',
        },
        'notifications': {
            'exchange': 'notifications',
            'routing_key': 'notifications',
        },
    },
    
    # Task routing
    task_routes={
        'apps.ai_engine.*': {'queue': 'ai_computation'},
        'apps.notifications.*': {'queue': 'notifications'},
        '*': {'queue': 'default'},
    },
)

# Task event handlers
@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, **kwargs):
    """Log task failures."""
    logger.error(
        f"Task {sender.name} [{task_id}] failed: {exception}",
        extra={'task_id': task_id, 'task_name': sender.name}
    )

@task_success.connect
def task_success_handler(sender=None, result=None, **kwargs):
    """Log task success."""
    logger.info(f"Task {sender.name} completed successfully")

@task_retry.connect
def task_retry_handler(sender=None, reason=None, **kwargs):
    """Log task retries."""
    logger.warning(f"Task {sender.name} retrying: {reason}")
```

### 1.2 Task Optimization Patterns

#### Base Task Class with Error Handling
```python
# apps/core/tasks.py
from celery import Task
from celery.utils.log import get_task_logger
import logging

logger = get_task_logger(__name__)

class BaseTask(Task):
    """Base task with comprehensive error handling and logging."""
    
    autoretry_for = (Exception,)
    max_retries = 3
    default_retry_delay = 60
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        logger.error(
            f'Task {self.name} [{task_id}] failed: {exc}',
            extra={
                'task_id': task_id,
                'task_name': self.name,
                'args': args,
                'kwargs': kwargs,
                'exception': str(exc),
            },
            exc_info=True
        )
        
        # Send failure notification
        from apps.notifications.services import NotificationService
        NotificationService.send_admin_alert(
            title=f"Task Failed: {self.name}",
            message=f"Task {task_id} failed with error: {exc}"
        )
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Handle task retry."""
        logger.warning(
            f'Task {self.name} [{task_id}] retrying (attempt {self.request.retries + 1}/{self.max_retries}): {exc}',
            extra={
                'task_id': task_id,
                'task_name': self.name,
                'retry_count': self.request.retries,
            }
        )
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success."""
        logger.info(
            f'Task {self.name} [{task_id}] completed successfully',
            extra={
                'task_id': task_id,
                'task_name': self.name,
            }
        )


# Usage in tasks
@shared_task(base=BaseTask, bind=True)
def my_task(self, arg1, arg2):
    """Example task with base class."""
    try:
        # Task logic here
        result = process_data(arg1, arg2)
        return result
    except SpecificException as e:
        logger.error(f"Specific error in task: {e}")
        raise self.retry(exc=e, countdown=120)  # Retry after 2 minutes
```

#### Optimized Task Examples

##### 1. Batch Processing Task
```python
# apps/gamification/tasks.py
from celery import shared_task, group
from apps.core.tasks import BaseTask

@shared_task(base=BaseTask, bind=True)
def check_achievements_task(self):
    """Check achievements for all users in batches."""
    from apps.users.models import User
    from apps.gamification.services import GamificationService
    
    # Process in chunks to avoid memory issues
    batch_size = 100
    users = User.objects.filter(is_active=True).iterator(chunk_size=batch_size)
    
    for user in users:
        try:
            GamificationService.check_and_award_achievements(user)
        except Exception as e:
            logger.error(f"Failed to check achievements for user {user.id}: {e}")
            continue  # Don't fail entire task for one user
    
    return {'status': 'completed', 'message': 'Achievements checked'}


@shared_task(base=BaseTask)
def process_user_achievements(user_id):
    """Process achievements for a single user."""
    from apps.users.models import User
    from apps.gamification.services import GamificationService
    
    try:
        user = User.objects.get(id=user_id)
        result = GamificationService.check_and_award_achievements(user)
        return {'user_id': str(user_id), 'achievements': result}
    except User.DoesNotExist:
        logger.warning(f"User {user_id} not found")
        return {'user_id': str(user_id), 'error': 'User not found'}
```

##### 2. Time-Sensitive Task with Expiration
```python
# apps/notifications/tasks.py
@shared_task(
    base=BaseTask,
    bind=True,
    expires=300,  # Expire after 5 minutes
    time_limit=60,  # 1 minute hard limit
    soft_time_limit=50
)
def send_push_notification(self, user_id, title, message):
    """Send push notification to user."""
    from apps.notifications.services import PushNotificationService
    
    try:
        result = PushNotificationService.send_notification(
            user_id=user_id,
            title=title,
            message=message
        )
        return {'status': 'sent', 'user_id': str(user_id)}
    except Exception as e:
        logger.error(f"Failed to send notification to user {user_id}: {e}")
        # Don't retry notifications - they become stale
        return {'status': 'failed', 'user_id': str(user_id), 'error': str(e)}
```

##### 3. AI Task with High Priority
```python
# apps/ai_engine/tasks.py
@shared_task(
    base=BaseTask,
    bind=True,
    queue='ai_computation',
    priority=9,  # High priority
    time_limit=900,  # 15 minutes
    soft_time_limit=840
)
def generate_course_embedding_task(self, course_id):
    """Generate embedding for course asynchronously."""
    from apps.courses.models import Course
    from apps.ai_engine.services import EmbeddingService
    
    try:
        course = Course.objects.get(id=course_id)
        embedding = EmbeddingService.generate_embedding(course.description)
        
        course.embedding = embedding
        course.save(update_fields=['embedding'])
        
        return {'course_id': str(course_id), 'status': 'completed'}
    except Course.DoesNotExist:
        logger.warning(f"Course {course_id} not found")
        return {'course_id': str(course_id), 'status': 'not_found'}
    except Exception as e:
        logger.error(f"Failed to generate embedding for course {course_id}: {e}")
        raise self.retry(exc=e, countdown=300, max_retries=2)
```

##### 4. Scheduled Periodic Task
```python
# apps/subscriptions/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

@shared_task(base=BaseTask)
def cleanup_expired_subscriptions():
    """Clean up expired subscriptions (runs daily)."""
    from apps.subscriptions.models import Subscription
    
    expired_date = timezone.now() - timedelta(days=30)
    count = Subscription.objects.filter(
        end_date__lt=expired_date,
        is_active=False
    ).delete()[0]
    
    logger.info(f"Cleaned up {count} expired subscriptions")
    return {'deleted_count': count}


@shared_task(base=BaseTask)
def send_expiry_reminders():
    """Send reminders for subscriptions expiring soon."""
    from apps.subscriptions.models import Subscription
    from apps.notifications.tasks import send_email_task
    
    expiring_soon = timezone.now() + timedelta(days=3)
    subscriptions = Subscription.objects.filter(
        end_date__lte=expiring_soon,
        end_date__gte=timezone.now(),
        is_active=True
    ).select_related('user')
    
    for subscription in subscriptions:
        send_email_task.delay(
            user_id=subscription.user.id,
            subject="Your subscription is expiring soon",
            template="emails/subscription_expiry_reminder.html",
            context={'subscription': subscription}
        )
    
    return {'reminders_sent': subscriptions.count()}
```

### 1.3 Task Monitoring & Health Checks

```python
# apps/monitoring/tasks.py
@shared_task
def check_celery_health():
    """Health check task for Celery workers."""
    from celery.task.control import inspect
    
    i = inspect()
    
    # Check active workers
    active_workers = i.active()
    if not active_workers:
        logger.error("No active Celery workers found!")
        return {'status': 'unhealthy', 'workers': 0}
    
    # Check scheduled tasks
    scheduled = i.scheduled()
    
    # Check worker stats
    stats = i.stats()
    
    return {
        'status': 'healthy',
        'workers': len(active_workers),
        'scheduled_tasks': len(scheduled) if scheduled else 0,
        'stats': stats
    }
```

---

## Part 2: Comprehensive Logging (Task #8)

### 2.1 Enhanced Logging Configuration

#### Production Logging Setup
```python
# config/settings/production.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name} {module}.{funcName}:{lineno} - {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'errors.log'),
            'maxBytes': 10485760,
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'security_file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'security.log'),
            'maxBytes': 10485760,
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'celery_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'celery.log'),
            'maxBytes': 10485760,
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'filters': ['require_debug_false'],
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['error_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['security_file', 'mail_admins'],
            'level': 'WARNING',
            'propagate': False,
        },
        'celery': {
            'handlers': ['celery_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['security_file', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
```

### 2.2 Structured Logging Utilities

```python
# apps/core/logging_utils.py
import logging
import functools
from django.utils import timezone

# Create specialized loggers
app_logger = logging.getLogger('apps')
security_logger = logging.getLogger('security')
celery_logger = logging.getLogger('celery')


def log_execution_time(func):
    """Decorator to log function execution time."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = timezone.now()
        try:
            result = func(*args, **kwargs)
            execution_time = (timezone.now() - start_time).total_seconds()
            app_logger.info(
                f"{func.__name__} executed in {execution_time:.2f}s",
                extra={'function': func.__name__, 'execution_time': execution_time}
            )
            return result
        except Exception as e:
            execution_time = (timezone.now() - start_time).total_seconds()
            app_logger.error(
                f"{func.__name__} failed after {execution_time:.2f}s: {e}",
                extra={'function': func.__name__, 'execution_time': execution_time},
                exc_info=True
            )
            raise
    return wrapper


def log_security_event(event_type, user, details, request=None):
    """Log security events with structured data."""
    log_data = {
        'event_type': event_type,
        'user_id': str(user.id) if user else None,
        'user_email': user.email if user and hasattr(user, 'email') else None,
        'timestamp': timezone.now().isoformat(),
        'details': details,
    }
    
    if request:
        log_data.update({
            'ip_address': get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'path': request.path,
            'method': request.method,
        })
    
    security_logger.warning(
        f"Security Event: {event_type}",
        extra=log_data
    )


def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
```

### 2.3 Application-Level Logging Examples

#### User Authentication Logging
```python
# apps/users/views.py
from apps.core.logging_utils import log_security_event
import logging

logger = logging.getLogger('apps.users')

class LoginView(APIView):
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = authenticate(request, **serializer.validated_data)
            
            if user:
                # Log successful login
                log_security_event('successful_login', user, {}, request)
                logger.info(f"User {user.email} logged in successfully")
                
                # Generate tokens
                tokens = UserService.generate_tokens(user)
                return APIResponse.success(data=tokens)
            else:
                # Log failed login
                log_security_event('failed_login', None, {
                    'email': email,
                    'reason': 'invalid_credentials'
                }, request)
                logger.warning(f"Failed login attempt for {email}")
                
                return APIResponse.error(
                    message="Invalid credentials",
                    status_code=401
                )
        except Exception as e:
            logger.error(f"Login error for {email}: {e}", exc_info=True)
            raise
```

#### Payment Processing Logging
```python
# apps/payments/views.py
logger = logging.getLogger('apps.payments')

def create_order(request):
    try:
        # Log order creation attempt
        logger.info(
            f"Order creation initiated",
            extra={
                'user_id': str(request.user.id),
                'course_id': request.data.get('course_id')
            }
        )
        
        # Create order logic...
        payment = create_payment_record(...)
        
        # Log successful creation
        logger.info(
            f"Order created successfully",
            extra={
                'payment_id': str(payment.id),
                'amount': float(payment.amount),
                'currency': payment.currency
            }
        )
        
        return APIResponse.success(data={'payment_id': str(payment.id)})
        
    except Exception as e:
        logger.error(
            f"Order creation failed",
            extra={
                'user_id': str(request.user.id),
                'error': str(e)
            },
            exc_info=True
        )
        raise
```

---

## Part 3: Best Practices Summary

### Celery Tasks:
1. ✅ Use `BaseTask` for consistent error handling
2. ✅ Set appropriate `time_limit` and `soft_time_limit`
3. ✅ Configure retry logic with exponential backoff
4. ✅ Use task queues for priority management
5. ✅ Process large datasets in chunks
6. ✅ Add task monitoring and health checks
7. ✅ Use `bind=True` for access to task instance

### Logging:
1. ✅ Use appropriate log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
2. ✅ Include structured data with `extra` parameter
3. ✅ Separate security events to dedicated logger
4. ✅ Use rotating file handlers to prevent disk issues
5. ✅ Log execution time for performance monitoring
6. ✅ Include contextual information (user_id, request_id)
7. ✅ Never log sensitive data (passwords, tokens)

---

**Document Version**: 1.0  
**Created**: 2026-10-19  
**Author**: Kiro AI Assistant
