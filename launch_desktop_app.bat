@echo off
title LearningHub - Native Windows Desktop Application
setlocal enabledelayedexpansion

echo ========================================================
echo       LEARNINGHUB - UNIFIED DESKTOP PLATFORM (PWA/APP)
echo       Frontend : React 18 + TypeScript (Port 3000)
echo       API Hub  : Node.js Express 5 Engine (Port 5000)
echo       Conductor: Django 5 ML Monolith (Port 8000)
echo       Client   : Windows Native Standalone App Window
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

:: Step 2: Check Python
set VENV_PYTHON=%~dp0conductor\venv\Scripts\python.exe
if not exist "%VENV_PYTHON%" (
    echo [WARN] conductor/venv not found, falling back to system python...
    set VENV_PYTHON=python
)

:: Step 3: Launch Express API Server (:5000)
echo [1/3] Starting Express API Server (:5000)...
start "LearningHub Express API (:5000)" cmd /k "cd /d %~dp0learninghub\backend && npm run dev"

:: Step 4: Launch Django Conductor Engine (:8000)
echo [2/3] Starting Django Conductor Engine (:8000)...
start "LearningHub Django Conductor (:8000)" cmd /k "cd /d %~dp0conductor && "%VENV_PYTHON%" manage.py runserver 127.0.0.1:8000"

:: Step 5: Launch React Frontend (:3000)
echo [3/3] Starting React + TypeScript Frontend (:3000)...
start "LearningHub React Frontend (:3000)" cmd /k "cd /d %~dp0learninghub && npm run dev"

:: Wait 3 seconds for server initialization
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

:: Step 6: Launch Dedicated Windows App Window (Edge / Chrome App Mode)
echo Launching LearningHub in Native Desktop Window Mode...
set BROWSER_APP=
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set BROWSER_APP="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set BROWSER_APP="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set BROWSER_APP="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set BROWSER_APP="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

if defined BROWSER_APP (
    start "" %BROWSER_APP% --app=http://localhost:3000 --window-size=1440,900 --user-data-dir="%LOCALAPPDATA%\LearningHub\AppProfile"
) else (
    start http://localhost:3000
)

echo.
echo ========================================================
echo   LearningHub Windows App is Online!
echo   Frontend : http://localhost:3000
echo   API Hub  : http://127.0.0.1:5000/api/v1
echo   Conductor: http://127.0.0.1:8000
echo ========================================================
echo.
pause
