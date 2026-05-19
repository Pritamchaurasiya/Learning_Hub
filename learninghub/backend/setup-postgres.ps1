# PostgreSQL Setup Script for LearningHub
# Run this script in PowerShell as Administrator

$ErrorActionPreference = "Stop"

Write-Host "=== LearningHub PostgreSQL Setup ===" -ForegroundColor Cyan

# Configuration
$PG_BIN = "C:\Program Files\PostgreSQL\18\bin"
$PG_DATA = "C:\Program Files\PostgreSQL\18\data"
$DB_NAME = "learninghub"
$DB_USER = "postgres"

# Check if PostgreSQL is installed
if (-not (Test-Path $PG_BIN)) {
    Write-Host "ERROR: PostgreSQL 18 not found at $PG_BIN" -ForegroundColor Red
    Write-Host "Please install PostgreSQL 18 from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "PostgreSQL 18 found at $PG_BIN" -ForegroundColor Green

# Check if service is running
$service = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host "PostgreSQL service is running" -ForegroundColor Green
} else {
    Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service -Name "postgresql-x64-18"
    Start-Sleep -Seconds 3
}

# Prompt for password
Write-Host ""
Write-Host "Please enter your PostgreSQL 'postgres' user password:" -ForegroundColor Yellow
$securePassword = Read-Host -AsSecurePassword
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$PG_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Set environment variable for psql
$env:PGPASSWORD = $PG_PASSWORD

# Test connection
Write-Host "Testing connection..." -ForegroundColor Yellow
try {
    $result = & "$PG_BIN\psql.exe" -U $DB_USER -h localhost -c "SELECT 1 as test;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Connection successful!" -ForegroundColor Green
    } else {
        Write-Host "Connection failed. Please check your password." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Connection failed: $_" -ForegroundColor Red
    exit 1
}

# Create database
Write-Host "Creating database '$DB_NAME'..." -ForegroundColor Yellow
try {
    & "$PG_BIN\psql.exe" -U $DB_USER -h localhost -c "CREATE DATABASE $DB_NAME;" 2>&1
    Write-Host "Database created successfully!" -ForegroundColor Green
} catch {
    Write-Host "Database might already exist: $_" -ForegroundColor Yellow
}

# Update .env file
$envPath = Join-Path $PSScriptRoot ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $envContent = $envContent -replace "YOUR_PASSWORD", $PG_PASSWORD
    Set-Content $envPath $envContent
    Write-Host ".env file updated with password" -ForegroundColor Green
}

# Run Prisma migration
Write-Host "Running Prisma migration..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npx prisma migrate dev --name learninghub_v2_expansion

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "You can now start the backend server with: npm run dev" -ForegroundColor Green
