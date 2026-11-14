# LearningHub: Django + Render + Neon + Cloudflare deployment

## Architecture

- Frontend: Cloudflare Pages project `learninghub`.
- Primary backend: Django REST Framework at `learninghub/django_backend`.
- ASGI server: Daphne with Django Channels.
- Database: Neon PostgreSQL.
- Backend hosting: a separate Render Web Service. Existing Express/Node services are not the primary API.
- Browser API base: same-origin `/api/v1` on the Pages hostname.

## Cloudflare Pages API proxy

The Pages Function under `learninghub/functions/api/` forwards `/api/*` to the configured Django backend.

Set this runtime variable in both Production and Preview environments of the Cloudflare Pages project:

| Variable | Value |
| --- | --- |
| `LEARNINGHUB_BACKEND_ORIGIN` | Exact Render HTTPS origin, for example `https://learninghub-django-api-staging.onrender.com` |

Do not add `/api`, a path, query string, or trailing path segment to the value. Configure this only after the Render service is healthy.

The frontend's build-time `VITE_API_URL` should be `/api/v1`. This is a public URL, not a secret. Never put database URLs, access tokens, or private API keys into `VITE_*` variables.

The proxy forwards HTTP methods, query strings, request bodies, cookies, auth/CSRF headers, and upstream `Set-Cookie` headers. It rewrites same-origin redirects to the Pages host and applies `Cache-Control: no-store`. It returns generic 503/502 errors without exposing upstream credentials.

## Django environment variables

- `DEBUG=False`
- `DJANGO_SECRET_KEY`: unique random secret
- `JWT_SECRET_KEY`: separate unique random signing secret
- `ADMIN_SECRET`: unique random secret
- `ALLOWED_HOSTS`: exact Render `.onrender.com` service hostname
- `DATABASE_URL`: Neon staging or production database URL; never use the production URL in staging
- `CSRF_TRUSTED_ORIGINS`: exact frontend origin, initially `https://learninghub-385.pages.dev`
- `CORS_ALLOWED_ORIGINS`: exact frontend origin if cross-origin API access is required
- `ALLOW_IN_MEMORY_BACKENDS=true`: staging only, one instance, until Redis is configured
- `REDIS_URL`: required for production multi-instance caching and Channels fan-out
- `DJANGO_SETTINGS_MODULE=learninghub_server.settings`

Render injects `PORT`. Do not hard-code it.

## Database migration policy

Django migrations belong to `learninghub/django_backend`; they are separate from the Express Prisma migration history. Never run Prisma commands against the Django database.

Use a separate, empty Neon staging database/branch. Run Django migrations there first, inspect the resulting tables, and run Django model/API tests. Production migrations require a reviewed migration plan and verified backup.

## Readiness endpoints

- `GET /api/v1/health/live`: process liveness only.
- `GET /api/v1/health/ready`: readiness; returns HTTP 503 when PostgreSQL or a configured Redis cache is unavailable.
- Render Health Check Path: `/api/v1/health/ready`.

## WebSocket compatibility — separate migration required

The current React hook uses `socket.io-client`. Django exposes native Django Channels WebSocket routes such as `/ws/notifications`, `/ws/collab/<room_id>`, `/ws/webrtc/<room_id>`, and `/ws/exam/<attempt_id>`. Socket.IO and native Channels WebSockets are different wire protocols. Do not proxy `/socket.io` to Django Channels and assume compatibility.

Before switching realtime traffic, build and test a native WebSocket client/protocol adapter against the Channels consumers (or deliberately add a maintained Socket.IO gateway). HTTP API migration is a separate milestone.

## File uploads and persistent storage

A Render container's local filesystem is ephemeral on Free web services. Do not treat local `media/` uploads as durable. Before enabling user file uploads in production, integrate Cloudflare R2 or another approved object store. Static frontend assets remain on Cloudflare Pages.
