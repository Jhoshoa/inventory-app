from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.user_dto import (
    UpdateUserRoleDTO,
    UpdateUserStatusDTO,
    UserListResponseDTO,
    UserResponseDTO,
)
from src.application.use_cases.users.list_users import ListUsersInput, ListUsersUseCase
from src.application.use_cases.users.update_user_role import (
    UpdateUserRoleInput,
    UpdateUserRoleUseCase,
)
from src.application.use_cases.users.update_user_status import (
    UpdateUserStatusInput,
    UpdateUserStatusUseCase,
)
from src.infrastructure.database.repositories.user_repository import UserRepository
from src.presentation.dependencies import get_user_repo, require_owner

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponseDTO)
async def list_users(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_owner),
    repo: UserRepository = Depends(get_user_repo),
):
    users, total = await ListUsersUseCase(repo).execute(
        ListUsersInput(store_id=current_user.store_id, limit=limit, offset=offset)
    )
    return UserListResponseDTO(items=users, total=total, limit=limit, offset=offset)


@router.patch("/{user_id}/role", response_model=UserResponseDTO)
async def update_user_role(
    user_id: UUID,
    dto: UpdateUserRoleDTO,
    current_user=Depends(require_owner),
    repo: UserRepository = Depends(get_user_repo),
):
    return await UpdateUserRoleUseCase(repo).execute(
        UpdateUserRoleInput(
            store_id=current_user.store_id,
            actor_user_id=current_user.id,
            user_id=user_id,
            role=dto.role.value,
        )
    )


@router.patch("/{user_id}/status", response_model=UserResponseDTO)
async def update_user_status(
    user_id: UUID,
    dto: UpdateUserStatusDTO,
    current_user=Depends(require_owner),
    repo: UserRepository = Depends(get_user_repo),
):
    return await UpdateUserStatusUseCase(repo).execute(
        UpdateUserStatusInput(
            store_id=current_user.store_id,
            actor_user_id=current_user.id,
            user_id=user_id,
            is_active=dto.is_active,
        )
    )
