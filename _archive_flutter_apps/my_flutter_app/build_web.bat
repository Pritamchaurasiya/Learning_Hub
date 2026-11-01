@echo off
echo ========================================
echo  Learning Hub - Quick Web Build Script
echo ========================================
echo.

cd /d "c:\Users\shiva\Desktop\windows_app\my_flutter_app"

echo [1/4] Cleaning previous builds...
rmdir /s /q build 2>nul
rmdir /s /q .dart_tool 2>nul

echo [2/4] Getting dependencies...
call flutter pub get

echo [3/4] Building optimized web release...
call flutter build web --release --web-renderer html --pwa-strategy offline-first

echo [4/4] Build complete!
echo.
echo ========================================
echo  SUCCESS! Open http://127.0.0.1:8000
echo ========================================
echo.
pause
