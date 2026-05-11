from celery import shared_task


@shared_task(bind=True, max_retries=5, acks_late=True)
def process_sync_queue(self):
    pass
