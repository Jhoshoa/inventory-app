from fastapi import APIRouter, Depends
from src.application.dto.sync_dto import SyncPushDTO, SyncPullDTO, SyncResponseDTO
from src.application.use_cases.sync.sync_push import SyncPushUseCase, SyncPushInput
from src.application.use_cases.sync.sync_pull import SyncPullUseCase, SyncPullInput
from src.presentation.dependencies import get_current_user, get_sync_repo
from src.infrastructure.database.repositories.sync_repository import SyncRepository
from datetime import datetime, timezone
from uuid import UUID

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/push")
async def sync_push(
    dto: SyncPushDTO,
    user: dict = Depends(get_current_user),
    repo: SyncRepository = Depends(get_sync_repo),
):
    use_case = SyncPushUseCase(repo)
    await use_case.execute(SyncPushInput(store_id=UUID(str(user["store_id"])), changes=dto.changes))
    return {"status": "ok"}


@router.post("/pull", response_model=SyncResponseDTO)
async def sync_pull(
    dto: SyncPullDTO,
    user: dict = Depends(get_current_user),
    repo: SyncRepository = Depends(get_sync_repo),
):
    use_case = SyncPullUseCase(repo)
    updates = await use_case.execute(SyncPullInput(store_id=UUID(str(user["store_id"])), since=dto.since))
    return SyncResponseDTO(updates=updates, server_time=datetime.now(timezone.utc))
