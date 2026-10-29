@echo off
setlocal enabledelayedexpansion

title GOD MODE ACTIVATED - Learning Hub Enterprise

echo ========================================================
echo        LEARNING HUB - GOD MODE UNIFIED LAUNCHER
echo        Frontend : React 18 + TypeScript (Port 3000)
echo        API Hub  : Express API Gateway (Port 5000)
echo        Conductor: Django 5 ML Monolith (Port 8000)
echo ========================================================
echo.
echo [1/5] Checking Environment...

:: Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)
echo [OK] Node.js detected.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)
echo [OK] Python detected.

echo.
echo [2/5] Initializing Backend (Conductor)...
cd conductor
if not exist "venv" (
    echo [INFO] Creating Virtual Environment...
    python -m venv venv
)
call venv\Scripts\activate
if exist "requirements\local.txt" (
    pip install -r requirements\local.txt >nul 2>&1
) else if exist "requirements.txt" (
    pip install -r requirements.txt >nul 2>&1
)
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
echo [4/5] Launching Supervisor Services...
start "Express API Gateway (:5000)" cmd /k "cd /d %~dp0learninghub\backend && npm run dev"
start "Django API Monolith (:8000)" cmd /k "cd /d %~dp0conductor && venv\Scripts\activate && python manage.py runserver 0.0.0.0:8000"
start "Celery AI Worker" cmd /k "cd /d %~dp0conductor && venv\Scripts\activate && celery -A config worker --pool=solo -l info"

echo [OK] Backend services started.

echo.
echo [5/5] Launching Frontend (React 18 + Vite)...
start "React Frontend (:3000)" cmd /k "cd /d %~dp0learninghub && npm run dev"

timeout /t 3 /nobreak >nul

:: Launch Desktop App Mode
set BROWSER_APP=
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set BROWSER_APP="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set BROWSER_APP="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set BROWSER_APP="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
)

if defined BROWSER_APP (
    start "" %BROWSER_APP% --app=http://localhost:3000 --window-size=1440,900
) else (
    start http://localhost:3000
)

echo.
echo ========================================================
echo    SYSTEM ONLINE. UNIFIED FULL-STACK PLATFORM RUNNING.
echo    Frontend : http://localhost:3000
echo    API Hub  : http://localhost:5000/api/v1
echo    Conductor: http://localhost:8000/admin/
echo ========================================================
echo.
pause
