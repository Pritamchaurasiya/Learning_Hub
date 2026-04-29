@echo off
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
