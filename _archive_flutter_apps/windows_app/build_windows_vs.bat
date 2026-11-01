@echo off
setlocal
cd /d "c:\Users\shiva\Desktop\windows_app\windows_app"

echo === Setting up VS 2022 x64 Environment ===
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" x64

echo === Verifying CL.EXE ===
where cl.exe

echo === Running Flutter Build ===
flutter build windows --release --verbose

echo === Done ===
echo Exit Code: %ERRORLEVEL%
