#!/bin/sh
set -e

alembic upgrade head

exec gunicorn src.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers "${WORKERS:-4}" \
    --bind "0.0.0.0:${PORT:-8000}" \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --access-logfile "-" \
    --error-logfile "-" \
    --log-level "${LOG_LEVEL:-info}"
