# Launch Script for LearningHub Production Platform
# Usage: Right-click -> Run with PowerShell

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   LEARNINGHUB - SYSTEM LAUNCHER" -ForegroundColor Green
Write-Host "   Frontend: React + TypeScript (Vite)" -ForegroundColor Green
Write-Host "   Backend : Django + DRF + Daphne" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$EXPRESS_DIR = Join-Path $ROOT_DIR "learninghub\backend"
$CONDUCTOR_DIR = Join-Path $ROOT_DIR "conductor"
$FRONTEND_DIR = Join-Path $ROOT_DIR "learninghub"

# 1. Check venv Python
$VENV_PYTHON = Join-Path $CONDUCTOR_DIR "venv\Scripts\python.exe"
if (-not (Test-Path $VENV_PYTHON)) {
    Write-Host "[WARN] conductor/venv not found, falling back to python" -ForegroundColor Yellow
    $VENV_PYTHON = "python"
}

# 2. Start Express API Server (:5000)
Write-Host "`n[1/3] Starting Express API Server (:5000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$EXPRESS_DIR'; npm run dev"

# 3. Start Django Conductor Backend (:8000)
Write-Host "`n[2/3] Starting Django Conductor Backend (:8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$CONDUCTOR_DIR'; & '$VENV_PYTHON' manage.py runserver 127.0.0.1:8000"

# 4. Start React + TypeScript Frontend (:3000)
Write-Host "`n[3/3] Starting React + TypeScript Frontend (:3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FRONTEND_DIR'; npm run dev"

# 5. Open browser
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "   System Launched Successfully!" -ForegroundColor Green
Write-Host "   Frontend : http://localhost:3000" -ForegroundColor Green
Write-Host "   API Hub  : http://127.0.0.1:5000/api/v1" -ForegroundColor Green
Write-Host "   Health   : http://127.0.0.1:5000/api/v1/health" -ForegroundColor Green
Write-Host "   Conductor: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
