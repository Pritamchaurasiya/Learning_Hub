@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" amd64
if %errorlevel% neq 0 exit /b %errorlevel%

REM Fix missing LIB paths
if not exist "C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64\libucrt.lib" (
    echo WARNING: 10.0.26100.0 UCRT lib not found. Checking 10.0.19041.0...
    if exist "C:\Program Files (x86)\Windows Kits\10\Lib\10.0.19041.0\ucrt\x64\libucrt.lib" (
        set "UCRT_PATH=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.19041.0\ucrt\x64"
        set "UM_PATH=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.19041.0\um\x64"
    ) else (
       echo ERROR: libucrt.lib not found in standard locations!
       exit /b 1
    )
) else (
    set "UCRT_PATH=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64"
    set "UM_PATH=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\um\x64"
)

echo Adding paths to LIB...
set "LIB=%LIB%;%UCRT_PATH%;%UM_PATH%"
echo LIB set to:
echo %LIB%

cd /d c:\Users\shiva\Desktop\windows_app\windows_app
echo Cleaning...
call flutter clean
echo Pub get...
call flutter pub get
echo Building...
call flutter build windows --release
