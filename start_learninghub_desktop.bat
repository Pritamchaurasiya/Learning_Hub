@echo off
setlocal
title LearningHub Desktop Launcher
echo ========================================================
echo  LearningHub Enterprise Native Windows Desktop Application
echo ========================================================
echo.

set APP_DIR=%~dp0learninghub
set EXE_PATH=%APP_DIR%\release-desktop\win-unpacked\LearningHub.exe

if not exist "%EXE_PATH%" (
    echo [INFO] Packaged executable not found, compiling desktop build...
    cd /d "%APP_DIR%" && npm run desktop:pack
)

echo [1/2] Starting LearningHub Backend Engine (Port 5000)...
start "LearningHub Backend" /min cmd /c "cd /d "%APP_DIR%\backend" && npm run dev"

echo [2/2] Launching Native Windows Desktop Client...
start "" "%EXE_PATH%"

echo.
echo ========================================================
echo  LearningHub Desktop is now running!
echo  Backend:  http://localhost:5000
echo  Frontend: Native Windows App (Chromium + React 18)
echo ========================================================
endlocal
