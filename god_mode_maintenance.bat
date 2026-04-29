@echo off
echo ========================================================
echo       GOD MODE MAINTENANCE SCRIPT v1.0
echo ========================================================
echo.

echo [1/4] Fixing Frontend Lints...
cd my_flutter_app
call dart fix --apply
if %ERRORLEVEL% NEQ 0 (
    echo [!] Frontend fix failed or found issues.
) else (
    echo [OK] Frontend code polished.
)

echo.
echo [2/4] Analyzing Frontend Health...
call flutter analyze
cd ..

echo.
echo [3/4] Running Backend Tests...
cd conductor
call venv\Scripts\python -m pytest
if %ERRORLEVEL% NEQ 0 (
    echo [!] Backend tests have failures. Check logs.
) else (
    echo [OK] Backend Logic Verified.
)
cd ..

echo.
echo [4/4] System Check Complete.
echo ========================================================
pause
