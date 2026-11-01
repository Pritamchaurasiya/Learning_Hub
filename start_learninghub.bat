@echo off
title LearningHub Launcher
echo ========================================================
echo Launching LearningHub Services...
echo ========================================================
start "LearningHub Backend (Port 5000)" cmd /k "cd /d C:\Users\shiva\Desktop\windows_app\learninghub\backend && npm run dev"
start "LearningHub Frontend (Port 3000)" cmd /k "cd /d C:\Users\shiva\Desktop\windows_app\learninghub && npm run dev"
echo Services launched in separate windows!
timeout /t 5 >nul
start http://localhost:3000/auth

