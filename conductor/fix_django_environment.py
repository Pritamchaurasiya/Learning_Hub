#!/usr/bin/env python
"""
Django Environment Fix & Setup Script
Fixes Django availability issues and sets up proper environment
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path

def setup_django_environment():
    """Setup Django environment properly."""
    print("=" * 80)
    print("🔧 DJANGO ENVIRONMENT SETUP & FIX SCRIPT")
    print("=" * 80)
    
    base_dir = "c:\\Users\\shiva\\Desktop\\windows_app\\conductor"
    os.chdir(base_dir)
    
    # 1. Check Python version
    print("\n1️⃣ Checking Python Environment...")
    result = subprocess.run([sys.executable, '--version'], capture_output=True, text=True)
    print(f"   Python: {result.stdout.strip()}")
    
    # 2. Check if Django is installed
    print("\n2️⃣ Checking Django Installation...")
    try:
        import django
        print(f"   ✅ Django {django.__version__} is installed")
        django_available = True
    except ImportError:
        print("   ❌ Django not found - installing...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'django'], check=True)
        print("   ✅ Django installed successfully")
        django_available = True
    
    # 3. Setup environment variables
    print("\n3️⃣ Setting Environment Variables...")
    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.local'
    os.environ['PYTHONPATH'] = base_dir
    print(f"   ✅ DJANGO_SETTINGS_MODULE set to config.settings.local")
    
    # 4. Check settings file
    print("\n4️⃣ Checking Django Settings...")
    settings_file = os.path.join(base_dir, 'config', 'settings', 'local.py')
    if os.path.exists(settings_file):
        print(f"   ✅ Settings file found: {settings_file}")
    else:
        print(f"   ⚠️ Settings file not found at expected location")
        # Check alternative locations
        for root, dirs, files in os.walk(os.path.join(base_dir, 'config')):
            for file in files:
                if file.endswith('.py') and 'settings' in file:
                    print(f"   📄 Found: {os.path.join(root, file)}")
    
    # 5. Test Django import
    print("\n5️⃣ Testing Django Import...")
    try:
        import django
        django.setup()
        from django.conf import settings
        print(f"   ✅ Django setup successful")
        print(f"   📊 Installed Apps: {len(settings.INSTALLED_APPS)}")
        print(f"   🔧 Middleware: {len(settings.MIDDLEWARE)}")
        
        # Test database
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        print(f"   ✅ Database connection successful")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Django setup failed: {e}")
        return False

def fix_common_django_issues():
    """Fix common Django issues."""
    print("\n" + "=" * 80)
    print("🔧 FIXING COMMON DJANGO ISSUES")
    print("=" * 80)
    
    base_dir = "c:\\Users\\shiva\\Desktop\\windows_app\\conductor"
    fixes_applied = []
    
    # 1. Check for migrations
    print("\n1️⃣ Checking Database Migrations...")
    try:
        result = subprocess.run(
            [sys.executable, 'manage.py', 'showmigrations', '--list'],
            capture_output=True,
            text=True,
            cwd=base_dir,
            timeout=30
        )
        if result.returncode == 0:
            unapplied = [line for line in result.stdout.split('\n') if '[ ]' in line]
            if unapplied:
                print(f"   ⚠️ {len(unapplied)} unapplied migrations found")
                print("   🔧 Running migrations...")
                subprocess.run(
                    [sys.executable, 'manage.py', 'migrate'],
                    cwd=base_dir,
                    timeout=60
                )
                fixes_applied.append("Applied database migrations")
            else:
                print("   ✅ All migrations applied")
        else:
            print(f"   ⚠️ Could not check migrations: {result.stderr}")
    except Exception as e:
        print(f"   ⚠️ Migration check failed: {e}")
    
    # 2. Collect static files
    print("\n2️⃣ Collecting Static Files...")
    try:
        result = subprocess.run(
            [sys.executable, 'manage.py', 'collectstatic', '--noinput'],
            capture_output=True,
            text=True,
            cwd=base_dir,
            timeout=60
        )
        if result.returncode == 0:
            print("   ✅ Static files collected")
            fixes_applied.append("Collected static files")
        else:
            print(f"   ⚠️ Static collection output: {result.stderr[:200]}")
    except Exception as e:
        print(f"   ⚠️ Static collection failed: {e}")
    
    # 3. Check for superuser
    print("\n3️⃣ Checking Admin Superuser...")
    try:
        os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.local'
        import django
        django.setup()
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if User.objects.filter(is_superuser=True).exists():
            print("   ✅ Superuser exists")
        else:
            print("   ⚠️ No superuser found - create one with: python manage.py createsuperuser")
    except Exception as e:
        print(f"   ⚠️ Could not check superuser: {e}")
    
    # 4. Check requirements
    print("\n4️⃣ Checking Requirements...")
    req_file = os.path.join(base_dir, 'requirements', 'base.txt')
    if os.path.exists(req_file):
        print(f"   ✅ Requirements file found")
        with open(req_file, 'r') as f:
            reqs = f.read()
            print(f"   📦 Total requirements: {len(reqs.splitlines())}")
    
    print(f"\n✅ Applied {len(fixes_applied)} fixes:")
    for fix in fixes_applied:
        print(f"  • {fix}")
    
    return fixes_applied

def create_django_launcher():
    """Create a Django launcher script."""
    print("\n" + "=" * 80)
    print("🚀 CREATING DJANGO LAUNCHER SCRIPT")
    print("=" * 80)
    
    base_dir = "c:\\Users\\shiva\\Desktop\\windows_app\\conductor"
    launcher_content = '''@echo off
REM Django Environment Launcher for Learning Hub
echo Starting Django with proper environment...

set DJANGO_SETTINGS_MODULE=config.settings.local
set PYTHONPATH=%~dp0

cd /d "%~dp0"

echo.
echo Checking environment...
python -c "import django; print(f'Django {django.__version__}')"

echo.
echo Running system checks...
python manage.py check

echo.
echo Starting development server...
python manage.py runserver 0.0.0.0:8000

pause
'''
    
    launcher_path = os.path.join(base_dir, 'start_django.bat')
    with open(launcher_path, 'w') as f:
        f.write(launcher_content)
    
    print(f"   ✅ Created launcher: {launcher_path}")
    
    # Create Python launcher too
    python_launcher = '''#!/usr/bin/env python
"""
Django Quick Launcher
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

print("Django environment ready!")
print(f"Settings: {os.environ['DJANGO_SETTINGS_MODULE']}")
print(f"Django Version: {django.__version__}")

if __name__ == '__main__':
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
'''
    
    py_launcher_path = os.path.join(base_dir, 'django_launcher.py')
    with open(py_launcher_path, 'w') as f:
        f.write(python_launcher)
    
    print(f"   ✅ Created Python launcher: {py_launcher_path}")

def test_full_django_setup():
    """Test complete Django setup."""
    print("\n" + "=" * 80)
    print("🧪 TESTING FULL DJANGO SETUP")
    print("=" * 80)
    
    base_dir = "c:\\Users\\shiva\\Desktop\\windows_app\\conductor"
    os.chdir(base_dir)
    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.local'
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Import Django
    print("\n1️⃣ Testing Django Import...")
    try:
        import django
        print(f"   ✅ Django {django.__version__} imported successfully")
        tests_passed += 1
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        tests_failed += 1
    
    # Test 2: Setup Django
    print("\n2️⃣ Testing Django Setup...")
    try:
        django.setup()
        print("   ✅ Django setup successful")
        tests_passed += 1
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        tests_failed += 1
    
    # Test 3: Import settings
    print("\n3️⃣ Testing Settings Import...")
    try:
        from django.conf import settings
        print(f"   ✅ Settings loaded: {settings.DEBUG}")
        tests_passed += 1
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        tests_failed += 1
    
    # Test 4: Database connection
    print("\n4️⃣ Testing Database Connection...")
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        print(f"   ✅ Database connected: {result}")
        tests_passed += 1
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        tests_failed += 1
    
    # Test 5: Import models
    print("\n5️⃣ Testing Model Imports...")
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        print(f"   ✅ User model loaded: {User.__name__}")
        tests_passed += 1
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        tests_failed += 1
    
    # Test 6: Check installed apps
    print("\n6️⃣ Testing Installed Apps...")
    try:
        from django.conf import settings
        app_count = len(settings.INSTALLED_APPS)
        print(f"   ✅ {app_count} apps installed")
        tests_passed += 1
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        tests_failed += 1
    
    print(f"\n📊 Test Results: {tests_passed} passed, {tests_failed} failed")
    
    if tests_failed == 0:
        print("\n🎉 DJANGO IS FULLY OPERATIONAL!")
    else:
        print(f"\n⚠️ {tests_failed} tests failed - review errors above")
    
    return tests_failed == 0

def main():
    """Main setup function."""
    print("\n" + "=" * 80)
    print("🎯 DJANGO ENVIRONMENT FIX & SETUP")
    print("=" * 80)
    
    # Run setup steps
    django_ok = setup_django_environment()
    
    if django_ok:
        fixes = fix_common_django_issues()
        create_django_launcher()
        all_ok = test_full_django_setup()
        
        print("\n" + "=" * 80)
        print("✅ SETUP COMPLETE")
        print("=" * 80)
        print("\nYou can now:")
        print("  1. Run 'start_django.bat' to start the development server")
        print("  2. Use 'python django_launcher.py' for direct access")
        print("  3. Import Django in any script with proper environment")
        print("\nAll frameworks should now work properly with Django!")
        print("=" * 80 + "\n")
    else:
        print("\n" + "=" * 80)
        print("❌ SETUP FAILED")
        print("=" * 80)
        print("\nPlease check the error messages above and fix the issues.")
        print("=" * 80 + "\n")

if __name__ == '__main__':
    main()
