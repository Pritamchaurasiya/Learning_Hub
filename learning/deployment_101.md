# Deployment 101: Containerizing "God-Tier" Apps

**Course Instructor:** Antigravity AI
**Level:** DevOps Engineering
**Topic:** Docker, Nginx, and Production Deployment

---

## Module 1: Why Docker?

"But it works on my machine!" - _Every Junior Developer_

Docker solves this. It packages your OS, libraries, and code into a **Container**. If it runs in Docker, it runs anywhere (AWS, GCP, Azure, DigitalOcean).

### The Learning Hub Containers:

1.  **Backend (Django):** Python env, Gunicorn, Celery.
2.  **Frontend (Nginx):** Serves Flutter Web static files.
3.  **Database (PostgreSQL):** Persistent data storage.
4.  **Cache (Redis):** Fast memory for session/cache.

---

## Module 2: optimizing the Backend Build (`Dockerfile`)

We use a **Multi-Stage Build** to keep images small.

```dockerfile
# Stage 1: Builder
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements/ /app/requirements/
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements/prod.txt

# Stage 2: Final
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*
COPY . /app
# Run as non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser
```

_Lesson:_ Never ship compilation tools (gcc, git) to production. Build in one stage, copy _only_ artifacts to the final stage.

---

## Module 3: Serving Flutter Web (`nginx`)

Flutter Web is just HTML/JS/CSS. We don't need Node.js. We need **Nginx**.

```dockerfile
# Stage 1: Build Flutter
FROM google/dart:3.1 as flutter_build
# ... install flutter ...
RUN flutter build web --release

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=flutter_build /app/build/web /usr/share/nginx/html
```

### High-Performance Nginx Config

We configure Nginx to:

1.  **Gzip Compression:** Compress JS/CSS files (reduces load time by ~70%).
2.  **Cache Headers:** Tell browsers to cache static assets for 1 year.
3.  **SPA Routing:** Redirect 404s to `index.html` (so deep links work).

---

## Module 4: Orchestration (Docker Compose)

`docker-compose.prod.yml` ties it all together.

```yaml
version: "3.8"
services:
  backend:
    image: learninghub-backend
    restart: always
    env_file: .env.prod
    depends_on: [db, redis]

  nginx:
    image: learninghub-frontend
    ports: ["80:80", "443:443"]
    depends_on: [backend]
```

_Lesson:_ Services should define their dependencies. If `db` isn't ready, `backend` should wait or retry.

---

## Assignment

1.  Inspect the `Dockerfile` in `conductor/`.
2.  Look at `.env.prod.example` to see what secrets need to be injected.
3.  **Action:** Create the production build now.

_Class Dismissed. Time to ship._
