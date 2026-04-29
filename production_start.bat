@echo off
echo ========================================
echo  Learning Hub - Production Launch
echo ========================================
echo.

echo [1/3] Building and Starting Docker Stack...
docker-compose -f docker-compose.prod.yml up -d --build

echo [2/3] Waiting for services to initialize...
timeout /t 10 /nobreak >nul

echo [3/3] Launching application...
start http://localhost

echo.
echo ========================================
echo  Application is running in production mode.
echo  Backend: http://localhost/api/
echo  Frontend: http://localhost/
echo.
echo  To stop: docker-compose -f docker-compose.prod.yml down
echo ========================================
pause
