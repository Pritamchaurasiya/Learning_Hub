@echo off
title LearningHub - Production Full-Stack Platform
setlocal enabledelayedexpansion

echo ========================================================
echo       LEARNINGHUB - PRODUCTION FULL-STACK PLATFORM
echo       Frontend: React 18 + TypeScript (Vite :3000)
echo       API     : Node.js Express + 11 Domain Engines (:5000)
echo       Conductor: Django + DRF ML Engine (:8000)
echo ========================================================
echo.

cd /d "%~dp0"

:: Step 1: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [FAIL] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Step 2: Check Python Virtual Environment
set VENV_PYTHON=%~dp0conductor\venv\Scripts\python.exe
if not exist "%VENV_PYTHON%" (
    echo [WARN] conductor/venv not found, falling back to system python...
    set VENV_PYTHON=python
)

:: Step 3: Starting Node.js Express API Server (Port 5000)
echo [1/3] Starting Express API Server & 11 Intelligence Engines (:5000)...
start "LearningHub Express API (:5000)" cmd /k "cd /d %~dp0learninghub\backend && npm run dev"

:: Step 4: Starting Django Conductor Backend (Port 8000)
echo [2/3] Starting Django Conductor Backend (:8000)...
start "LearningHub Django Conductor (:8000)" cmd /k "cd /d %~dp0conductor && "%VENV_PYTHON%" manage.py runserver 127.0.0.1:8000"

:: Step 5: Starting React + TypeScript Frontend (Port 3000)
echo [3/3] Starting React + TypeScript Frontend (:3000)...
start "LearningHub React Frontend (:3000)" cmd /k "cd /d %~dp0learninghub && npm run dev"

:: Wait 3 seconds for servers to initialize
timeout /t 3 /nobreak >nul

:: Launch default web browser
echo.
echo ========================================================
echo   System Started Successfully!
echo   Frontend : http://localhost:3000
echo   API Hub  : http://127.0.0.1:5000/api/v1
echo   Health   : http://127.0.0.1:5000/api/v1/health
echo   Conductor: http://127.0.0.1:8000
echo ========================================================
echo.

start http://localhost:3000

echo LearningHub is running! Keep the terminal windows open.
pause
