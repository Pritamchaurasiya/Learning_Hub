"""
Optimized Gunicorn Configuration
Production-ready settings for high performance
"""

import multiprocessing
import os

# Server socket binding
bind = "0.0.0.0:8000"

# Worker configuration - auto-detect based on CPU cores
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000

# Preload app for memory efficiency
preload_app = True

# Worker lifecycle
max_requests = 1000
max_requests_jitter = 50
timeout = 60
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "/var/log/gunicorn-access.log"
errorlog = "/var/log/gunicorn-error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "learning-hub"

# Server mechanics
daemon = False
pidfile = "/tmp/gunicorn.pid"

# SSL (when configured)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

# Performance tuning
def on_starting(server):
    """Hook for server starting."""
    pass

def on_reload(server):
    """Hook for configuration reload."""
    pass

def when_ready(server):
    """Hook for server ready."""
    pass

def worker_int(worker):
    """Hook for worker interrupt."""
    pass

def on_exit(server):
    """Hook for server exit."""
    pass
