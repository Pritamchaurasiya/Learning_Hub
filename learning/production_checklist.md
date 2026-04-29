# Production Readiness Checklist (God Mode)

## Backend (Django) - `conductor`

- [x] Settings: `DEBUG=False`
- [x] Settings: Security Headers (HSTS, CSP)
- [x] Settings: `ALLOWED_HOSTS` from env
- [x] Requirements: `uvicorn`/`gunicorn` present
- [x] Database: PostgreSQL driver `psycopg2` check

## Frontend (Flutter) - `my_flutter_app`

- [/] Analysis: `flutter analyze` clean
- [ ] Build: `flutter build web` success
- [ ] Build: `flutter build windows` success

## Integration

- [ ] API Reachability: Backend -> Frontend
- [ ] CORS: Frontend URL allowed in Backend
