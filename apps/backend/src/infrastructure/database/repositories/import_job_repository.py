from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.import_job import ImportJob, ImportJobStatus, RowError
from src.domain.repositories.import_job_repository import IImportJobRepository
from src.infrastructure.database.models.import_job_model import ImportJobModel


class ImportJobRepository(IImportJobRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, job: ImportJob) -> ImportJob:
        model = await self._session.get(ImportJobModel, job.id)
        if model is None:
            model = ImportJobModel(
                id=job.id,
                store_id=job.store_id,
                user_id=job.user_id,
            )
            self._session.add(model)
        model.status = job.status
        model.total_rows = job.total_rows
        model.imported_count = job.imported_count
        model.error_count = job.error_count
        model.errors = [{"row": e.row, "field": e.field, "message": e.message} for e in job.errors]
        model.filename = job.filename
        model.completed_at = job.completed_at
        await self._session.flush()
        return job

    async def get_by_id(self, store_id: UUID, job_id: UUID) -> ImportJob | None:
        result = await self._session.execute(
            select(ImportJobModel).where(
                ImportJobModel.store_id == store_id,
                ImportJobModel.id == job_id,
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_store(self, store_id: UUID, limit: int = 50) -> list[ImportJob]:
        result = await self._session.execute(
            select(ImportJobModel)
            .where(ImportJobModel.store_id == store_id)
            .order_by(ImportJobModel.created_at.desc())
            .limit(limit)
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    def _to_entity(self, model: ImportJobModel) -> ImportJob:
        return ImportJob(
            id=model.id,
            store_id=model.store_id,
            user_id=model.user_id,
            status=ImportJobStatus(model.status),
            total_rows=model.total_rows,
            imported_count=model.imported_count,
            error_count=model.error_count,
            errors=[
                RowError(row=e["row"], field=e["field"], message=e["message"])
                for e in (model.errors or [])
            ],
            filename=model.filename,
            created_at=model.created_at,
            completed_at=model.completed_at,
        )
