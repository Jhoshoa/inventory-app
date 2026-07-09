from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from src.application.dto.billing_dto import BillingStatusResponse, UpdateBillingRequest
from src.application.use_cases.trials.trial_status import BillingStatusUseCase
from src.config.settings import settings
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.presentation.dependencies import (
    get_store_repo,
    require_owner,
)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/status", response_model=BillingStatusResponse)
async def billing_status(
    user=Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    uc = BillingStatusUseCase(store_repo)
    return await uc.execute(user.store_id)


@router.patch("/admin/stores/{store_id}/billing")
async def update_billing(
    store_id: UUID,
    dto: UpdateBillingRequest,
    user=Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if not settings.DEBUG:
        raise HTTPException(status_code=403, detail="Solo disponible en modo debug")

    if store_id != user.store_id:
        raise HTTPException(status_code=403, detail="No puedes modificar la facturacion de otra tienda")

    await store_repo.update_subscription(
        store_id,
        subscription_status=dto.subscription_status,
        next_billing_date=dto.next_billing_date,
        billing_email=dto.billing_email,
        billing_nit=dto.billing_nit,
        billing_razon_social=dto.billing_razon_social,
    )

    if dto.subscription_status == "active":
        await store_repo.update_access_status(store_id, "active")

    return {"ok": True}
