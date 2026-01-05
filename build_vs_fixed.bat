@echo off
set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\;%PATH%"
set "VSWHERE_PATH=C:\Program Files (x86)\Microsoft Visual Studio\Installer"
set "PATH=%VSWHERE_PATH%;%PATH%"

echo Environment PATH sanitized and vswhere added.
echo Initializing Visual Studio environment...
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" amd64

if %errorlevel% neq 0 (
    echo Error initializing VS environment.
    exit /b %errorlevel%
)

cd /d c:\Users\shiva\Desktop\windows_app\windows_app

echo Cleaning previous build...
call flutter clean

echo Getting dependencies...
call flutter pub get


echo Dependencies installed.

echo Setting CMake Generator to Ninja...
set "CMAKE_GENERATOR=Ninja"

echo Building Windows Release...
call flutter build windows --release

if %errorlevel% neq 0 (
    echo Build FAILED.
    exit /b %errorlevel%
)

echo Build SUCCESSFUL.
