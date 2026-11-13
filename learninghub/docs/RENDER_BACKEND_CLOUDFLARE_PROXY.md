# LearningHub — Render backend and Cloudflare Pages integration

## Intended topology

- Frontend: Cloudflare Pages project `learninghub`.
- Backend: Node.js / Express service on Render.
- Database: Neon PostgreSQL.
- Browser API base: same-origin `/api/v1` on the Pages hostname.
- Cloudflare Pages Functions forward `/api/*` and `/socket.io/*` to Render.

The Pages Functions keep browser traffic on one origin. This matters because the Express backend uses HttpOnly authentication cookies. Calling an `onrender.com` hostname directly from a `pages.dev` site makes those cookies third-party/cross-site; relying on third-party cookie behavior is not a robust production authentication design.

## Cloudflare Pages configuration

The deployment workflow runs Wrangler from the `learninghub/` directory. Wrangler includes the `functions/` directory when it is present beside the deployed assets directory.

Set this Pages project variable for **Production** and **Preview**:

| Variable | Value |
| --- | --- |
| `LEARNINGHUB_BACKEND_ORIGIN` | The exact HTTPS origin of the active Render backend, with no path or trailing API prefix |

For the current staging service, the candidate value is:

```text
https://learninghub-express-api-staging-pr214.onrender.com
```

Do not configure a Render URL until the corresponding Render service is healthy and has the correct Neon staging database.

Set the GitHub Actions repository variable `VITE_API_URL` to:

```text
/api/v1
```

This value is public and contains no secret. Do not put database URLs, API tokens, or passwords in any `VITE_*` variable.

The Functions route:
- forwards `/api/*` to the same path on Render;
- forwards `/socket.io/*` to the same path on Render;
- passes request cookies and authorization/CSRF headers upstream;
- returns upstream response headers, including `Set-Cookie`, to the browser;
- avoids caching API responses by not using the Cache API;
- returns a non-cacheable 503 if the origin binding is absent and a 502 if the upstream cannot be reached.

## Render environment requirements

The backend's Zod environment schema requires these variables at startup:

- `NODE_ENV=production`
- `PORT` (Render injects this)
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET` (at least 32 characters)
- `JWT_REFRESH_SECRET` (at least 32 characters)
- `CSRF_SECRET` (at least 32 characters)
- `ADMIN_SECRET` (at least 16 characters)
- `ADMIN_EMAIL` (valid email)
- `ADMIN_DEFAULT_PASSWORD` (at least 12 characters)
- `FRONTEND_URL=https://learninghub-385.pages.dev`
- `CORS_ORIGIN=https://learninghub-385.pages.dev`

The exported Render Blueprint previously captured several of these variables but did not list the three required admin variables. Confirm the actual Render Environment page before the next boot. Do not use placeholder/example values in production. Keep all secrets in Render's Environment settings, never in Git.

For Neon, use a dedicated, active staging branch and an empty/staging database for the staging service. Do not point this staging service at the Neon main branch or its production database.

## Render health checks

- `GET /health` is a liveness check only.
- A readiness check must verify PostgreSQL connectivity and return a non-2xx status when the database is unavailable.
- Configure Render's Health Check Path to the readiness route only after that route is present in the deployed backend and verified.

## Database migration safety

The current Neon main branch's tables and scalar columns match the checked-in Prisma schema, but the database has no `public._prisma_migrations` table and the repository currently has only one initial migration file. Do not run `prisma migrate deploy`, `prisma db push`, or seed scripts against the main branch until a reviewed baseline/reconciliation plan is prepared and tested on an isolated branch/database.

## Deployment release gate

1. Run the dedicated Express staging workflow and confirm install, Prisma generation, and TypeScript build.
2. Configure an isolated, active Neon staging branch/database.
3. Populate all required Render staging environment variables.
4. Deploy the Render staging service and verify liveness plus database readiness.
5. Set the Cloudflare Preview binding to the staging Render origin.
6. Test registration/login/refresh/logout, CSRF, protected API calls, uploads, and Socket.IO from a preview URL.
7. Only after these checks pass, plan a production release using a separate Render service and the protected Neon main branch.
