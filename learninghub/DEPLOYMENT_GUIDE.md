# LearningHub Deployment Guide

## 🚀 Deploy to Production

This guide will walk you through deploying LearningHub to production using Cloudflare Workers + Neon PostgreSQL.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] **Neon PostgreSQL Database** set up with data
- [ ] **Cloudflare Account** (free tier works)
- [ ] **Wrangler CLI** installed and authenticated
- [ ] **JWT Secret** generated (min 32 characters)
- [ ] **Frontend build** configured

---

## Step 1: Verify Neon Database

### Check Database is Ready

```bash
cd backend
npm run db:studio
```

Verify tables exist:

- `users` - with admin and student accounts
- `courses` - at least 4 courses
- `tests` - with questions
- `test_results` - empty (ready for new data)

### Test Connection String

```bash
# Copy your Neon connection string
echo $NEON_DATABASE_URL
# Should show: postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
```

---

## Step 2: Configure Wrangler Secrets

### Login to Cloudflare

```bash
cd workers-backend
npx wrangler login
```

### Set Required Secrets

**DATABASE_URL** (Neon PostgreSQL):

```bash
npx wrangler secret put DATABASE_URL
# Paste your Neon connection string when prompted
```

**JWT_SECRET** (for authentication):

```bash
npx wrangler secret put JWT_SECRET
# Enter a secure random string (min 32 characters)
# Example: your-super-secret-key-here-32-chars-min
```

### Verify Secrets

```bash
npx wrangler secret list
```

Should show:

- DATABASE_URL
- JWT_SECRET

---

## Step 3: Deploy Workers Backend

### Install Dependencies

```bash
cd workers-backend
npm install
```

### Deploy to Production

```bash
npx wrangler deploy --env production
```

### Save the Deployed URL

After deployment, you'll see:

```
✨ Successfully published your script to:
https://learninghub-api.your-subdomain.workers.dev
```

**Copy this URL** - you'll need it for frontend configuration.

---

## Step 4: Update Frontend Configuration

### Edit Production Environment

```bash
cd ..
# Edit .env.production
```

Update `VITE_API_URL`:

```env
VITE_API_URL=https://learninghub-api.your-subdomain.workers.dev/api
VITE_APP_URL=https://your-frontend-url.com
```

### Build Frontend

```bash
cd learninghub
npm install
npm run build
```

### Deploy Frontend (choose one)

**Option A: Vercel**

```bash
npm i -g vercel
vercel --prod
```

**Option B: Netlify**

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**Option C: Cloudflare Pages**

```bash
npx wrangler pages deploy dist --project-name=learninghub-frontend
```

---

## Step 5: Post-Deployment Verification

### Test Backend Health

```bash
curl https://learninghub-api.your-subdomain.workers.dev/api/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "checks": {
      "database": true,
      "timestamp": "2024-01-20T10:30:00.000Z"
    }
  }
}
```

### Test Authentication

```bash
# Register
curl -X POST https://learninghub-api.your-subdomain.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","username":"testuser"}'

# Login
curl -X POST https://learninghub-api.your-subdomain.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Courses API

```bash
curl https://learninghub-api.your-subdomain.workers.dev/api/courses
```

Should return a list of courses.

---

## Step 6: Configure Custom Domain (Optional)

### For Workers Backend

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages
3. Select your worker
4. Go to Settings > Triggers > Custom Domains
5. Add your domain (e.g., `api.yourdomain.com`)

### For Frontend

Follow your hosting provider's custom domain instructions.

---

## 🔧 Troubleshooting

### Issue: "Database connection failed"

**Solution:**

1. Check secret is set: `npx wrangler secret list`
2. Verify Neon database is active (not paused)
3. Test connection string locally
4. Check Neon allows connections from Cloudflare IPs

### Issue: "JWT verification failed"

**Solution:**

1. Ensure JWT_SECRET is set and matches
2. Check token format in requests: `Bearer <token>`
3. Verify token hasn't expired

### Issue: "CORS errors"

**Solution:**

1. Update CORS origin in `workers-backend/src/index.ts`
2. Redeploy backend
3. Clear browser cache

### Issue: "404 Not Found"

**Solution:**

1. Check route is registered in `index.ts`
2. Verify URL path matches route pattern
3. Check method (GET/POST/PUT/DELETE)

---

## 📊 Monitoring

### Cloudflare Workers Dashboard

- URL: https://dash.cloudflare.com
- View: Request logs, errors, analytics
- Metrics: Request volume, error rate, latency

### Neon Dashboard

- URL: https://console.neon.tech
- View: Active connections, query performance
- Metrics: Database size, compute hours

---

## 🎉 Success Indicators

Your deployment is successful when:

- [ ] Health endpoint returns `"database": true`
- [ ] Can register new user
- [ ] Can login and get JWT token
- [ ] Can fetch courses list
- [ ] Frontend loads without API errors
- [ ] Quiz submission works end-to-end

---

## 📚 Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Neon PostgreSQL Docs](https://neon.tech/docs/)
- [Troubleshooting Guide](./docs/BACKEND_CONSOLIDATION_GUIDE.md#troubleshooting)

---

## 🚀 Quick Deploy Script

Save this as `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying LearningHub..."

# Deploy backend
echo "📦 Deploying Workers backend..."
cd workers-backend
npm install
npx wrangler deploy --env production

# Update frontend env with new URL
echo "⚙️  Updating frontend configuration..."
read -p "Enter Workers URL: " WORKERS_URL
cd ../learninghub
echo "VITE_API_URL=$WORKERS_URL/api" > .env.production

# Build and deploy frontend
echo "🏗️  Building frontend..."
npm install
npm run build

echo "✅ Deployment complete!"
echo "Backend: $WORKERS_URL"
echo "Frontend: (deploy dist/ folder to your hosting)"
```

Make executable: `chmod +x deploy.sh`

---

**Ready to deploy? Start with Step 1 above!**
