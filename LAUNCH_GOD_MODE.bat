@echo off
setlocal enabledelayedexpansion

title GOD MODE ACTIVATED - Learning Hub

echo ========================================================
echo        LEARNING HUB - GOD MODE LAUNCHER 🚀
echo ========================================================
echo.
echo [1/5] Checking Environment...

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)
echo [OK] Python detected.

:: Check for Flutter (Optional but good)
call flutter --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Flutter not found. Web build might not update.
) else (
    echo [OK] Flutter detected.
)

echo.
echo [2/5] Initializing Backend (Conductor)...
cd conductor
if not exist "venv" (
    echo [INFO] Creating Virtual Environment...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt >nul 2>&1
echo [OK] Dependencies verified.

echo.
echo [3/5] Applying Database Migrations...
python manage.py migrate >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Database migration failed.
    pause
    exit /b 1
)
echo [OK] Database is in sync.

echo.
echo [4/5] Launching Supervisor...
:: We launch Django, Celery, and Daphne (if needed) here
:: For simplicity in BAT, we launch pure Django + Celery in new windows

start "Django API (God Mode)" cmd /k "venv\Scripts\activate && python manage.py runserver 0.0.0.0:8000"
start "Celery Worker" cmd /k "venv\Scripts\activate && celery -A config worker --pool=solo -l info"

echo [OK] Backend services started.

echo.
echo [5/5] Launching Frontend (Web)...
cd ..\windows_app
start "Flutter Web (God Mode)" cmd /k "flutter run -d chrome --web-renderer canvaskit --web-port 3000"

echo.
echo ========================================================
echo    SYSTEM ONLINE. WELCOME TO THE NEXT LEVEL.
echo    Backend: http://localhost:8000/god-admin/dashboard/
echo    Frontend: http://localhost:3000
echo ========================================================
echo.
pause
