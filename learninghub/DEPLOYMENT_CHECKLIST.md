# LearningHub Deployment Checklist

## 🚀 Ready to Deploy!

### Phases Completed:

- ✅ Phase 1: Database Migration (Neon PostgreSQL)
- ✅ Phase 2: Backend Consolidation (Cloudflare Workers)
- ✅ Phase 3: Quiz Result Persistence
- ✅ Phase 4: Admin Authentication & Protected Routes
- ✅ Phase 5: Real Search & Filter

**All core features are complete and production-ready!**

---

## Pre-Deployment Requirements

### 1. Neon PostgreSQL Database ✓

- [ ] Create account at https://neon.tech
- [ ] Create new project "learninghub"
- [ ] Copy connection string
- [ ] Run database migration:
  ```bash
  cd backend
  npm install
  npm run db:setup
  ```

### 2. Cloudflare Workers Setup ✓

- [ ] Install Wrangler CLI:
  ```bash
  npm install -g wrangler
  ```
- [ ] Login to Cloudflare:
  ```bash
  wrangler login
  ```

### 3. Configure Secrets ✓

**DATABASE_URL** (from Neon):

```bash
cd workers-backend
npx wrangler secret put DATABASE_URL
# Enter: postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**JWT_SECRET** (generate random string):

```bash
npx wrangler secret put JWT_SECRET
# Enter: your-super-secret-jwt-key-min-32-characters-long
```

---

## Deployment Steps

### Step 1: Deploy Workers Backend

```bash
cd workers-backend
npm install
npx wrangler deploy --env production
```

**Save the deployed URL** (e.g., `https://learninghub-api.xxx.workers.dev`)

### Step 2: Update Frontend Config

Edit `learninghub/.env.production`:

```env
VITE_API_URL=https://learninghub-api.xxx.workers.dev/api
VITE_APP_URL=https://your-frontend-domain.com
```

### Step 3: Build Frontend

```bash
cd learninghub
npm install
npm run build
```

### Step 4: Deploy Frontend

**Option A - Vercel:**

```bash
npx vercel --prod
```

**Option B - Netlify:**

```bash
npx netlify deploy --prod --dir=dist
```

**Option C - Cloudflare Pages:**

```bash
npx wrangler pages deploy dist --project-name=learninghub
```

---

## Post-Deployment Verification

### Test Backend

```bash
# Health check
curl https://learninghub-api.xxx.workers.dev/api/health

# Should return:
# {"success":true,"data":{"status":"healthy","checks":{"database":true}}}
```

### Test Frontend

1. Open your frontend URL
2. Login with test account:
   - Email: `student@learninghub.com`
   - Password: `student123`
3. Navigate to a course and start a quiz
4. Submit quiz and verify results are saved

---

## Troubleshooting

### Database Connection Issues

```bash
# Check Neon status
npx wrangler secret list

# Test connection locally
psql $NEON_DATABASE_URL -c "SELECT 1"
```

### JWT Issues

```bash
# Verify JWT secret is set
npx wrangler secret list

# Check token format in requests
# Header should be: Authorization: Bearer <token>
```

### CORS Issues

Update `workers-backend/src/index.ts` with your frontend domain, then redeploy.

---

## Files Ready for Deployment

| File                              | Purpose                           |
| --------------------------------- | --------------------------------- |
| `workers-backend/src/index.ts`    | Main Workers entry point          |
| `workers-backend/wrangler.toml`   | Workers configuration             |
| `workers-backend/src/routes/*.ts` | API routes (auth, courses, tests) |
| `backend/prisma/schema.prisma`    | Database schema                   |
| `learninghub/.env.production`     | Frontend production config        |

---

## 📚 Full Documentation

- `DEPLOYMENT_GUIDE.md` - Complete step-by-step guide
- `docs/DATABASE_MIGRATION_GUIDE.md` - Database setup
- `docs/BACKEND_CONSOLIDATION_GUIDE.md` - Backend architecture
- `docs/QUIZ_PERSISTENCE_GUIDE.md` - Quiz system

---

**🎉 You're ready to deploy LearningHub to production!**

Start with Step 1 above and follow the checklist.
