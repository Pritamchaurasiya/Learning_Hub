# Security Headers Configuration

The production.py file now includes all critical security headers:

1. SECURE_SSL_REDIRECT = True
   - Redirects all HTTP to HTTPS

2. SECURE_CONTENT_TYPE_NOSNIFF = True
   - Prevents MIME type sniffing

3. SECURE_BROWSER_XSS_FILTER = True
   - Enables browser XSS filtering

4. X_FRAME_OPTIONS = 'DENY'
   - Prevents clickjacking attacks

5. SECURE_HSTS_SECONDS = 31536000
   - HTTP Strict Transport Security for 1 year

6. CSRF_COOKIE_SECURE = True
   - CSRF cookie only sent over HTTPS

7. SESSION_COOKIE_SECURE = True
   - Session cookie only sent over HTTPS

8. SECURE_HSTS_INCLUDE_SUBDOMAINS = True
   - HSTS applies to all subdomains

9. SECURE_HSTS_PRELOAD = True
   - Ready for HSTS preload list

## Environment Variables Required:

```bash
# .env file for production
SECRET_KEY=your-generated-secret-key
DB_NAME=learning_hub
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
EMAIL_HOST_USER=your-email@domain.com
EMAIL_HOST_PASSWORD=your-email-password
ADMIN_EMAIL=admin@yourdomain.com
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```
