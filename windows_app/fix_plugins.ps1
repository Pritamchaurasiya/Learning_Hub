$ConfirmPreference = 'None'
$ErrorActionPreference = 'Stop'

$jsonPath = ".\.flutter-plugins-dependencies"
if (-not (Test-Path $jsonPath)) {
    Write-Error "File not found: $jsonPath. Please run 'flutter pub get' first."
    exit 1
}

try {
    $json = Get-Content $jsonPath | ConvertFrom-Json
} catch {
    Write-Error "Failed to parse JSON: $_"
    exit 1
}

$plugins = $json.plugins.windows
$targetDir = "windows\flutter\ephemeral\.plugin_symlinks"

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
}

foreach ($plugin in $plugins) {
    if ($null -eq $plugin) { continue }
    
    $name = $plugin.name
    $path = $plugin.path
    
    if ([string]::IsNullOrWhiteSpace($path)) {
        Write-Warning "Skipping $name (No path)"
        continue
    }

    $linkPath = Join-Path $targetDir $name
    
    # Ensure linkPath doesn't exist
    if (Test-Path $linkPath) {
        $item = Get-Item $linkPath
        if ($item.Attributes -match "ReparsePoint") {
            Remove-Item $linkPath -Force -Confirm:$false
        } else {
             Remove-Item $linkPath -Force -Recurse -Confirm:$false
        }
    }

    Write-Host "Linking $name -> $path"
    
    # Use CMD mklink /J
    $cmd = "mklink /J ""$linkPath"" ""$path"""
    cmd /c $cmd > $null
    
    if (-not (Test-Path $linkPath)) {
        Write-Error "Failed to link $name"
    }
}
Write-Host "Plugin Symlinks Restored."
