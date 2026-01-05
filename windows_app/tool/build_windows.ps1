<#
.SYNOPSIS
    Automated Build Script for LearningHub Windows Release (God-Tier)

.DESCRIPTION
    Handles cleaning, testing, building (AOT + Obfuscation), and packaging the Windows executable.
    
.PARAMETER Clean
    If set, runs 'flutter clean' before building.

.PARAMETER Obfuscate
    If set, enables obfuscation and debug info splitting (Recommended for Prod).

.PARAMETER Compress
    If set, zips the final Release folder for distribution.

.EXAMPLE
    .\tool\build_windows.ps1 -Clean -Obfuscate -Compress
#>

param (
    [switch]$Clean,
    [switch]$Obfuscate,
    [switch]$Compress,
    [switch]$Test
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n[GOD-MODE BUILD] $Message" -ForegroundColor Cyan
}

try {
    $ScriptDir = Split-Path $MyInvocation.MyCommand.Path
    $ProjectRoot = (Resolve-Path "$ScriptDir\..").Path
    Set-Location $ProjectRoot

    Write-Step "Initializing Build Process..."
    flutter --version

    if ($Clean) {
        Write-Step "Cleaning Project..."
        flutter clean
        flutter pub get
    }

    if ($Test) {
        Write-Step "Running Tests..."
        flutter test
        if ($LASTEXITCODE -ne 0) { throw "Tests failed! Aborting build." }
    }

    $BuildArgs = @("build", "windows", "--release")

    if ($Obfuscate) {
        Write-Step "Enabled: Obfuscation & Split Debug Info"
        $SymbolPath = "$ProjectRoot\build\app\outputs\symbols"
        if (-not (Test-Path $SymbolPath)) { New-Item -ItemType Directory -Force -Path $SymbolPath | Out-Null }
        
        $BuildArgs += "--obfuscate"
        $BuildArgs += "--split-debug-info=$SymbolPath"
    }

    Write-Step "Building Windows Release (AOT)..."
    Write-Host "Command: flutter $BuildArgs" -ForegroundColor Gray
    
    # Execute Flutter Build
    & flutter $BuildArgs
    if ($LASTEXITCODE -ne 0) { throw "Flutter build failed!" }

    Write-Step "Build Successful!"
    
    $ReleaseDir = "$ProjectRoot\build\windows\x64\runner\Release"

    if ($Compress) {
        Write-Step "Compressing Artifacts..."
        $ZipPath = "$ProjectRoot\build\windows\LearningHub_Windows_Release.zip"
        if (Test-Path $ZipPath) { Remove-Item $ZipPath }
        
        Compress-Archive -Path "$ReleaseDir\*" -DestinationPath $ZipPath
        Write-Host "Artifact available at: $ZipPath" -ForegroundColor Green
    } else {
        Write-Host "Artifacts available at: $ReleaseDir" -ForegroundColor Green
    }

} catch {
    Write-Host "`n[BUILD FAILED]: $_" -ForegroundColor Red
    exit 1
}
