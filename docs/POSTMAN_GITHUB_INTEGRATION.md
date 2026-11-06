# LearningHub × Postman × GitHub API quality workflow

## Current scope

The Postman workspace contains two independent version-controlled Collection v2.1.0 suites. Keep them separate because the repository contains two distinct backend runtimes with different routes and health semantics.

### Django REST Framework
Collection: `postman/collections/learninghub-django-api.collection.json`

- **00 — Health:** health check.
- **01 — Authentication:** login, refresh-token rotation, and authenticated current-user request. This folder is manual/local because it needs a dedicated non-production account.
- **02 — Learning & Assessment:** public course and test catalog checks.
- **03 — Security & Access Control:** confirms anonymous profile access is rejected.

Environment export: `postman/environments/learninghub-local.environment.json`.

### Express / Node.js
Collection: `postman/collections/learninghub-express-api.collection.json`

- **00 — Process Health:** `GET /health` and `GET /api/v1/health/live`.
- **01 — Public Catalog:** course categories, public AI model catalog, and curriculum templates.
- **02 — Authentication & Security:** verifies `GET /api/v1/auth/me` rejects an unauthenticated request.
- **03 — Authentication (Manual):** dedicated test-account login, refresh-token rotation, and authenticated current-user profile checks. Run locally or on isolated staging; excluded from unauthenticated CI smoke.

Environment export: `postman/environments/learninghub-express-local.environment.json`.

**Workspace synchronization:** the GitHub exports and Postman workspace were read back and compared. All 16 requests (7 Django + 9 Express) match by folder, name, method, URL and test scripts. The Express local environment also matches its GitHub export, with credential/token fields blank.

The Express route paths were checked against `learninghub/backend/src/server.ts`, `learninghub/backend/src/routes/index.ts`, and the corresponding `src/routes/v1/*.routes.ts` modules. The Express default local port is `5000`; configure the Express environment `baseUrl` as the origin only (for example `http://localhost:5000`).

## Backend source of truth

- **Django DRF:** the root `README.md`, `API_CONTRACT.md`, and `BACKEND_TRUTH.md` describe the canonical Django REST API contract.
- **Express/Node:** actual route mounts live under `learninghub/backend/src/routes/index.ts`; route implementation and authentication middleware are under `learninghub/backend/src/routes/v1/` and `learninghub/backend/src/middleware/`.

Do not point one collection at the other backend just because both use a similar `/api/v1` prefix. Route existence, authentication behavior, and response envelopes are runtime-specific.

## Configure Postman

1. Import the correct collection and its matching environment.
2. Set `baseUrl` to the corresponding backend origin; do not append `/api/v1`.
3. For the Django collection, use a dedicated local/staging test account to populate `testEmail` and `testPassword` as local/secret values. Run Authentication manually; Login stores returned JWT values in secret environment variables and Refresh updates the rotated pair. Both requests parse the canonical `data.accessToken` and `data.refreshToken` fields returned by the Django auth views; CI validates this token-response contract statically.
4. For the Express collection, use its own environment and its own JWT values. Do not reuse a Django token.
5. Run the full collection locally or against staging before production.

## GitHub Actions / Newman

The workflow validates both suites on every relevant PR, main push, or manual dispatch:

- Collection/environment validation checks Collection v2.1.0 declarations, required folders, named requests, request-level assertions, GET-only smoke folders, `{{baseUrl}}` usage, and blank exported credentials/token placeholders.
- **Django live Newman tests** run only when repository variable `LEARNINGHUB_API_BASE_URL` is configured as a reachable HTTPS staging API origin.
- **Express live Newman tests** run only when repository variable `LEARNINGHUB_EXPRESS_API_BASE_URL` is configured as a reachable HTTPS Express staging API origin.

The Django job runs only Health, Learning & Assessment, and Security folders. The Express job runs only Process Health, Public Catalog, and Authentication & Security folders. The two staging URLs are separate variables to prevent cross-backend test execution.

Login, registration, refresh, logout, payment, test start/submit, AI generation, and other state-changing or potentially costly requests are excluded from unauthenticated CI smoke runs. Authenticated behavior remains in the Postman collections for controlled manual/staging checks.

## Secrets and security

- Never commit API keys, passwords, JWTs, refresh tokens, payment secrets, database URLs, or Postman API keys.
- Keep credentials in Postman local/secret variables or, when an authenticated CI strategy is explicitly approved, GitHub Actions secrets.
- Use dedicated staging databases and non-production test accounts.
- Do not disable TLS certificate validation.
- Do not run load tests against production without an explicit capacity-approved plan.

## Git integration model

Postman's SDK Git connection creates generated SDK delivery pull requests; it is not a general-purpose bidirectional sync for arbitrary collection JSON. This project uses GitHub as the version-control source for exported Postman collections, and Newman as the automated runner in GitHub Actions. Keep each Postman collection export and its Git file synchronized in the same PR.
