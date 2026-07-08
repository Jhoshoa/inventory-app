from dataclasses import dataclass
from datetime import datetime, timezone
from enum import StrEnum
from uuid import UUID, uuid4


class ImportJobStatus(StrEnum):
    VALIDATING = "validating"
    INSERTING = "inserting"
    COMPLETED = "completed"


@dataclass
class RowError:
    row: int
    field: str
    message: str


@dataclass
class ImportJob:
    id: UUID
    store_id: UUID
    user_id: UUID
    status: ImportJobStatus
    total_rows: int
    imported_count: int
    error_count: int
    errors: list[RowError]
    filename: str
    created_at: datetime
    completed_at: datetime | None = None

    @staticmethod
    def create(
        store_id: UUID,
        user_id: UUID,
        filename: str,
    ) -> "ImportJob":
        return ImportJob(
            id=uuid4(),
            store_id=store_id,
            user_id=user_id,
            status=ImportJobStatus.VALIDATING,
            total_rows=0,
            imported_count=0,
            error_count=0,
            errors=[],
            filename=filename,
            created_at=datetime.now(timezone.utc),
        )

    def complete(self, total_rows: int, imported_count: int, errors: list[RowError]) -> None:
        self.status = ImportJobStatus.COMPLETED
        self.total_rows = total_rows
        self.imported_count = imported_count
        self.error_count = len(errors)
        self.errors = errors
        self.completed_at = datetime.now(timezone.utc)
