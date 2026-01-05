@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" amd64
if %errorlevel% neq 0 exit /b %errorlevel%

REM Fix missing LIB paths for SDK 10.0.26100.0 or fallback
if exist "C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64\libucrt.lib" (
    set "UCRT_PATH=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64"
    set "UM_PATH=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\um\x64"
) else (
    set "UCRT_PATH=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.19041.0\ucrt\x64"
    set "UM_PATH=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.19041.0\um\x64"
)
set "LIB=%LIB%;%UCRT_PATH%;%UM_PATH%"
echo Environment Setup Complete.

cd /d c:\Users\shiva\Desktop\windows_app\windows_app
rmdir /s /q build\windows
mkdir build\windows

echo Configuring with Ninja...
cmake -S windows -B build/windows -G Ninja -DCMAKE_BUILD_TYPE=Release
if %errorlevel% neq 0 (
    echo CMake Configuration Failed!
    exit /b 1
)

echo Building with Flutter...
flutter build windows --release --no-pub
