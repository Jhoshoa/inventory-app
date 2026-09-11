from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from src.application.dto.storefront_request_dto import (
    StorefrontRequestListResponseDTO,
    StorefrontRequestResponseDTO,
    UpdateStorefrontRequestPaymentDTO,
    UpdateStorefrontRequestStatusDTO,
)
from src.application.exceptions import NotFoundError
from src.application.use_cases.storefront_requests.list_storefront_requests import (
    ListStorefrontRequestsUseCase,
)
from src.application.use_cases.storefront_requests.update_storefront_request_payment import (
    UpdateStorefrontRequestPaymentInput,
    UpdateStorefrontRequestPaymentUseCase,
)
from src.application.use_cases.storefront_requests.update_storefront_request_status import (
    UpdateStorefrontRequestStatusInput,
    UpdateStorefrontRequestStatusUseCase,
)
from src.infrastructure.database.repositories.storefront_request_repository import (
    StorefrontRequestRepository,
)
from src.presentation.dependencies import get_storefront_request_repo, require_active_user

router = APIRouter(prefix="/storefront-requests", tags=["storefront-requests"])


@router.get("", response_model=StorefrontRequestListResponseDTO)
async def list_storefront_requests(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_active_user),
    repo: StorefrontRequestRepository = Depends(get_storefront_request_repo),
):
    result = await ListStorefrontRequestsUseCase(repo).execute(
        user.store_id, limit=limit, offset=offset
    )
    return StorefrontRequestListResponseDTO(
        items=result.items,
        total=result.total,
        pending_count=result.pending_count,
        limit=limit,
        offset=offset,
    )


@router.patch("/{request_id}/status", response_model=StorefrontRequestResponseDTO)
async def update_storefront_request_status(
    request_id: UUID,
    dto: UpdateStorefrontRequestStatusDTO,
    user=Depends(require_active_user),
    repo: StorefrontRequestRepository = Depends(get_storefront_request_repo),
):
    try:
        return await UpdateStorefrontRequestStatusUseCase(repo).execute(
            UpdateStorefrontRequestStatusInput(
                store_id=user.store_id,
                request_id=request_id,
                status=dto.status,
            )
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.patch("/{request_id}/payment", response_model=StorefrontRequestResponseDTO)
async def update_storefront_request_payment(
    request_id: UUID,
    dto: UpdateStorefrontRequestPaymentDTO,
    user=Depends(require_active_user),
    repo: StorefrontRequestRepository = Depends(get_storefront_request_repo),
):
    try:
        return await UpdateStorefrontRequestPaymentUseCase(repo).execute(
            UpdateStorefrontRequestPaymentInput(
                store_id=user.store_id,
                request_id=request_id,
                payment_confirmed=dto.payment_confirmed,
            )
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
