@echo off
setlocal EnableDelayedExpansion

REM --- 1. Pathing and Environment Setup ---
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%windows_app"
set "NUGET_PATH=%SCRIPT_DIR%"

echo [INFO] Project directory: %PROJECT_DIR%
cd /d "%PROJECT_DIR%"

set "VSWHERE_PATH=C:\Program Files (x86)\Microsoft Visual Studio\Installer"
set "PATH=%VSWHERE_PATH%;%NUGET_PATH%;%PATH%"

echo [INFO] finding Visual Studio...
for /f "usebackq tokens=*" %%i in (`vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
  set "VS_PATH=%%i"
)

if not defined VS_PATH (
  echo [ERROR] Visual Studio not found!
  exit /b 1
)
echo [INFO] Found VS at: !VS_PATH!

echo [INFO] Initializing VC environment (x64)...
call "!VS_PATH!\VC\Auxiliary\Build\vcvarsall.bat" x64
if %errorlevel% neq 0 exit /b %errorlevel%

REM --- 2. Fix SDK LIB Paths ---
set "SDK_VER=10.0.26100.0"
set "KITS_ROOT=C:\Program Files (x86)\Windows Kits\10"
set "UCRT_LIB=!KITS_ROOT!\Lib\!SDK_VER!\ucrt\x64"
set "UM_LIB=!KITS_ROOT!\Lib\!SDK_VER!\um\x64"

if not exist "!UCRT_LIB!\libucrt.lib" (
    set "SDK_VER=10.0.19041.0"
    set "UCRT_LIB=!KITS_ROOT!\Lib\!SDK_VER!\ucrt\x64"
    set "UM_LIB=!KITS_ROOT!\Lib\!SDK_VER!\um\x64"
)
set "LIB=!LIB!;!UCRT_LIB!;!UM_LIB!"

REM --- 3. Repair Ephemeral Engine Artifacts ---
echo [INFO] Running flutter pub get...
call flutter pub get

echo [INFO] Repairing ephemeral engine artifacts...
set "FLUTTER_ENGINE_SRC=C:\src\flutter\bin\cache\artifacts\engine\windows-x64-release"
set "EPHEMERAL_DIR=windows\flutter\ephemeral"

if not exist "!EPHEMERAL_DIR!" mkdir "!EPHEMERAL_DIR!"

echo [INFO] Copying engine binaries...
copy /y "!FLUTTER_ENGINE_SRC!\flutter_windows.dll" "!EPHEMERAL_DIR!\"
copy /y "!FLUTTER_ENGINE_SRC!\flutter_windows.dll.lib" "!EPHEMERAL_DIR!\"
copy /y "!FLUTTER_ENGINE_SRC!\flutter_windows.dll.pdb" "!EPHEMERAL_DIR!\"

echo [INFO] Copying common engine artifacts...
set "FLUTTER_ENGINE_COMMON=C:\src\flutter\bin\cache\artifacts\engine\windows-x64"
copy /y "!FLUTTER_ENGINE_COMMON!\flutter_export.h" "!EPHEMERAL_DIR!\"
copy /y "!FLUTTER_ENGINE_COMMON!\flutter_messenger.h" "!EPHEMERAL_DIR!\"
copy /y "!FLUTTER_ENGINE_COMMON!\flutter_plugin_registrar.h" "!EPHEMERAL_DIR!\"
copy /y "!FLUTTER_ENGINE_COMMON!\flutter_windows.h" "!EPHEMERAL_DIR!\"
copy /y "!FLUTTER_ENGINE_COMMON!\icu_dt.dat" "!EPHEMERAL_DIR!\"

if not exist "!EPHEMERAL_DIR!\flutter_windows.dll.lib" (
    echo [ERROR] Critical engine file missing from ephemeral folder!
    exit /b 1
)

REM --- 4. Clean and Prepare Manual Build ---
echo [INFO] Preparing manual Ninja build directory...
if exist "build\windows" rmdir /s /q "build\windows"
mkdir "build\windows"

REM --- 5. Configure with CMake (Ninja) ---
echo [INFO] Checking for cl.exe...
where cl.exe
if %errorlevel% neq 0 (
    echo [WARN] cl.exe NOT found in PATH. Using hardcoded backup...
    set "CL_EXE_PATH=C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\cl.exe"
) else (
    for /f "usebackq tokens=*" %%i in (`where cl.exe`) do set "CL_EXE_PATH=%%i"
)

echo [INFO] Testing compiler health...
"!CL_EXE_PATH!" /help > compiler_health.txt 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Compiler health check failed! See compiler_health.txt
    exit /b 1
)
echo [INFO] Compiler health check passed.

echo [INFO] Using compiler: !CL_EXE_PATH!

echo [INFO] Configuring with CMake (Ninja)...
cmake -S windows -B build/windows -G Ninja ^
  -DCMAKE_BUILD_TYPE=Release ^
  -DCMAKE_CXX_COMPILER="!CL_EXE_PATH!" ^
  -DCMAKE_C_COMPILER="!CL_EXE_PATH!" ^
  -DFLUTTER_TARGET_PLATFORM=windows-x64

if %errorlevel% neq 0 (
    echo [ERROR] CMake configuration failed.
    exit /b %errorlevel%
)

REM --- 6. Build with Ninja ---
echo [INFO] Building with Ninja (Writing to ninja_output.txt)...
cd build\windows
ninja -v > ninja_output.txt 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ninja build failed. Last 20 lines of output:
    powershell -Command "Get-Content ninja_output.txt -Tail 20"
    exit /b %errorlevel%
)

echo [SUCCESS] Build completed successfully!
exit /b 0




