from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from src.application.dto.sync_dto import (
    SyncPullDTO,
    SyncPullResponseDTO,
    SyncPushDTO,
    SyncPushResponseDTO,
)
from src.application.use_cases.sync.sync_pull import SyncPullInput, SyncPullUseCase
from src.application.use_cases.sync.sync_push import SyncPushInput, SyncPushUseCase
from src.infrastructure.database.repositories.sync_repository import SyncRepository
from src.presentation.dependencies import get_sync_repo, require_active_user

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/push", response_model=SyncPushResponseDTO)
async def sync_push(
    dto: SyncPushDTO,
    user=Depends(require_active_user),
    repo: SyncRepository = Depends(get_sync_repo),
):
    use_case = SyncPushUseCase(repo)
    server_time = datetime.now(timezone.utc)
    results = await use_case.execute(
        SyncPushInput(
            store_id=user.store_id,
            device_id=dto.device_id,
            changes=dto.changes,
            user_id=user.id,
            user_role=user.role,
        )
    )
    return SyncPushResponseDTO(results=results, server_time=server_time)


@router.post("/pull", response_model=SyncPullResponseDTO)
async def sync_pull(
    dto: SyncPullDTO,
    user=Depends(require_active_user),
    repo: SyncRepository = Depends(get_sync_repo),
):
    use_case = SyncPullUseCase(repo)
    changes = await use_case.execute(
        SyncPullInput(
            store_id=user.store_id,
            device_id=dto.device_id,
            since=dto.since,
        )
    )
    return SyncPullResponseDTO(changes=changes, server_time=datetime.now(timezone.utc))
