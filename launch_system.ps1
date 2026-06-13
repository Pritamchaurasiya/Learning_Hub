
# Launch Script for Learning Hub
# Usage: Right-click -> Run with PowerShell

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   LEARNING HUB - WEBSITE LAUNCHER" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BACKEND_DIR = Join-Path $ROOT_DIR "conductor"

# 1. Check venv
$VENV_PYTHON = Join-Path $BACKEND_DIR "venv" "Scripts" "python.exe"
if (-not (Test-Path $VENV_PYTHON)) {
    Write-Host "[FAIL] Virtual environment not found. Run: python -m venv conductor/venv" -ForegroundColor Red
    exit 1
}

# 2. Check .env
if (-not (Test-Path (Join-Path $BACKEND_DIR ".env"))) {
    Write-Host "[WARN] .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    $envExample = Join-Path $BACKEND_DIR ".env.example"
    $envFile = Join-Path $BACKEND_DIR ".env"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
    }
}

# 3. Backend
Write-Host "`n[1/3] Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$VENV_PYTHON' '$BACKEND_DIR/manage.py' migrate; if (`$LASTEXITCODE -ne 0) { Write-Host '[FAIL] Migrations failed' -ForegroundColor Red; exit }; & '$VENV_PYTHON' '$BACKEND_DIR/manage.py' runserver 0.0.0.0:8000"

Start-Sleep -Seconds 5

# 4. Copy Flutter web build if available
$FLUTTER_BUILD = Join-Path $ROOT_DIR "my_flutter_app" "build" "web"
$STATIC_FLUTTER = Join-Path $BACKEND_DIR "staticfiles" "flutter"
if (Test-Path $FLUTTER_BUILD) {
    Write-Host "[2/3] Deploying Flutter web build..." -ForegroundColor Cyan
    if (-not (Test-Path $STATIC_FLUTTER)) { New-Item -ItemType Directory -Path $STATIC_FLUTTER -Force | Out-Null }
    Copy-Item -Recurse -Force "$FLUTTER_BUILD/*" $STATIC_FLUTTER
    Write-Host "  -> Flutter web deployed to staticfiles/flutter" -ForegroundColor Green
} else {
    Write-Host "[SKIP] No Flutter web build found at $FLUTTER_BUILD" -ForegroundColor Yellow
}

# 5. Collect static files
Write-Host "[3/3] Collecting Django static files..." -ForegroundColor Cyan
& $VENV_PYTHON "$BACKEND_DIR/manage.py" collectstatic --noinput | Out-Null

# 6. Open browser
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "   System Launched!" -ForegroundColor Green
Write-Host "   Backend: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8000"
