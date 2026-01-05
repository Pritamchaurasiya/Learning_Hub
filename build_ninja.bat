@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" amd64
cd /d c:\Users\shiva\Desktop\windows_app\windows_app
echo Cleaning build...
rmdir /s /q build
mkdir build\windows
echo Configuring with Ninja...
cmake -S windows -B build/windows -G Ninja -DCMAKE_BUILD_TYPE=Release
if %errorlevel% neq 0 exit /b %errorlevel%
echo Building with Flutter...
flutter build windows --release --no-pub
