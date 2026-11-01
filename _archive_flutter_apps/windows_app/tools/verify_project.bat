@echo off
echo ========================================================
echo   LEARNING HUB - GOD TIER VERIFICATION PROTOCOL
echo ========================================================
echo.
echo [1/3] Running Static Analysis...
call flutter analyze
if %errorlevel% neq 0 (
    echo [!] Analysis Failed! Fix errors before proceeding.
    exit /b %errorlevel%
)

echo.
echo [2/3] Running Tests...
call flutter test
if %errorlevel% neq 0 (
    echo [!] Tests Failed!
    exit /b %errorlevel%
)

echo.
echo [3/3] Checking Web Build Capability...
call flutter build web --release --no-tree-shake-icons
if %errorlevel% neq 0 (
    echo [!] Web Build Failed!
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   ALL SYSTEMS GO. PROJECT STATUS: GOD TIER.
echo ========================================================
