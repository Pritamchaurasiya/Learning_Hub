# Launch Script for LearningHub Native Windows Desktop Application
# Usage: Right-click -> Run with PowerShell

Write-Host "========================================================" -ForegroundColor Green
Write-Host "   LEARNINGHUB - UNIFIED DESKTOP PLATFORM (PWA/APP)" -ForegroundColor Green
Write-Host "   Frontend : React 18 + TypeScript (Port 3000)" -ForegroundColor Green
Write-Host "   API Hub  : Node.js Express 5 Engine (Port 5000)" -ForegroundColor Green
Write-Host "   Conductor: Django 5 ML Monolith (Port 8000)" -ForegroundColor Green
Write-Host "   Client   : Windows Native Standalone App Window" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$EXPRESS_DIR = Join-Path $ROOT_DIR "learninghub\backend"
$CONDUCTOR_DIR = Join-Path $ROOT_DIR "conductor"
$FRONTEND_DIR = Join-Path $ROOT_DIR "learninghub"

# 1. Resolve Python
$VENV_PYTHON = Join-Path $CONDUCTOR_DIR "venv\Scripts\python.exe"
if (-not (Test-Path $VENV_PYTHON)) {
    Write-Host "[WARN] conductor/venv not found, falling back to python" -ForegroundColor Yellow
    $VENV_PYTHON = "python"
}

# 2. Start Express API Server (:5000)
Write-Host "`n[1/3] Starting Express API Server (:5000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$EXPRESS_DIR'; npm run dev"

# 3. Start Django Conductor Engine (:8000)
Write-Host "`n[2/3] Starting Django Conductor Engine (:8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$CONDUCTOR_DIR'; & '$VENV_PYTHON' manage.py runserver 127.0.0.1:8000"

# 4. Start React Frontend (:3000)
Write-Host "`n[3/3] Starting React + TypeScript Frontend (:3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FRONTEND_DIR'; npm run dev"

# 5. Launch Desktop Standalone App Mode
Write-Host "`nWaiting for local servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$EDGE_PATH_X86 = "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe"
$EDGE_PATH = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
$CHROME_PATH = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$CHROME_PATH_X86 = "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"

$BROWSER_EXE = $null
if (Test-Path $EDGE_PATH_X86) { $BROWSER_EXE = $EDGE_PATH_X86 }
elseif (Test-Path $EDGE_PATH) { $BROWSER_EXE = $EDGE_PATH }
elseif (Test-Path $CHROME_PATH) { $BROWSER_EXE = $CHROME_PATH }
elseif (Test-Path $CHROME_PATH_X86) { $BROWSER_EXE = $CHROME_PATH_X86 }

$APP_DATA_DIR = "$env:LOCALAPPDATA\LearningHub\AppProfile"

if ($BROWSER_EXE) {
    Write-Host "Launching in Native Desktop Window Mode via $BROWSER_EXE..." -ForegroundColor Green
    Start-Process $BROWSER_EXE -ArgumentList "--app=http://localhost:3000", "--window-size=1440,900", "--user-data-dir=`"$APP_DATA_DIR`""
} else {
    Write-Host "Opening in default browser..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "   LearningHub Desktop App Launched Successfully!" -ForegroundColor Green
Write-Host "   Frontend : http://localhost:3000" -ForegroundColor Green
Write-Host "   API Hub  : http://127.0.0.1:5000/api/v1" -ForegroundColor Green
Write-Host "   Conductor: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
