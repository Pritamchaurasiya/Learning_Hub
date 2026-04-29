@echo off
echo ========================================
echo  Learning Hub - Quick Start Script
echo ========================================
echo.

echo [1/2] Starting Django Backend...
start "Django Server" cmd /k "cd /d c:\Users\shiva\Desktop\windows_app\conductor && python manage.py runserver"

timeout /t 3 /nobreak >nul

echo [2/2] Opening website in browser...
start http://127.0.0.1:8000

echo.
echo ========================================
echo  Server running at http://127.0.0.1:8000
echo  Press any key to close this window...
echo ========================================
pause >nul
