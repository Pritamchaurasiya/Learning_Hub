# OpenCode CLI Setup Script for Windows
# Run this script to configure OpenCode CLI

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  OpenCode CLI Setup for LearningHub" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if opencode is installed
try {
    $version = opencode --version 2>&1
    Write-Host "✅ OpenCode CLI installed: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ OpenCode CLI not found" -ForegroundColor Red
    Write-Host "Installing via npm..."
    npm install -g opencode-ai
}

Write-Host ""
Write-Host "Current auth status:" -ForegroundColor Yellow
opencode auth list

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Provider Configuration Options" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. OpenAI (GPT-4, GPT-3.5)" -ForegroundColor White
Write-Host "   Get key: https://platform.openai.com/api-keys" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Anthropic (Claude 3 Opus/Sonnet)" -ForegroundColor White
Write-Host "   Get key: https://console.anthropic.com/" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Google (Gemini Pro)" -ForegroundColor White
Write-Host "   Get key: https://aistudio.google.com/app/apikey" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Ollama (Local - Free)" -ForegroundColor White
Write-Host "   Download: https://ollama.ai/" -ForegroundColor Gray
Write-Host ""

# Check for .env file
$envPath = "c:\Users\shiva\Desktop\windows_app\learninghub\.env"
if (Test-Path $envPath) {
    Write-Host "✅ Found .env file" -ForegroundColor Green
    $envContent = Get-Content $envPath -Raw
    
    if ($envContent -match "OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY") {
        Write-Host "✅ API keys found in .env" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No API keys found in .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    
    # Create .env template
    $envTemplate = @"
# OpenCode AI Provider Configuration
# Uncomment and add your API keys

# Option 1: OpenAI
# OPENAI_API_KEY=sk-your-key-here

# Option 2: Anthropic (Claude)
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Option 3: Google Gemini
# GEMINI_API_KEY=AIza-your-key-here

# Option 4: Ollama (Local)
# OLLAMA_HOST=http://localhost:11434
"@
    
    $createEnv = Read-Host "Create .env template? (y/n)"
    if ($createEnv -eq "y") {
        $envTemplate | Out-File -FilePath $envPath -Encoding UTF8
        Write-Host "✅ Created .env template" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Quick Start Commands" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "# Login to provider" -ForegroundColor Yellow
Write-Host "opencode auth login"
Write-Host ""
Write-Host "# Start TUI mode" -ForegroundColor Yellow
Write-Host "opencode serve"
Write-Host ""
Write-Host "# Start web interface" -ForegroundColor Yellow
Write-Host "opencode web --port 3000"
Write-Host ""
Write-Host "# List available models" -ForegroundColor Yellow
Write-Host "opencode models list"
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
