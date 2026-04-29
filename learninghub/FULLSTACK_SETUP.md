# LearningHub Full-Stack Setup Guide

Complete guide for deploying LearningHub with Cloudflare Workers backend, Neon PostgreSQL database, and Hugging Face AI integration.

## Architecture

```
Frontend (Cloudflare Pages) ← → Backend (Cloudflare Workers) ← → Database (Neon PostgreSQL)
                                                                     ↓
                                                              AI (Hugging Face)
```

## Prerequisites

1. Cloudflare account
2. Neon account (neon.tech)
3. Hugging Face account (huggingface.co)
4. Node.js 18+ installed
5. Wrangler CLI installed: `npm install -g wrangler`

## Step 1: Database Setup (Neon)

1. Sign up at https://neon.tech
2. Create a new project
3. Get connection string from dashboard
4. Save it for later (DATABASE_URL)

### Run Schema

```bash
# Install psql client if not installed
# Then connect and run schema
psql "your-neon-connection-string" -f workers-backend/src/db/schema.sql
```

## Step 2: Backend Deployment (Cloudflare Workers)

### 2.1 Install Dependencies

```bash
cd workers-backend
npm install
```

### 2.2 Configure Wrangler

```bash
# Login to Cloudflare
wrangler login

# Create secrets
wrangler secret put DATABASE_URL
# Enter: your-neon-connection-string

wrangler secret put JWT_SECRET
# Enter: your-random-secret-key (use: openssl rand -base64 32)

wrangler secret put HUGGINGFACE_API_KEY
# Enter: your-huggingface-api-key
```

### 2.3 Deploy

```bash
# Deploy to Cloudflare
wrangler deploy --env production

# Get your worker URL from output
# Example: https://learninghub-api.your-subdomain.workers.dev
```

## Step 3: Frontend Deployment (Cloudflare Pages)

### 3.1 Update Environment

Edit `.env.production`:
```
VITE_API_URL=https://your-worker-url.workers.dev
```

### 3.2 Build and Deploy

```bash
cd ..
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=learninghub-frontend
```

## Step 4: Configuration

### Frontend API Integration

The frontend now uses `api-new.ts` which provides:

```typescript
import { api } from './utils/api-new';

// Auth
await api.auth.login(email, password);
await api.auth.register(email, password, username);

// Courses
await api.courses.list({ difficulty: 'beginner' });
await api.courses.enroll(courseId);
await api.courses.updateProgress(courseId, 50);

// Tests
await api.tests.get(testId);
await api.tests.submit(testId, { question1: 'answer1' });

// AI
await api.ai.analyzeQuiz({ score: 80, totalPossible: 100 });
await api.ai.recommend({ interests: ['javascript', 'react'] });
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh JWT token

### Courses
- `GET /courses` - List courses (with filters)
- `GET /courses/:id` - Get course details
- `POST /courses/enroll` - Enroll in course
- `GET /courses/my-courses` - Get enrolled courses
- `POST /courses/:id/progress` - Update progress

### Tests/Quiz
- `GET /tests` - List tests
- `GET /tests/:id` - Get test with questions
- `POST /tests/:id/submit` - Submit answers
- `GET /tests/:id/results` - Get results

### AI
- `POST /ai/analyze` - Analyze quiz performance
- `POST /ai/recommend` - Get course recommendations
- `POST /ai/summarize` - Summarize content

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Cloudflare Workers | 100,000 requests/day |
| Cloudflare Pages | Unlimited bandwidth |
| Neon PostgreSQL | 500 MB storage |
| Hugging Face API | 30 requests/hour |

## Local Development

### Backend

```bash
cd workers-backend
npm run dev
```

### Frontend

```bash
npm run dev
```

## Testing

### Manual Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Token persists in localStorage
- [ ] Courses list loads
- [ ] Can enroll in course
- [ ] Progress updates
- [ ] Quiz loads questions
- [ ] Can submit quiz
- [ ] Results show correctly
- [ ] AI analysis works (with fallback)

### API Testing

```bash
# Test health endpoint
curl https://your-worker.workers.dev/health

# Test auth (after deploying)
curl -X POST https://your-worker.workers.dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","username":"testuser"}'
```

## Troubleshooting

### Database Connection Issues
- Check DATABASE_URL format
- Ensure IP allowlist includes Cloudflare IPs
- Check Neon project is active

### CORS Errors
- Backend includes CORS headers
- Check API_URL matches exactly (including https://)

### AI Not Working
- Check HUGGINGFACE_API_KEY is set
- Hugging Face may rate limit (fallback responses included)

### 401 Unauthorized
- Token expired - will auto-redirect to login
- Check JWT_SECRET matches between auth and verification

## Next Steps

1. Set up custom domain
2. Add monitoring (Sentry)
3. Implement caching with Cloudflare KV
4. Add rate limiting
5. Set up CI/CD pipeline

## Resources

- Cloudflare Workers: https://workers.cloudflare.com
- Neon PostgreSQL: https://neon.tech
- Hugging Face: https://huggingface.co/inference-api
