# Retry Deployment Guide

## Quick Retry Steps

### Step 1: Install Dependencies

```powershell
# Backend dependencies
cd C:\Users\shiva\Desktop\windows_app\learninghub\backend
npm install

# Workers dependencies
cd ..\workers-backend
npm install

# Frontend dependencies
cd ..\learninghub
npm install
```

### Step 2: Set Environment Variables

```powershell
cd ..\workers-backend

# Set DATABASE_URL (your Neon connection string)
npx wrangler secret put DATABASE_URL
# Enter: postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# Set JWT_SECRET (generate a random 32+ char string)
npx wrangler secret put JWT_SECRET
# Enter: your-super-secret-key-min-32-characters
```

### Step 3: Deploy Workers

```powershell
cd C:\Users\shiva\Desktop\windows_app\learninghub\workers-backend
npx wrangler deploy --env production
```

**Save the deployed URL** (e.g., `https://learninghub-api.xxx.workers.dev`)

### Step 4: Update Frontend Config

Edit `learninghub\.env.production`:

```env
VITE_API_URL=https://learninghub-api.xxx.workers.dev/api
VITE_APP_URL=https://your-frontend-url.com
```

### Step 5: Build Frontend

```powershell
cd C:\Users\shiva\Desktop\windows_app\learninghub\learninghub
npm run build
```

### Step 6: Deploy Frontend

**Option A - Vercel:**

```powershell
npx vercel --prod
```

**Option B - Netlify:**

```powershell
npx netlify deploy --prod --dir=dist
```

**Option C - Cloudflare Pages:**

```powershell
npx wrangler pages deploy dist --project-name=learninghub
```

---

## Automated Retry (PowerShell)

Run this single command to retry everything:

```powershell
cd C:\Users\shiva\Desktop\windows_app\learninghub
.\deploy.ps1
```

---

## Common Retry Issues

### Issue: "Cannot find module"

**Fix:** Run `npm install` in each directory

### Issue: "Not authorized"

**Fix:** Run `npx wrangler login`

### Issue: "DATABASE_URL not set"

**Fix:** Run `npx wrangler secret put DATABASE_URL`

### Issue: "Build fails"

**Fix:**

```powershell
cd learninghub
npm install
npm run build
```

---

## Verify Before Deploying

### Test Backend Health

```powershell
$workersUrl = "https://your-workers-url.workers.dev"
Invoke-RestMethod -Uri "$workersUrl/api/health" -Method GET
```

### Test Auth

```powershell
$body = @{email="admin@learninghub.com"; password="admin123"} | ConvertTo-Json
Invoke-RestMethod -Uri "$workersUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

---

## Need Help?

Check these files:

- `DEPLOYMENT_GUIDE.md` - Full detailed guide
- `DEPLOYMENT_CHECKLIST.md` - Pre-flight checklist
- `docs/` - Phase-by-phase documentation
