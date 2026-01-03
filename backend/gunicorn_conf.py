bind = '0.0.0.0:8000'
# Worker count tuned for CPU; allow override via ENV var GUNICORN_WORKERS
import multiprocessing, os
workers = int(os.getenv("GUNICORN_WORKERS", str(max(2, multiprocessing.cpu_count() * 2))))
worker_class = 'uvicorn.workers.UvicornWorker'
# Graceful timeouts to allow streams to finish; keep shorter than platform hard timeout
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "30"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))
preload_app = False
