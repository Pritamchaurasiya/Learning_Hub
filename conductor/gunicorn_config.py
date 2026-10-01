import multiprocessing

# Auto-scale workers based on CPU cores, cap at 8
workers = min(multiprocessing.cpu_count() * 2 + 1, 8)
bind = "0.0.0.0:8000"
worker_class = "gthread"
threads = 2
timeout = 120
graceful_timeout = 30
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
preload_app = True
accesslog = "-"
errorlog = "-"
loglevel = "info"
