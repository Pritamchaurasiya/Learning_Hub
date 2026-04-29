
# Launch Script for Learning Hub
# Usage: Right-click -> Run with PowerShell

Write-Host "🚀 LEARNING HUB LAUNCHER" -ForegroundColor Green
Write-Host "--------------------------------"

# 1. Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd conductor; python manage.py migrate; python manage.py runserver 0.0.0.0:8000"

# 2. Wait for Backend
Write-Host "Waiting for Backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 3. Start Frontend (Web - Production Release)
Write-Host "Starting Frontend (Web)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd my_flutter_app; flutter run -d chrome --release --web-renderer html"

Write-Host "✅ System Launched!" -ForegroundColor Green
Write-Host "Backend: http://127.0.0.1:8000"
Write-Host "Frontend: Chrome Window"
