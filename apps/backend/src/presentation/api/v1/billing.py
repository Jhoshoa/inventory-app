from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.application.dto.billing_dto import (
    BillingHistoryResponse,
    BillingStatusResponse,
    CheckoutResponse,
    UpdateBillingRequest,
)
from src.application.use_cases.billing.admin_update_billing import (
    AdminUpdateBillingInput,
    AdminUpdateBillingUseCase,
)
from src.application.use_cases.billing.list_billing_history import (
    ListBillingHistoryInput,
    ListBillingHistoryUseCase,
)
from src.application.use_cases.billing.request_manual_payment import (
    RequestManualPaymentInput,
    RequestManualPaymentUseCase,
)
from src.application.use_cases.trials.trial_status import BillingStatusUseCase
from src.infrastructure.database.repositories.billing_audit_log_repository import (
    BillingAuditLogRepository,
)
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.presentation.dependencies import (
    get_billing_audit_log_repo,
    get_store_repo,
    require_owner,
    require_platform_admin,
)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/status", response_model=BillingStatusResponse)
async def billing_status(
    user=Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    uc = BillingStatusUseCase(store_repo)
    return await uc.execute(user.store_id)


@router.post("/checkout", response_model=CheckoutResponse)
async def request_checkout(
    user=Depends(require_owner),
    store_repo: StoreRepository = Depends(get_store_repo),
    audit_repo: BillingAuditLogRepository = Depends(get_billing_audit_log_repo),
):
    uc = RequestManualPaymentUseCase(store_repo, audit_repo)
    return await uc.execute(
        RequestManualPaymentInput(
            store_id=user.store_id,
            requested_by=user.id,
            requested_by_email=user.email,
        )
    )


@router.get("/history", response_model=BillingHistoryResponse)
async def billing_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user=Depends(require_owner),
    audit_repo: BillingAuditLogRepository = Depends(get_billing_audit_log_repo),
):
    uc = ListBillingHistoryUseCase(audit_repo)
    items = await uc.execute(
        ListBillingHistoryInput(store_id=user.store_id, limit=limit, offset=offset)
    )
    return BillingHistoryResponse(items=items)


@router.patch("/admin/stores/{store_id}/billing")
async def update_billing(
    store_id: UUID,
    dto: UpdateBillingRequest,
    user=Depends(require_platform_admin),
    store_repo: StoreRepository = Depends(get_store_repo),
    audit_repo: BillingAuditLogRepository = Depends(get_billing_audit_log_repo),
):
    uc = AdminUpdateBillingUseCase(store_repo, audit_repo)
    await uc.execute(
        AdminUpdateBillingInput(
            store_id=store_id,
            admin_id=user.id,
            admin_email=user.email,
            reason=dto.reason,
            subscription_status=dto.subscription_status,
            next_billing_date=dto.next_billing_date,
            billing_email=dto.billing_email,
            billing_nit=dto.billing_nit,
            billing_razon_social=dto.billing_razon_social,
        )
    )
    return {"ok": True}
