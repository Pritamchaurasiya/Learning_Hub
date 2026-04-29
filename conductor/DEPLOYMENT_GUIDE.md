# Production Deployment Guide

## Learning Hub Platform - Deployment Instructions

### Prerequisites

- Python 3.11 or higher
- PostgreSQL 15 or higher
- Redis 7 or higher
- (Optional) Docker and Docker Compose

### Quick Start (Docker - Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/learning-hub.git
   cd learning-hub
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Run migrations**
   ```bash
   docker-compose exec web python manage.py migrate
   ```

5. **Create superuser**
   ```bash
   docker-compose exec web python manage.py createsuperuser
   ```

### Manual Deployment

1. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb learning_hub
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements/production.txt
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate --settings=config.settings.production
   ```

5. **Collect static files**
   ```bash
   python manage.py collectstatic --noinput --settings=config.settings.production
   ```

6. **Run system checks**
   ```bash
   python manage.py check --deploy --settings=config.settings.production
   ```

7. **Start the server**
   ```bash
   # Development server (not for production)
   python manage.py runserver --settings=config.settings.production
   
   # Production server (use gunicorn)
   gunicorn --bind 0.0.0.0:8000 --workers 4 --timeout 60 config.wsgi:application
   ```

### Platform-Specific Deployment

#### Windows
```bash
deploy_windows.bat
```

#### Linux/Mac
```bash
chmod +x deploy_unix.sh
./deploy_unix.sh
```

### Post-Deployment Checklist

- [ ] System checks pass
- [ ] Database migrations successful
- [ ] Static files collected
- [ ] Admin user created
- [ ] Email sending configured
- [ ] SSL certificate installed
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] API endpoints responding
- [ ] AI features working (if configured)

### Troubleshooting

**Issue: Database connection failed**
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

**Issue: Static files not loading**
- Run collectstatic
- Check STATIC_ROOT configuration
- Verify web server configuration

**Issue: AI features not working**
- Verify API keys in .env
- Check AI_ENGINE app is installed
- Review AI service logs

### Support

For issues and support, contact: admin@yourdomain.com

---
**Deployment Status**: Production Ready (Silver+ Certified)
