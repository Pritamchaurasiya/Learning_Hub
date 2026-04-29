@echo off
REM Production Deployment Script for Windows

echo ========================================
echo Learning Hub - Production Deployment
echo ========================================

REM Check prerequisites
echo Checking prerequisites...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found
    exit /b 1
)

echo [OK] Python found

REM Install dependencies
echo Installing dependencies...
pip install -r requirements/production.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)

REM Run migrations
echo Running database migrations...
python manage.py migrate --settings=config.settings.production
if errorlevel 1 (
    echo ERROR: Migration failed
    exit /b 1
)

REM Collect static files
echo Collecting static files...
python manage.py collectstatic --noinput --settings=config.settings.production
if errorlevel 1 (
    echo ERROR: Static collection failed
    exit /b 1
)

REM Run system checks
echo Running system checks...
python manage.py check --deploy --settings=config.settings.production
if errorlevel 1 (
    echo WARNING: System checks found issues
)

echo ========================================
echo Deployment Preparation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Configure environment variables in .env
echo 2. Set up PostgreSQL database
echo 3. Configure Redis cache
echo 4. Start the server: python manage.py runserver --settings=config.settings.production
echo.
pause
