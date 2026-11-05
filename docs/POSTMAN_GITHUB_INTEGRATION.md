# LearningHub × Postman × GitHub API quality workflow

## Current scope

The Postman workspace contains a version-controlled Collection v2.1.0 for the documented Django REST Framework API and a local development environment. The collection has four folders:

- Health: basic health endpoint and response-time assertion.
- Authentication: login, refresh-token rotation, and authenticated profile requests. These require a dedicated non-production test account and are intentionally excluded from unauthenticated CI.
- Learning & Assessment: public course and test catalog smoke tests.
- Security & Access Control: verifies that an anonymous caller cannot read a protected user profile.

The collection includes request-level Postman assertions. The GitHub copy is intended to remain an export-equivalent of the Postman collection.

## Backend source of truth

The repository contains multiple backend implementations. This collection targets the Django REST Framework contract described by the root `README.md`, `API_CONTRACT.md`, and `BACKEND_TRUTH.md`. Do not point these requests at the Express server unless its route and response contract has separately been proven equivalent. Create a distinct Express collection when that route map is verified.

## Configure Postman

1. Import `postman/collections/learninghub-django-api.collection.json`.
2. Import `postman/environments/learninghub-local.environment.json`.
3. Set `baseUrl` to the backend origin, for example `http://localhost:8000`. Do not include `/api/v1`.
4. Use a dedicated local/staging test account to populate `testEmail` and `testPassword` as local/secret values.
5. Run the Authentication folder manually. The Login request stores returned JWT values in secret environment variables; Refresh updates the rotated token pair. Never export or commit real tokens.
6. Run the full collection on local/staging. Authentication tests are not CI-enabled until dedicated credentials and a safe test-data strategy are configured.

## GitHub Actions / Newman

The workflow has two separate quality gates:

- **Collection validation** always runs on pull requests, main pushes affecting the test assets, and manual dispatch. It checks Postman v2.1.0 structure, required folders, request assertions, smoke-folder method safety, and that exported credential/token values are blank.
- **Live Newman smoke tests** run only when the repository variable `LEARNINGHUB_API_BASE_URL` is configured. Set it to a reachable HTTPS staging API origin. The Newman job runs GET-only Health, Learning & Assessment, and Security folders. Login, refresh, payments, test submission, logout, and destructive routes are not run in CI.

The list-tests and course-catalog assertions expect the public API response contract documented in the repository. Treat any live failure as a contract/runtime discrepancy to investigate rather than weakening assertions merely to get a green build.

## Secrets and security

- Never commit API keys, passwords, JWTs, refresh tokens, payment secrets, database URLs, or Postman API keys.
- Keep test credentials in local Postman secret variables or, when an authenticated CI strategy is approved, GitHub Actions secrets.
- Use a dedicated staging database and non-production test accounts.
- Do not disable TLS certificate validation.
- Do not run load tests against production without an explicit capacity-approved plan.

## Git integration model

Postman's SDK Git connection creates generated SDK delivery pull requests; it is not a general-purpose bidirectional sync for arbitrary collection JSON. This project uses GitHub as the version-control source for an exported Postman Collection, and Newman as the automated runner in GitHub Actions. Keep the Postman collection and its Git export synchronized in the same PR.

