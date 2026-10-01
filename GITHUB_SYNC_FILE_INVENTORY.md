# LEARNINGHUB — GITHUB SYNC COMPLETE FILE INVENTORY

**Date:** 2026-10-01  
**Repository:** `https://github.com/Pritamchaurasiya/Learning_Hub.git`  
**Total Tracked Files:** 3802  
**Total Modified Files:** 3  
**Total Untracked Files:** 0

## 1. Classification Breakdown

| Classification | File Count | Description |
| :--- | :--- | :--- |
| **ASSET** | 82 | Fonts, SVG icons, media, and styles |
| **BUILD_ARTIFACT** | 57 | Compiled outputs (dist, coverage, build) |
| **CONFIG** | 947 | Infrastructure, CI/CD pipelines, Docker, Nginx, environment templates |
| **DATABASE_BACKUP** | 2 | Shielded database dumps (protected by .gitignore) |
| **DATABASE_SCHEMA** | 124 | Prisma migrations, Django migrations, and SQL schemas |
| **DEMO_DATA** | 14 | Seed scripts and mock fixtures for local verification |
| **DOCUMENTATION** | 484 | Architectural specifications, reports, and canonical guides |
| **SOURCE_CODE** | 1782 | Active production application logic (React, Django, Node, Workers, Flutter) |
| **TEMPORARY** | 1 | Ephemeral diagnostic logs and agent scratchpads |
| **TEST** | 309 | Automated test suites (Vitest, Pytest, Playwright, Dart test) |

## 2. Large Tracked Files (> 500 KB)

| File Path | Size (KB) | Type |
| :--- | :--- | :--- |
| `learninghub/backend/eslint.json` | 637 KB | CONFIG |
| `learninghub/package-lock.json` | 613 KB | CONFIG |
| `windows_app/web/screenshots/screenshot1.png` | 549 KB | ASSET |

## 3. Subsystem Breakdown

- **`learninghub/src/`** (React 18 / Vite Frontend Core): **360 files**
- **`learninghub/django_backend/`** (Modernized Django REST Micro-Modular Architecture): **189 files**
- **`learninghub/backend/`** (TypeScript / Express / Prisma API Backend): **388 files**
- **`learninghub/workers-backend/`** (Cloudflare Workers Edge Network Services): **32 files**
- **`learninghub/docs/`** (Canonical Architecture Contracts & Documentation): **48 files**
- **`conductor/`** (Django Conductor Architecture & Parity Testing Suite): **1527 files**
- **`my_flutter_app/`** (Flutter Cross-Platform Mobile Client): **427 files**
- **`windows_app/`** (Flutter Windows Desktop Client): **460 files**
- **`.github/workflows/`** (GitHub Actions CI/CD Automated Pipelines): **11 files**

## 4. Protected / Excluded Items Audit

- `learninghub/django_backend/backups/`: **DATABASE_BACKUP (EXCLUDED)** — Shielded in `.gitignore`
- `tests_a_*.png`: **TEMPORARY_SCREENSHOT (EXCLUDED)** — Shielded in `.gitignore`
- `coverage.xml` & `**/coverage/**`: **BUILD_ARTIFACT (EXCLUDED)** — Shielded in `.gitignore`
- `.env.prod`: **SECRET (EXCLUDED)** — Shielded in `.gitignore`
