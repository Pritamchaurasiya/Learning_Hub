# LearningHub frontend — Cloudflare Pages operations

## Current hosting target

- **Public preview/prod hostname:** https://learninghub-385.pages.dev
- **Cloudflare Pages project name:** `learninghub`
- **GitHub repository:** https://github.com/Pritamchaurasiya/Learning_Hub
- **Production branch:** `main`
- **Frontend root directory:** `learninghub`
- **Build command:** `npm run build`
- **Build output directory:** `dist`

The frontend is React + TypeScript + Vite. Only the static frontend is deployed by this workflow; it does not deploy Node.js/Django services, PostgreSQL, Redis, or AI-provider services.

## Automatic deployment

Workflow: [Deploy LearningHub Frontend to Cloudflare Pages](../../.github/workflows/deploy-learninghub-frontend.yml)

- Pushes that change `learninghub/**` on `main` deploy production.
- Pushes that change `learninghub/**` on `develop` deploy a Cloudflare Pages preview.
- Each run installs frontend dependencies, runs the production build, and uploads `dist/` with Wrangler.
- To manually retry a failed deploy, open the workflow run in GitHub Actions and choose **Re-run jobs** after fixing the reported cause.

## Required GitHub Actions secret

Create repository secret **`CLOUDFLARE_API_TOKEN`** at:

https://github.com/Pritamchaurasiya/Learning_Hub/settings/secrets/actions/new

Create the token in Cloudflare with account-scoped **Cloudflare Pages: Write** permission, restricted to the account hosting this Pages project. The account ID is already configured in the workflow. Never commit a token into source code or expose it as a `VITE_*` variable.

## Backend API configuration

Create repository variable **`VITE_API_URL`** at:

https://github.com/Pritamchaurasiya/Learning_Hub/settings/variables/actions

Use the actual deployed API base URL, including the version prefix, for example:

```text
https://api.your-owned-domain.example/api/v1
```

That value is an example only; replace it with the real backend URL. `VITE_*` variables are embedded in browser code and are public, so never put passwords, database URLs with credentials, or private API tokens in them.

If `VITE_API_URL` is not configured, the workflow falls back to `/api/v1` so the static frontend can still build. Cloudflare Pages does not automatically proxy this path to a separate Node/Django backend. In this fallback mode, API-powered features such as authentication, saved progress, AI tutor, and server-generated quizzes will not work correctly until the backend is deployed and connected.

Keep `VITE_ENABLE_MOCK_API=false` for production. Do not enable mock data merely to hide missing backend services.

## Website name and URL

The page title, PWA name, icons, favicon, metadata, sitemap, and robots file use **LearningHub** branding. The current Pages hostname is `learninghub-385.pages.dev`.

A public URL written as `https://LearningHub` is not a complete public domain name. For a permanent branded URL, register/own a domain such as `learninghub.in` or `learninghub.app`, then add it in Cloudflare Pages → **Custom domains**. No domain has been purchased or attached by this workflow.

## Static-site behavior and security

- Vite's `dist/` output is the only deployment artifact.
- Cloudflare Pages serves the SPA entry point for frontend routes when no static `404.html` overrides it.
- `public/_headers` configures standard security response headers and one-year immutable caching for fingerprinted `/assets/*` files.
- `public/robots.txt` and `public/sitemap.xml` currently point to the Pages hostname. Update both after attaching a permanent custom domain, and also update the canonical URL metadata in `index.html`.

## Release checklist

1. Confirm the GitHub Actions build and Cloudflare deploy steps both succeed.
2. Open the deployed hostname in a private browser window and check home, refresh-on-nested-route, mobile layout, and static assets.
3. Check browser Console and Network tabs for failed API requests.
4. Configure `VITE_API_URL` only after the real backend URL is available; redeploy after changing Actions Variables.
5. Add a custom domain only after domain ownership/DNS is ready.
6. Roll back via the Cloudflare Pages project deployment history if a new static build breaks production.
