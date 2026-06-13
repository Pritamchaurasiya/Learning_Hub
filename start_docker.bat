@echo off
title Learning Hub - Docker Launcher
echo ========================================
echo    Learning Hub - Docker Setup
echo ========================================
echo.

:: Check if .env.prod exists
if not exist ".env.prod" (
    echo [WARN] .env.prod not found. Create it from .env.prod.example or configure manually.
)

:: Build and start services
echo [1/3] Building Docker images...
docker compose build

echo [2/3] Starting services...
docker compose up -d

echo [3/3] Waiting for backend to be ready (up to 60s)...
set retries=0
:wait
timeout /t 5 /nobreak >nul
curl -s http://127.0.0.1:8000/health/ >nul 2>&1
if errorlevel 1 (
    set /a retries+=1
    if !retries! lss 12 goto wait
    echo [WARN] Backend health check timed out after 60s
)

echo.
echo ========================================
echo    Server: http://127.0.0.1
echo    API:    http://127.0.0.1:8000/api/v1/
echo    Admin:  http://127.0.0.1:8000/admin/
echo ========================================
echo.
echo Commands:
echo   docker compose logs -f   (view logs)
echo   docker compose down      (stop services)
echo.

start http://127.0.0.1
pause
