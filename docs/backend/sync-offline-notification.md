# Sync Offline & Notifications — Feature Blueprint

## Context

The app is **offline-first**. Mobile clients make changes (sales, stock movements) while offline, queue them locally, and push them to the backend when connectivity is restored. The backend must process these batches **asynchronously** to avoid blocking the API and to handle conflicts, deduplication, and ordering.

Additionally, the system should notify store owners when stock runs low, when a sync fails, or with periodic summaries.

---

## 1. Benefits

### Offline Sync (`sync-offline` queue)
- **Resilience**: Clients never lose data. Sales and stock changes queued offline are eventually consistent.
- **UX**: No "no internet" errors. Users work uninterrupted.
- **Scalability**: Sync processing scales independently from the API via a dedicated worker pool.
- **Ordering guarantees**: Events are processed in the order they were created (per store), preventing data races.

### Notifications (`notifications` queue)
- **Low-stock alerts**: Owners receive real-time alerts when stock hits a threshold.
- **Operational awareness**: Daily summary of sales, cash movements, and pending syncs.
- **Proactive restocking**: Reduces lost sales from out-of-stock items.

---

## 2. Architecture

```
                          ┌──────────────────┐
                          │   FastAPI (API)   │
                          │  /sync/batch      │
                          │  /sync/changes    │
                          └──────┬───────────┘
                                 │ enqueue
                          ┌──────▼───────────┐
                          │    Redis          │
                          │ (message broker)  │
                          └──────┬───────────┘
                                 │ consume
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐
     │ Sync Worker(s)  │  │ Notif Worker │  │  Beat        │
     │ sync-offline q  │  │ notifs q     │  │ cron trigger │
     └────────┬───────┘  └──────┬───────┘  └──────┬───────┘
              │                 │                 │
              ▼                 ▼                 ▼
        ┌──────────┐    ┌──────────┐     ┌──────────┐
        │ Postgres  │    │ Email/   │     │  Redis    │
        │ (state)   │    │ Push/FCM │     │ (schedules)│
        └──────────┘    └──────────┘     └──────────┘
```

### Componentes
- **Redis**: Message broker (Celery) + result backend. Also stores beat schedule metadata.
- **Celery Worker**: Consumes `sync-offline` and `notifications` queues.
- **Celery Beat**: Triggers periodic tasks (sync retries, low-stock checks, daily reports).
- **FastAPI**: Enqueues tasks via `IQueueService` (Celery), returns 202 Accepted.

---

## 3. Implementation Plan

### 3.1 Project Structure (when implemented)

```
src/infrastructure/services/queue/
├── celery_app.py            # Celery app config (broker, routes, beat)
├── queue_service.py         # CeleryQueueService implements IQueueService
├── tasks/
│   ├── __init__.py
│   ├── sync_tasks.py        # process_sync_queue, retry_failed_syncs
│   └── notification_tasks.py # notify_low_stock, daily_summary
```

### 3.2 Celery Configuration

```python
celery_app = Celery(
    "inventory",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.infrastructure.services.queue.tasks.sync_tasks",
        "src.infrastructure.services.queue.tasks.notification_tasks",
    ],
)

celery_app.conf.task_routes = {
    "sync_tasks.*": {"queue": "sync-offline"},
    "notification_tasks.*": {"queue": "notifications"},
}

celery_app.conf.beat_schedule = {
    "sync-every-5-minutes": {
        "task": "sync_tasks.process_sync_queue",
        "schedule": 300.0,
    },
    "check-low-stock-daily": {
        "task": "notification_tasks.check_low_stock",
        "schedule": crontab(hour=8, minute=0),
    },
}
```

### 3.3 Sync Task — `process_sync_queue`

Purpose: Pick up pending sync batches and apply them to the database.

```python
@shared_task(bind=True, max_retries=5, acks_late=True, default_retry_delay=30)
def process_sync_queue(self):
    """Process one pending sync batch from the database."""
    sync_repo = SyncRepository(...)

    pending = sync_repo.get_pending_batches(limit=50)
    for batch in pending:
        try:
            sync_repo.apply_batch(batch)
            sync_repo.mark_batch_completed(batch.id)
        except ConflicError as exc:
            sync_repo.mark_batch_failed(batch.id, str(exc))
        except Exception as exc:
            self.retry(exc=exc)
```

Design decisions:
- **acks_late=True**: Task is re-delivered if worker crashes mid-processing.
- **max_retries=5, default_retry_delay=30**: Exponential backoff for transient failures.
- **Batch limit (50)**: Prevents a single worker from hogging all pending work.
- **Transactional per batch**: Each batch is one unit of work. If it fails, only that batch is retried.

### 3.4 Notification Task — `notify_low_stock`

```python
@shared_task(max_retries=3, default_retry_delay=60)
def notify_low_stock(store_id: str, product_name: str, stock: int):
    """Send low-stock alert to store owner."""
    owner = user_repo.get_store_owner(store_id)
    if not owner:
        return
    send_email(
        to=owner.email,
        subject=f"Low stock: {product_name}",
        body=f"Only {stock} units left for {product_name}.",
    )
```

### 3.5 Periodic Low-Stock Check

```python
@shared_task
def check_low_stock():
    """Scan all products below threshold and trigger notifications."""
    products = product_repo.find_below_min_stock()
    for product in products:
        notify_low_stock.delay(
            store_id=str(product.store_id),
            product_name=product.name,
            stock=product.stock,
        )
```

### 3.6 Enqueue from FastAPI

```python
class CeleryQueueService(IQueueService):
    async def enqueue(self, task_name: str, args: tuple = (), kwargs: dict | None = None) -> None:
        celery_app.send_task(task_name, args=args, kwargs=kwargs or {})

# Usage in a use case:
class ProcessSyncBatchUseCase:
    def __init__(self, queue: IQueueService, ...):
        self._queue = queue

    async def execute(self, ...):
        # save batch to DB
        await self._queue.enqueue("sync_tasks.process_sync_queue")
```

---

## 4. Conflict Resolution Strategy

| Scenario | Resolution |
|---|---|
| Product price changed offline + online | Last-writer-wins (based on `updated_at`) |
| Sale for deleted product | Reject batch, notify client |
| Duplicate `device_change_id` | Idempotency key — skip batch silently |
| Concurrent batches for same store | Process sequentially (lock per store) |

### Lock per store (optional)

Use Redis lock to prevent concurrent processing of the same store:

```python
@shared_task(bind=True)
def process_sync_queue(self, store_id: str):
    lock_key = f"sync:lock:{store_id}"
    lock = redis_client.lock(lock_key, timeout=120)
    if not lock.acquire(blocking=False):
        return  # Another worker is handling this store
    try:
        ...
    finally:
        lock.release()
```

---

## 5. Monitoring & Observability

- **Task success/failure rates** in Flower (Celery monitoring) or Sentry.
- **Queue depth** in Redis (`LLEN sync-offline`).
- **Pending batches** query in Postgres (`SELECT COUNT(*) FROM sync_changes WHERE status = 'pending'`).
- **Sentry integration** via `celery_app.conf.task_track_started = True`.

---

## 6. Docker Compose (when implemented)

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  celery-worker:
    build: .
    env_file: .env
    depends_on:
      - db
      - redis
    command: celery -A src.infrastructure.services.queue.celery_app worker --loglevel=info --concurrency=4

  celery-beat:
    build: .
    env_file: .env
    depends_on:
      - db
      - redis
    command: celery -A src.infrastructure.services.queue.celery_app beat --loglevel=info
```

---

## 7. Dependencies

```toml
dependencies = [
    "celery>=5.4",
    "redis>=5.2",
]
```

---

## 8. Future Enhancements

- **WebSockets**: Push real-time notifications to web/mobile clients instead of email.
- **Retry dead-letter queue**: Failed tasks after max retries go to a dead-letter queue for manual inspection.
- **Backpressure**: If Redis queue grows beyond a threshold, the API enqueue endpoint returns 503.
- **Rate-limiting per store**: Prevent a buggy client from flooding the queue.
