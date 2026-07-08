from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.import_job import ImportJob


class IImportJobRepository(ABC):
    @abstractmethod
    async def save(self, job: ImportJob) -> ImportJob:
        ...

    @abstractmethod
    async def get_by_id(self, store_id: UUID, job_id: UUID) -> ImportJob | None:
        ...

    @abstractmethod
    async def list_by_store(self, store_id: UUID, limit: int = 50) -> list[ImportJob]:
        ...
