# LearningHub Quick Deployment Script
# Run this after Neon database is set up and Wrangler is logged in

Write-Host "🚀 LearningHub Deployment Script" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if in correct directory
if (-not (Test-Path "workers-backend")) {
    Write-Host "❌ Error: Run this script from the learninghub root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Check Wrangler login
Write-Host "`n📋 Step 1: Checking Cloudflare authentication..." -ForegroundColor Yellow
try {
    $whoami = npx wrangler whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not logged in. Running: npx wrangler login" -ForegroundColor Red
        npx wrangler login
    } else {
        Write-Host "✅ Already logged in to Cloudflare" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Please run: npx wrangler login" -ForegroundColor Yellow
}

# Step 2: Deploy Workers Backend
Write-Host "`n📦 Step 2: Deploying Workers backend..." -ForegroundColor Yellow
Set-Location workers-backend

try {
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    npm install --silent
    
    Write-Host "Building and deploying..." -ForegroundColor Gray
    $deployOutput = npx wrangler deploy --env production 2>&1
    
    # Extract URL from output
    if ($deployOutput -match "(https://[\w\-\.]+\.workers\.dev)") {
        $workersUrl = $matches[1]
        Write-Host "✅ Backend deployed to: $workersUrl" -ForegroundColor Green
        
        # Save URL for frontend
        $envContent = "VITE_API_URL=$workersUrl/api`nVITE_APP_URL=https://learninghub.app"
        Set-Content -Path "..\.env.production" -Value $envContent
        Write-Host "✅ Updated frontend .env.production" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Deployed but couldn't extract URL from output" -ForegroundColor Yellow
        Write-Host $deployOutput -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Backend deployment failed: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Step 3: Build Frontend
Write-Host "`n🏗️  Step 3: Building frontend..." -ForegroundColor Yellow

try {
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    npm install --silent
    
    Write-Host "Building for production..." -ForegroundColor Gray
    npm run build 2>&1 | Out-Null
    
    if (Test-Path "dist") {
        Write-Host "✅ Frontend built successfully (dist/ folder created)" -ForegroundColor Green
    } else {
        Write-Host "❌ Build failed - dist folder not found" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
} catch {
    Write-Host "❌ Frontend build failed: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Step 4: Summary
Write-Host "`n================================" -ForegroundColor Green
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "1. Deploy the dist/ folder to your hosting (Vercel, Netlify, etc.)" -ForegroundColor Cyan
Write-Host "2. Test the live application" -ForegroundColor Cyan
Write-Host "`nDemo accounts:" -ForegroundColor White
Write-Host "  Admin: admin@learninghub.com / admin123" -ForegroundColor Gray
Write-Host "  Student: student@learninghub.com / student123" -ForegroundColor Gray
