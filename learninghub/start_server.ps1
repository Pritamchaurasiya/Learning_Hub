$ErrorActionPreference = "Continue"
$python = "C:\Users\shiva\Desktop\windows_app\conductor\venv\Scripts\python.exe"
$manage = "C:\Users\shiva\Desktop\windows_app\conductor\manage.py"

function Start-DjangoServer {
    param([string]$Port = "5000")
    $proc = Start-Process -FilePath $python -ArgumentList $manage, "runserver", $Port -PassThru -NoNewWindow
    Write-Host "Started Django on port $Port with PID: $($proc.Id)"
    return $proc
}

Start-DjangoServer -Port 5000