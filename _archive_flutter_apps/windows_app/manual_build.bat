@echo off
echo ==========================================
echo   MANUAL WINDOWS BUILD (BYPASSING FLUTTER TOOL)
echo ==========================================

echo [STEP 1] Setting up Visual Studio Environment...
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat"

echo.
echo [STEP 2] Adding NuGet to PATH...
set "PATH=%~dp0;%PATH%"

echo.
echo [STEP 3] Cleaning Build Directory...
if exist build\windows rmdir /s /q build\windows
if exist windows\flutter\ephemeral rmdir /s /q windows\flutter\ephemeral

echo.
echo [STEP 4] Restoring Dependencies...
call flutter pub get

echo.
echo [STEP 5] Generating Flutter Ephemeral Files (Backend Tool)...
set "FLUTTER_ROOT=C:\src\flutter"
set "PROJECT_DIR=%cd%"
call "%FLUTTER_ROOT%\packages\flutter_tools\bin\tool_backend.bat" windows-x64 Release

echo.
echo [STEP 6] Restoring Plugin Symlinks (PowerShell Fix)...
powershell -ExecutionPolicy Bypass -File fix_plugins.ps1
if %errorlevel% neq 0 (
    echo [ERROR] Plugin Fix Failed.
    exit /b %errorlevel%
)

echo.
echo [STEP 7] Forcing Config File...
set "EPHEMERAL=windows\flutter\ephemeral"
if not exist "%EPHEMERAL%" mkdir "%EPHEMERAL%"
echo file(TO_CMAKE_PATH "C:/src/flutter" FLUTTER_ROOT) > "%EPHEMERAL%\generated_config.cmake"
echo file(TO_CMAKE_PATH "%PROJECT_DIR:\=/%" PROJECT_DIR) >> "%EPHEMERAL%\generated_config.cmake"
echo set(FLUTTER_VERSION "3.27.1") >> "%EPHEMERAL%\generated_config.cmake"
echo set(FLUTTER_TARGET_PLATFORM "windows-x64") >> "%EPHEMERAL%\generated_config.cmake"
echo set(FLUTTER_BUILD_MODE "Release") >> "%EPHEMERAL%\generated_config.cmake"

echo.
echo [STEP 8] Configuring CMake (Ninja + Release)...
cmake -G "Ninja" -DCMAKE_BUILD_TYPE=Release -S windows -B build/windows
if %errorlevel% neq 0 (
    echo [ERROR] CMake Configuration Failed.
    if exist build\windows\CMakeFiles\CMakeOutput.log type build\windows\CMakeFiles\CMakeOutput.log
    exit /b %errorlevel%
)

echo.
echo [STEP 9] Building with CMake...
cmake --build build/windows --config Release
if %errorlevel% neq 0 (
    echo [ERROR] Build Failed.
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo   SUCCESS! APP BUILT.
echo ==========================================
echo Location: build\windows\runner\Release\windows_app.exe
