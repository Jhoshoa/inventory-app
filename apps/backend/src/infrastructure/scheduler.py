import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from src.application.use_cases.trials.archive_stores import ArchiveStoresUseCase
from src.application.use_cases.trials.expire_trials import ExpireTrialsUseCase
from src.application.use_cases.trials.process_grace_period import (
    ProcessGracePeriodUseCase,
)
from src.config.database import AsyncSessionLocal
from src.infrastructure.database.repositories.billing_audit_log_repository import (
    BillingAuditLogRepository,
)
from src.infrastructure.database.repositories.store_repository import StoreRepository

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def _run_expire_trials() -> None:
    async with AsyncSessionLocal() as session:
        try:
            store_repo = StoreRepository(session)
            audit_repo = BillingAuditLogRepository(session)
            count = await ExpireTrialsUseCase(store_repo, audit_repo).execute()
            await session.commit()
            logger.info("scheduler.expire_trials suspended_count=%s", count)
        except Exception:
            await session.rollback()
            logger.exception("scheduler.expire_trials failed")


async def _run_process_grace_period() -> None:
    async with AsyncSessionLocal() as session:
        try:
            store_repo = StoreRepository(session)
            audit_repo = BillingAuditLogRepository(session)
            count = await ProcessGracePeriodUseCase(store_repo, audit_repo).execute()
            await session.commit()
            logger.info("scheduler.process_grace_period suspended_count=%s", count)
        except Exception:
            await session.rollback()
            logger.exception("scheduler.process_grace_period failed")


async def _run_archive_stores() -> None:
    async with AsyncSessionLocal() as session:
        try:
            store_repo = StoreRepository(session)
            audit_repo = BillingAuditLogRepository(session)
            count = await ArchiveStoresUseCase(store_repo, audit_repo).execute()
            await session.commit()
            logger.info("scheduler.archive_stores archived_count=%s", count)
        except Exception:
            await session.rollback()
            logger.exception("scheduler.archive_stores failed")


def start_scheduler() -> None:
    if scheduler.running:
        return
    # Job store en memoria (default): el schedule se re-registra cada vez que
    # arranca la app. No hace falta persistencia porque el cron corre a diario
    # mientras el proceso este vivo; si el proceso estuvo caido justo a la hora
    # programada, misfire_grace_time permite que igual corra poco despues del
    # siguiente arranque.
    scheduler.add_job(
        _run_expire_trials,
        "cron",
        hour=8,
        minute=0,
        id="expire_trials",
        misfire_grace_time=3600,
        replace_existing=True,
    )
    scheduler.add_job(
        _run_process_grace_period,
        "cron",
        hour=8,
        minute=5,
        id="process_grace_period",
        misfire_grace_time=3600,
        replace_existing=True,
    )
    scheduler.add_job(
        _run_archive_stores,
        "cron",
        hour=8,
        minute=10,
        id="archive_stores",
        misfire_grace_time=3600,
        replace_existing=True,
    )
    scheduler.start()
    logger.info("scheduler.started")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("scheduler.stopped")
