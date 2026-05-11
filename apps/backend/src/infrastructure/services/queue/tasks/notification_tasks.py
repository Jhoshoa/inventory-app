from celery import shared_task


@shared_task(max_retries=3)
def notify_low_stock(store_id: str, product_name: str, stock: int):
    pass
