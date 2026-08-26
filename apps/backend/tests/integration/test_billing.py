from datetime import UTC, datetime, timedelta

from src.application.use_cases.trials.expire_trials import ExpireTrialsUseCase
from src.application.use_cases.trials.process_grace_period import (
    ProcessGracePeriodUseCase,
)
from src.infrastructure.database.models import StoreModel, UserModel
from src.infrastructure.database.repositories.billing_audit_log_repository import (
    BillingAuditLogRepository,
)
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.presentation import dependencies


async def test_owner_can_request_checkout_and_it_is_audited(client, db_session):
    response = await client.post("/api/v1/billing/checkout")

    assert response.status_code == 200
    data = response.json()
    assert data["store_name"] == "Dev Store"

    audit_repo = BillingAuditLogRepository(db_session)
    history = await audit_repo.list_by_store(dependencies.DEV_STORE_ID)
    assert len(history) == 1
    assert history[0].reason == "payment_requested"
    assert history[0].changed_by == dependencies.DEV_USER_ID


async def test_billing_history_lists_entries_for_own_store_only(client, db_session):
    other_store_id = dependencies.DEV_STORE_ID.__class__(int=999999)
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    await db_session.commit()

    audit_repo = BillingAuditLogRepository(db_session)
    from src.domain.entities.billing_audit_log import BillingAuditLogEntry

    await audit_repo.save(
        BillingAuditLogEntry.create(store_id=dependencies.DEV_STORE_ID, reason="payment_requested")
    )
    await audit_repo.save(BillingAuditLogEntry.create(store_id=other_store_id, reason="payment_requested"))
    await db_session.commit()

    response = await client.get("/api/v1/billing/history")

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1


async def test_admin_billing_requires_platform_admin_role(client):
    response = await client.patch(
        f"/api/v1/billing/admin/stores/{dependencies.DEV_STORE_ID}/billing",
        json={"subscription_status": "active", "reason": "pago confirmado"},
    )

    assert response.status_code == 403


async def test_admin_billing_updates_any_store_when_platform_admin(client, db_session):
    db_session.add(
        UserModel(
            id=dependencies.DEV_USER_ID.__class__(int=555),
            email="admin@platform.dev",
            full_name="Admin",
            role="owner",
            store_id=dependencies.DEV_STORE_ID,
            is_active=True,
            is_platform_admin=True,
        )
    )
    await db_session.commit()

    from src.main import app

    async def override_current_user():
        return {
            "id": dependencies.DEV_USER_ID.__class__(int=555),
            "email": "admin@platform.dev",
            "store_id": dependencies.DEV_STORE_ID,
        }

    app.dependency_overrides[dependencies.get_current_user] = override_current_user

    try:
        response = await client.patch(
            f"/api/v1/billing/admin/stores/{dependencies.DEV_STORE_ID}/billing",
            json={"subscription_status": "active", "reason": "pago confirmado por transferencia"},
        )
    finally:
        app.dependency_overrides[dependencies.get_current_user] = _default_override

    assert response.status_code == 200

    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    assert store.subscription_status == "active"
    assert store.access_status == "active"

    audit_repo = BillingAuditLogRepository(db_session)
    history = await audit_repo.list_by_store(dependencies.DEV_STORE_ID)
    assert any(entry.reason == "pago confirmado por transferencia" for entry in history)


async def _default_override():
    return {
        "id": dependencies.DEV_USER_ID,
        "email": "dev@local.dev",
        "store_id": dependencies.DEV_STORE_ID,
    }


async def test_admin_billing_rejects_invalid_subscription_status(client, db_session):
    db_session.add(
        UserModel(
            id=dependencies.DEV_USER_ID.__class__(int=556),
            email="admin2@platform.dev",
            full_name="Admin",
            role="owner",
            store_id=dependencies.DEV_STORE_ID,
            is_active=True,
            is_platform_admin=True,
        )
    )
    await db_session.commit()

    from src.main import app

    async def override_current_user():
        return {
            "id": dependencies.DEV_USER_ID.__class__(int=556),
            "email": "admin2@platform.dev",
            "store_id": dependencies.DEV_STORE_ID,
        }

    app.dependency_overrides[dependencies.get_current_user] = override_current_user

    try:
        response = await client.patch(
            f"/api/v1/billing/admin/stores/{dependencies.DEV_STORE_ID}/billing",
            json={"subscription_status": "not_a_real_status", "reason": "prueba invalida"},
        )
    finally:
        app.dependency_overrides[dependencies.get_current_user] = _default_override

    assert response.status_code == 422


async def test_admin_billing_rejects_short_reason(client, db_session):
    db_session.add(
        UserModel(
            id=dependencies.DEV_USER_ID.__class__(int=557),
            email="admin3@platform.dev",
            full_name="Admin",
            role="owner",
            store_id=dependencies.DEV_STORE_ID,
            is_active=True,
            is_platform_admin=True,
        )
    )
    await db_session.commit()

    from src.main import app

    async def override_current_user():
        return {
            "id": dependencies.DEV_USER_ID.__class__(int=557),
            "email": "admin3@platform.dev",
            "store_id": dependencies.DEV_STORE_ID,
        }

    app.dependency_overrides[dependencies.get_current_user] = override_current_user

    try:
        response = await client.patch(
            f"/api/v1/billing/admin/stores/{dependencies.DEV_STORE_ID}/billing",
            json={"subscription_status": "active", "reason": "ok"},
        )
    finally:
        app.dependency_overrides[dependencies.get_current_user] = _default_override

    assert response.status_code == 422


async def test_billing_history_rejects_invalid_pagination_params(client):
    response = await client.get("/api/v1/billing/history", params={"limit": -5})
    assert response.status_code == 422

    response = await client.get("/api/v1/billing/history", params={"offset": -1})
    assert response.status_code == 422

    response = await client.get("/api/v1/billing/history", params={"limit": 1000})
    assert response.status_code == 422


async def test_admin_billing_sets_grace_period_when_past_due(db_session):
    store_repo = StoreRepository(db_session)
    audit_repo = BillingAuditLogRepository(db_session)

    from src.application.use_cases.billing.admin_update_billing import (
        AdminUpdateBillingInput,
        AdminUpdateBillingUseCase,
    )

    await AdminUpdateBillingUseCase(store_repo, audit_repo).execute(
        AdminUpdateBillingInput(
            store_id=dependencies.DEV_STORE_ID,
            admin_id=dependencies.DEV_USER_ID,
            admin_email="admin@platform.dev",
            reason="pago fallido reportado por proveedor",
            subscription_status="past_due",
        )
    )
    await db_session.commit()

    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    assert store.subscription_status == "past_due"
    assert store.grace_period_started_at is not None


async def test_expire_trials_writes_audit_entry(db_session):
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.subscription_status = "trial"
    store.access_status = "active"
    store.trial_expires_at = datetime.now(UTC) - timedelta(days=1)
    await db_session.commit()

    store_repo = StoreRepository(db_session)
    audit_repo = BillingAuditLogRepository(db_session)
    count = await ExpireTrialsUseCase(store_repo, audit_repo).execute()
    await db_session.commit()

    assert count == 1
    history = await audit_repo.list_by_store(dependencies.DEV_STORE_ID)
    assert any(entry.reason == "trial_expired" for entry in history)

    refreshed = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    assert refreshed.access_status == "suspended"


async def test_process_grace_period_writes_audit_entry(db_session):
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.subscription_status = "past_due"
    store.access_status = "active"
    store.grace_period_started_at = datetime.now(UTC) - timedelta(days=999)
    await db_session.commit()

    store_repo = StoreRepository(db_session)
    audit_repo = BillingAuditLogRepository(db_session)
    count = await ProcessGracePeriodUseCase(store_repo, audit_repo).execute()
    await db_session.commit()

    assert count == 1
    history = await audit_repo.list_by_store(dependencies.DEV_STORE_ID)
    assert any(entry.reason == "grace_period_expired" for entry in history)
