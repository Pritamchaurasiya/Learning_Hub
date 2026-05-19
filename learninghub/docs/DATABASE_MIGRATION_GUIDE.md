# LearningHub Database Migration Guide

## Phase 1: PostgreSQL Migration (COMPLETED ✓)

### Summary of Changes Made

#### 1. ✅ Schema Updates

- **Updated datasource**: Changed from SQLite to PostgreSQL
- **Added directUrl**: For Neon PostgreSQL pooled connections
- **Added database indexes** for performance:
  - User: email, role, createdAt, lastActive
  - Course: difficulty, phase, category, createdAt, price
  - Problem: difficulty, category, createdAt
  - Notification: userId, read, createdAt
  - TestResult: userId, testId, completedAt (already existed)

#### 2. ✅ Environment Configuration

- Updated `.env.example` with Neon PostgreSQL connection strings
- Added `NEON_DATABASE_URL` and `NEON_DATABASE_URL_UNPOOLED` variables
- Kept SQLite option commented for local development fallback

#### 3. ✅ Database Setup Scripts

- Created `scripts/setup-neon-db.js` - Automated database setup
- Created `prisma/seed.ts` - Comprehensive seed data for development
- Added npm scripts: `db:seed`, `db:setup`
- Added `tsx` dependency for TypeScript seed execution

#### 4. ✅ Seed Data

Created realistic demo data:

- 1 Admin user (admin@learninghub.com)
- 1 Student user (student@learninghub.com)
- 4 Courses across different categories
- 3 Modules
- 2 Lessons
- 2 Tests with questions
- 1 Coding problem (Two Sum)
- User progress, test results, bookmarks, notifications, achievements

---

## Next Steps to Complete Migration

### Step 1: Create Neon PostgreSQL Account (5 minutes)

1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub or email
3. Create a new project called "learninghub"
4. Copy the connection strings provided

### Step 2: Configure Environment Variables (2 minutes)

1. In the backend directory:
   ```bash
   cp .env.example .env
   ```
2. Update `.env` with your Neon credentials:
   ```
   NEON_DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
   NEON_DATABASE_URL_UNPOOLED="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

### Step 3: Install Dependencies (2 minutes)

```bash
cd backend
npm install
```

### Step 4: Run Database Setup (5 minutes)

```bash
npm run db:setup
```

This will:

- Validate the Prisma schema
- Generate Prisma client for PostgreSQL
- Deploy migrations to Neon
- Seed the database with demo data

### Step 5: Verify Installation (2 minutes)

```bash
npx prisma studio
```

Open Prisma Studio to visually inspect the data and verify everything is working correctly.

---

## Files Modified/Created

### Modified Files:

1. `backend/prisma/schema.prisma` - Updated for PostgreSQL with indexes
2. `backend/.env.example` - Neon connection strings
3. `backend/package.json` - Added seed scripts and tsx dependency

### New Files:

1. `backend/scripts/setup-neon-db.js` - Automated setup script
2. `backend/prisma/seed.ts` - Database seed data
3. `docs/DATABASE_MIGRATION_GUIDE.md` - This guide

---

## Verification Checklist

- [ ] Neon PostgreSQL account created
- [ ] Connection strings copied to .env
- [ ] `npm run db:setup` executes successfully
- [ ] Prisma Studio shows data correctly
- [ ] All 4 courses appear in database
- [ ] Test users can log in (admin@learninghub.com / admin123)
- [ ] No SQLite errors in console

---

## Troubleshooting

### Error: "Authentication failed"

**Solution**: Double-check your Neon connection string in `.env`. Make sure the password is correct and the project is active.

### Error: "Database does not exist"

**Solution**: Neon projects auto-create databases. If you renamed the default database, update the connection string accordingly.

### Error: "SSL required"

**Solution**: Neon requires SSL. The connection string already includes `?sslmode=require` which should handle this.

### Error: "Prisma Client generation failed"

**Solution**: Run `npx prisma generate` manually, then try again.

---

## Production Deployment Notes

When deploying to production:

1. **Set environment variables in Wrangler**:

   ```bash
   wrangler secret put NEON_DATABASE_URL --env production
   wrangler secret put NEON_DATABASE_URL_UNPOOLED --env production
   wrangler secret put JWT_SECRET --env production
   ```

2. **Free Tier Limits**:
   - Neon Free Tier: 500 MB storage, 190 compute hours/month
   - Cloudflare Workers: 100,000 requests/day (free)
   - Suitable for MVP and small production loads

3. **Scaling Path**:
   - Neon: Upgrade to Pro ($19/month) for more storage/compute
   - Cloudflare: Paid plans for higher request limits

---

## Next Phase Preview

**Phase 2: Backend Consolidation**

- Consolidate to Cloudflare Workers backend
- Remove/deprecate Express backend
- Update frontend API URLs
- Verify all endpoints work with Neon PostgreSQL

---

## Summary

✅ Phase 1 Database Migration is **COMPLETE**

The schema is now ready for PostgreSQL with proper indexing for production performance. The next step is to create your Neon account and run the setup script.

**Estimated time to complete migration: 15-20 minutes**
