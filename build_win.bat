@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" amd64
cd /d c:\Users\shiva\Desktop\windows_app\windows_app
flutter build windows --release
