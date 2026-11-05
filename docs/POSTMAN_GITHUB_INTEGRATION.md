# LearningHub × Postman × GitHub integration

## What is included

- A version-controlled Postman Collection v2.1.0 for the canonical Django REST Framework API.
- A Postman environment template with a non-secret local base URL only.
- A GitHub Actions workflow that runs safe GET-only smoke folders with Newman when the repository variable `LEARNINGHUB_API_BASE_URL` is configured.

## Architecture and source of truth

The repository contains both Django and Express backend code. The repository's `API_CONTRACT.md`, `BACKEND_TRUTH.md`, and root `README.md` describe Django REST Framework as the canonical API contract. The collection therefore targets Django routes. Express endpoints must be documented and tested in a separate collection after their runtime route map is verified.

The collection is based on documented paths:
- `/health/`
- `/api/v1/users/me/`
- `/api/v1/courses/`
- `/api/v1/tests/`

Documentation is not proof that a deployed route is live. Run against local/staging first and reconcile any 404, 401, 403, or response-schema differences with the actual backend.

## Postman setup

1. Import `postman/collections/learninghub-django-api.collection.json` into the LearningHub Postman workspace.
2. Import `postman/environments/learninghub-local.environment.json`.
3. Set `baseUrl` to the backend origin (for example `http://localhost:8000`); do not append `/api/v1`.
4. For authenticated requests, set `accessToken` locally as a secret variable. Do not export or commit real tokens.
5. Run the collection against local or staging before production.

## GitHub Actions / Newman

Configure repository variable `LEARNINGHUB_API_BASE_URL` with a reachable HTTPS staging API origin. The workflow runs only safe GET-only folders and does not require credentials. The health and course/test endpoints are smoke-tested; the test-list route accepts 200/401/403 at this initial contract-discovery stage until deployed permissions are confirmed.

The workflow intentionally does not run login, registration, logout, payments, test submission, destructive endpoints, or production mutations.

## Security requirements

- Never commit API keys, passwords, JWTs, refresh tokens, payment secrets, database URLs, or Postman API keys.
- Keep credentials in Postman local/secret variables or GitHub Actions secrets.
- Use a dedicated test account and staging database for authenticated and mutation tests.
- Do not disable TLS certificate validation.
- Do not run load tests against production without a capacity-approved plan.

## Git synchronization clarification

Postman's SDK Git connection feature is for generated SDK delivery and pull requests, not general two-way synchronization of arbitrary Postman collections. The supported workflow here is GitHub version control of the exported collection plus Newman execution in GitHub Actions. No SDK Git connection was created because it would generate an SDK rather than synchronize this collection.
