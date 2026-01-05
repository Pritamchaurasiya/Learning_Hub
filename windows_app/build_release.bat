@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" x64
set PATH=%PATH%;C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin
echo CMAKE check:
where cmake
echo CL check:
where cl
cd /d "c:\Users\shiva\Desktop\windows_app\windows_app"
flutter build windows --release
