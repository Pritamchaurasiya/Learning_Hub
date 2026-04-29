# AI API Keys Configuration

## Required API Keys for Production

### Google Gemini
1. Visit: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add to environment: GEMINI_API_KEY=your-key-here

### OpenAI
1. Visit: https://platform.openai.com/api-keys
2. Create a new secret key
3. Add to environment: OPENAI_API_KEY=sk-...

### Anthropic (Claude)
1. Visit: https://console.anthropic.com/settings/keys
2. Create a new API key
3. Add to environment: ANTHROPIC_API_KEY=sk-ant-...

## Environment Variables Template

Create a `.env` file in the project root:

```
# AI API Keys
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Security
SECRET_KEY=your-60-char-secret-key
DEBUG=False

# Database (PostgreSQL recommended for production)
DB_NAME=learning_hub
DB_USER=postgres
DB_PASSWORD=secure-password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# Email
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
ADMIN_EMAIL=admin@yourdomain.com
```

## Usage

```bash
# Load environment variables
export $(cat .env | xargs)

# Run with production settings
python manage.py runserver --settings=config.settings.production
```
