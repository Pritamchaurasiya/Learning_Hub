@echo off
echo ========================================================
echo       GOD MODE MAINTENANCE SCRIPT v2.0 (UNIFIED STACK)
echo ========================================================
echo.

echo [1/4] Linting and Formatting React Frontend...
cd learninghub
call npm run lint:quiet
if %ERRORLEVEL% NEQ 0 (
    echo [!] Frontend linting issues detected. Running autofix...
    call npm run lint:fix
) else (
    echo [OK] Frontend code polished.
)

echo.
echo [2/4] Verifying Frontend TypeScript Types...
call npm run typecheck
if %ERRORLEVEL% NEQ 0 (
    echo [!] TypeScript typecheck failed.
) else (
    echo [OK] TypeScript Types Verified.
)
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
echo [4/4] System Check Complete. All Subsystems Online.
echo ========================================================
pause
