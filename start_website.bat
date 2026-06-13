@echo off
title Learning Hub - Website
setlocal enabledelayedexpansion

echo ========================================
echo    Learning Hub - Quick Start
echo ========================================
echo.

:: Check if venv exists
if not exist "conductor\venv\Scripts\python.exe" (
    echo [FAIL] Virtual environment not found at conductor\venv\
    echo Please create one: python -m venv conductor\venv
    pause
    exit /b 1
)

:: Check if .env exists
if not exist "conductor\.env" (
    echo [WARN] .env file not found. Creating from .env.example...
    if exist "conductor\.env.example" (
        copy "conductor\.env.example" "conductor\.env"
    ) else (
        echo [FAIL] No .env file or .env.example found.
        pause
        exit /b 1
    )
)

:: Install dependencies
echo [1/4] Installing Python dependencies...
call conductor\venv\Scripts\pip.exe install -q -r conductor\requirements\base.txt
if errorlevel 1 echo [WARN] pip install reported errors & pause & exit /b 1

:: Run migrations
echo [2/4] Running database migrations...
call conductor\venv\Scripts\python.exe conductor\manage.py migrate
if errorlevel 1 echo [FAIL] Migrations failed & pause & exit /b 1

:: Collect static files
echo [3/4] Collecting static files...
call conductor\venv\Scripts\python.exe conductor\manage.py collectstatic --noinput
if errorlevel 1 echo [WARN] collectstatic reported errors

:: Start server
echo [4/4] Starting Django Development Server...
echo.
echo ========================================
echo    Server: http://127.0.0.1:8000
echo    Press Ctrl+C to stop
echo ========================================
echo.

start http://127.0.0.1:8000
call conductor\venv\Scripts\python.exe conductor\manage.py runserver 0.0.0.0:8000

pause
