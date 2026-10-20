# LearningHub Vibe Coding Playbook 🚀
## From Idea to Real Product — The 19-Stage Master Guide

This playbook outlines the exact 19-stage engineering methodology used to build, test, secure, and ship production-grade features in **LearningHub** using **Google Antigravity IDE**.

---

## 🗺️ The 19-Stage Visual Pipeline

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      THE 19-STAGE VIBE PIPELINE                        │
 └────────────────────────────────────────────────────────────────────────┘
  [01. IDEA]            Identify the educational problem & user pain point
       │
  [02. RESEARCH]        Benchmark competitors (Khan Academy, LeetCode, Quizlet, PW)
       │
  [03. DEFINE USER]     Map archetypes: Aspirants, CS Students, Lifelong Learners
       │
  [04. PRD]             Document functional & non-functional requirements (P95, WCAG)
       │
  [05. TECH STACK]      Enforce canonical architecture (React 18, Express 5, Celery)
       │
  [06. ARCHITECTURE]    Design Prisma models, REST/WebSocket contracts & Zustand state
       │
  [07. DESIGN]          Modern dark-mode UI, glassmorphism & Framer Motion micro-effects
       │
  [08. PROJECT RULES]   Enforce zero-hallucination, strict TypeScript & DOMPurify
       │
  [09. TASK BREAKDOWN]  Split into atomic 15-minute sub-milestones
       │
  [10. SETUP]           Verify packages, database migrations & API health
       │
  [11. DEVELOPMENT]     Layered build: DB -> Service -> Controller -> Store -> UI
       │
  [12. TESTING]         Automated Vitest/Jest unit tests & failure-mode coverage
       │
  [13. SECURITY]        Automated Snyk SAST scan & OWASP Top 10 hardening
       │
  [14. CODE REVIEW]     TypeScript compilation (`tsc --noEmit`) & bundle optimization
       │
  [15. PREVIEW DEPLOY]  Staging build verification (`npm run build` & Vite preview)
       │
  [16. QA TESTING]      Playwright E2E & Browser subagent real-world user flow test
       │
  [17. PROD DEPLOY]     Deploy to Cloudflare Pages & non-destructive DB migrations
       │
  [18. MONITORING]      Sentry error tracking, Prometheus metrics & Grafana alerts
       │
  [19. ITERATION]       Analyze completion telemetry, log bugs & plan next cycle
```

---

## ⚡ How to Trigger in Antigravity IDE

Simply type `/vibe` or `/v` in the Antigravity chat:
- If starting a brand-new feature: `/vibe create an interactive physics simulator for JEE`
- If diagnosing an existing system: `/vibe optimize the Tests A+ exam engine scoring`
- If running god-mode end-to-end: `/vibe`

Antigravity will automatically initialize Stage 1 and systematically walk through all 19 stages, keeping you updated at every milestone.

---

## 🛡️ Anti-Mistake Checklist for Antigravity AI

| Stage | Verification Gate | Tool / Command |
| :--- | :--- | :--- |
| **05. Tech Stack** | No unmounted frameworks or rogue packages | `ARCHITECTURE_SOURCE_OF_TRUTH.md` |
| **06. Architecture** | Schema constraints & API envelope validation | `schema.prisma` & `API_CONTRACT.md` |
| **08. Project Rules** | Strict TypeScript & sanitized DOM output | `eslint.config.js` |
| **11. Development** | Layered dependency order (no circular imports) | Static analysis |
| **12. Testing** | Unit tests passing | `npm run test` (Vitest / Jest) |
| **13. Security** | 0 High/Critical vulnerabilities | `snyk_code_scan` |
| **14. Code Review** | 0 TypeScript errors | `npm run typecheck` |
| **15. Preview Deploy**| Successful production bundle build | `npm run build` |
| **16. QA Testing** | Real browser session with zero console errors | `browser_subagent` / Playwright |
