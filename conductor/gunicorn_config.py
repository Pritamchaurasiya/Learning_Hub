
"""Gunicorn configuration."""
import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker" # Utilizing Uvicorn for ASGI support if mixed
# Or standard gunicorn for WSGI + separate Daphne for ASGI

# We use standard sync/gthread for main app if separate ASGI, but for simplicity:
# Let's use UvicornWorker to handle both if needed, OR standard sync
# Reverting to standard 'sync' or 'gthread' for robust WSGI
# But since we have Channels, we typically run Daphne for WS and Gunicorn for HTTP
# The Dockerfile runs Gunicorn by default.

# Configuration for pure HTTP Gunicorn
worker_class = "gthread"
threads = 4
timeout = 120
accesslog = "-"
errorlog = "-"
loglevel = "info"
