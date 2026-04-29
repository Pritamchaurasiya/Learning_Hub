# 🚀 Learning Hub: System Launch Protocol

> **Version:** 1.0.0-PROD
> **Status:** GO FOR LAUNCH

This document outlines the standard operating procedure for starting the Learning Hub platform "Properly" (Acche se).

---

## 1. pre-Flight Checklist

Before you ignite the engines, ensure:

- [ ] **Docker is Running** (Check system tray)
- [ ] **Ports Available**: 80, 443, 8000, 3000 (Grafana), 9090 (Prometheus)
- [ ] **Secrets Loaded**: `.env.prod` exists in `conductor/`

## 2. The Launch Command

We use a single unified command to bring up the entire constellation (Django, Flutter, Postgres, Redis, Workers).

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### What happens next?

1.  **Database** initializes (Postgres 16).
2.  **Backend** migrates DB and collects static files.
3.  **Frontend** compiles Flutter to highly optimized WebAssembly/JS.
4.  **Nginx** starts routing traffic.

## 3. Verification (Health Check)

Once running, verify the systems:

| Service        | URL                                                  | Expected Status         |
| :------------- | :--------------------------------------------------- | :---------------------- |
| **Main App**   | [http://localhost](http://localhost)                 | Landing Page            |
| **API Health** | [http://localhost/health/](http://localhost/health/) | `{"status": "healthy"}` |
| **Admin**      | [http://localhost/admin/](http://localhost/admin/)   | Login Screen            |
| **Grafana**    | [http://localhost:3000](http://localhost:3000)       | Dashboard (admin/admin) |
| **Prometheus** | [http://localhost:9090](http://localhost:9090)       | Metric Graph            |

## 4. Troubleshooting

**"Port already in use"**

```bash
docker ps
docker kill $(docker ps -q)
```

**"Database connection failed"**
Wait 10 seconds. Postgres takes longer to boot than Django. The container will auto-restart (`restart: always`).

**"Static files missing"**

```bash
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
```

---

## 5. System Architecture Reference

For a deep dive into _how_ this works, read the [System Architecture 101](learning/system_architecture_101.md) course material.

_Engines Ready. Good luck, Commander._
