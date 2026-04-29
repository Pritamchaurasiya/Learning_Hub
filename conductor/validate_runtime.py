#!/usr/bin/env python3
"""
Runtime Validation Script for Learning Hub Backend
This script performs runtime checks to verify all imports and configurations are working.
"""

import sys
import os

def check_imports():
    """Verify all critical imports are working."""
    errors = []
    
    # Django imports
    try:
        import django
        print(f"✅ Django {django.VERSION} imported successfully")
    except ImportError as e:
        errors.append(f"❌ Django import failed: {e}")
    
    # Core app imports
    imports_to_check = [
        ("apps.core.middleware", "JWTAuthMiddleware"),
        ("apps.core.middleware", "InputSanitizationMiddleware"),
        ("apps.core.middleware", "CORSHardeningMiddleware"),
        ("apps.core.pagination", "StandardResultsSetPagination"),
        ("apps.core.mixins", "TimestampMixin"),
        ("apps.core.mixins", "UUIDMixin"),
        ("apps.core.models", "BaseModel"),
        ("apps.core.models", "AuditLog"),
    ]
    
    for module_name, class_name in imports_to_check:
        try:
            module = __import__(module_name, fromlist=[class_name])
            getattr(module, class_name)
            print(f"✅ {module_name}.{class_name} imported successfully")
        except (ImportError, AttributeError) as e:
            errors.append(f"❌ {module_name}.{class_name} failed: {e}")
    
    return errors

def check_settings():
    """Verify Django settings are loadable."""
    errors = []
    
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
        django.setup()
        from django.conf import settings
        
        # Check critical settings
        checks = [
            ('INSTALLED_APPS', bool(settings.INSTALLED_APPS)),
            ('MIDDLEWARE', bool(settings.MIDDLEWARE)),
            ('DATABASES', 'default' in settings.DATABASES),
            ('REST_FRAMEWORK', bool(settings.REST_FRAMEWORK)),
        ]
        
        for name, check in checks:
            if check:
                print(f"✅ Settings.{name} configured")
            else:
                errors.append(f"❌ Settings.{name} not configured")
                
    except Exception as e:
        errors.append(f"❌ Django settings load failed: {e}")
    
    return errors

def check_database_connection():
    """Verify database connection works."""
    errors = []
    
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result and result[0] == 1:
                print("✅ Database connection successful")
            else:
                errors.append("❌ Database query returned unexpected result")
    except Exception as e:
        errors.append(f"❌ Database connection failed: {e}")
    
    return errors

def check_middleware_chain():
    """Verify middleware classes are loadable."""
    errors = []
    
    try:
        from django.conf import settings
        for middleware_path in settings.MIDDLEWARE:
            try:
                module_path, class_name = middleware_path.rsplit('.', 1)
                module = __import__(module_path, fromlist=[class_name])
                getattr(module, class_name)
            except Exception as e:
                errors.append(f"❌ Middleware {middleware_path} failed: {e}")
        
        if not errors:
            print(f"✅ All {len(settings.MIDDLEWARE)} middleware classes loadable")
            
    except Exception as e:
        errors.append(f"❌ Middleware check failed: {e}")
    
    return errors

def check_asgi_application():
    """Verify ASGI application can be loaded."""
    errors = []
    
    try:
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
        django.setup()
        
        from config.asgi import application
        print("✅ ASGI application loaded successfully")
        
        # Check that it's a ProtocolTypeRouter
        from channels.routing import ProtocolTypeRouter
        if isinstance(application, ProtocolTypeRouter):
            print("✅ ASGI application is ProtocolTypeRouter")
        else:
            errors.append("❌ ASGI application is not ProtocolTypeRouter")
            
    except Exception as e:
        errors.append(f"❌ ASGI application load failed: {e}")
    
    return errors

def check_websocket_consumers():
    """Verify WebSocket consumers are loadable."""
    errors = []
    
    consumers_to_check = [
        ("apps.core.websocket_handlers", "NotificationConsumer"),
        ("apps.core.websocket_handlers", "ChatConsumer"),
        ("apps.core.websocket_handlers", "LiveSessionConsumer"),
        ("apps.core.websocket_handlers", "CollaborationConsumer"),
        ("apps.core.websocket_handlers", "AIHintConsumer"),
        ("apps.core.websocket_handlers", "LearningProgressConsumer"),
        ("apps.core.websocket_handlers", "SocialConsumer"),
    ]
    
    for module_name, class_name in consumers_to_check:
        try:
            module = __import__(module_name, fromlist=[class_name])
            consumer_class = getattr(module, class_name)
            # Check it has as_asgi method
            if hasattr(consumer_class, 'as_asgi'):
                print(f"✅ {class_name} is valid ASGI consumer")
            else:
                errors.append(f"❌ {class_name} missing as_asgi method")
        except Exception as e:
            errors.append(f"❌ {class_name} failed: {e}")
    
    return errors

def check_models():
    """Verify all models can be imported."""
    errors = []
    
    models_to_check = [
        ("apps.users.models", "User"),
        ("apps.courses.models", "Course"),
        ("apps.courses.models", "Enrollment"),
        ("apps.gamification.models", "UserXP"),
        ("apps.payments.models", "Payment"),
        ("apps.notifications.models", "Notification"),
    ]
    
    for module_name, class_name in models_to_check:
        try:
            module = __import__(module_name, fromlist=[class_name])
            model_class = getattr(module, class_name)
            # Check it's a Django model
            from django.db import models
            if issubclass(model_class, models.Model):
                print(f"✅ {class_name} is valid Django model")
            else:
                errors.append(f"❌ {class_name} is not a Django model")
        except Exception as e:
            errors.append(f"❌ {class_name} failed: {e}")
    
    return errors

def main():
    """Run all validation checks."""
    print("=" * 60)
    print("Learning Hub Backend - Runtime Validation")
    print("=" * 60)
    print()
    
    all_errors = []
    
    # Run checks
    print("1. Checking Imports...")
    all_errors.extend(check_imports())
    print()
    
    print("2. Checking Django Settings...")
    all_errors.extend(check_settings())
    print()
    
    print("3. Checking Database Connection...")
    all_errors.extend(check_database_connection())
    print()
    
    print("4. Checking Middleware Chain...")
    all_errors.extend(check_middleware_chain())
    print()
    
    print("5. Checking ASGI Application...")
    all_errors.extend(check_asgi_application())
    print()
    
    print("6. Checking WebSocket Consumers...")
    all_errors.extend(check_websocket_consumers())
    print()
    
    print("7. Checking Models...")
    all_errors.extend(check_models())
    print()
    
    # Summary
    print("=" * 60)
    if all_errors:
        print(f"❌ VALIDATION FAILED - {len(all_errors)} errors found:")
        for error in all_errors:
            print(f"   {error}")
        return 1
    else:
        print("✅ ALL VALIDATION CHECKS PASSED")
        print("System is ready for production deployment!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
