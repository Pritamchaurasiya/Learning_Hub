@echo off
echo ==========================================
echo   FIXING WINDOWS BUILD ENVIRONMENT
echo ==========================================

echo [STEP 1] Setting up Visual Studio Environment...
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to load vcvars64.bat
    exit /b %errorlevel%
)

echo.
echo [STEP 2] Verifying Compiler...
where cl.exe
if %errorlevel% neq 0 (
    echo [ERROR] cl.exe NOT found in PATH
    exit /b %errorlevel%
)
echo [SUCCESS] cl.exe found!

echo.
echo [STEP 3] Cleaning Project...
if exist build rmdir /s /q build
if exist .dart_tool rmdir /s /q .dart_tool
call flutter clean
call flutter pub get

echo.
echo [STEP 4] Building Windows Release...
echo This uses the ACTIVE environment with cl.exe...
call flutter build windows --release

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Build Completed Successfully!
    echo Artifact: build\windows\runner\Release\windows_app.exe
) else (
    echo.
    echo [FAILURE] Build Failed. See output above.
)
