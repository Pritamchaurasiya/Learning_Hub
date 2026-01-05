@echo off
echo ==================================================
echo   FLUTTER BUILD WITH CMAKE TOOLCHAIN OVERRIDE
echo ==================================================

set "CMAKE_TOOLCHAIN_FILE=%~dp0toolchain.cmake"
echo [INFO] CMAKE_TOOLCHAIN_FILE=%CMAKE_TOOLCHAIN_FILE%

echo.
echo [STEP 1] Cleaning CMake Cache (build\windows)...
if exist build\windows rmdir /s /q build\windows

echo.
echo [STEP 2] Running Flutter Build...
flutter build windows --release --verbose
if %errorlevel% neq 0 (
    echo [ERROR] Build Failed.
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] Build Completed!
