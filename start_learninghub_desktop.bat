@echo off
title LearningHub Desktop Launcher
echo ========================================================
echo Launching LearningHub React Desktop Application (Electron)
echo ========================================================
start "LearningHub Backend (Port 5000)" /min cmd /c "cd /d C:\Users\shiva\Desktop\windows_app\learninghub\backend && npm run dev"
start "LearningHub Web Server (Port 3000)" /min cmd /c "cd /d C:\Users\shiva\Desktop\windows_app\learninghub && npm run dev"

echo Waiting for services to initialize...
timeout /t 4 >nul

echo Starting Native Windows Desktop UI...
cd /d C:\Users\shiva\Desktop\windows_app\learninghub && npm run desktop

