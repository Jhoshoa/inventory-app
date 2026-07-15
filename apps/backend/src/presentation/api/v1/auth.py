import asyncio
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.errors import AuthApiError

from src.application.dto.auth_dto import (
    AuthResponseDTO,
    CurrentUserDTO,
    LoginDTO,
    OAuthCallbackDTO,
    RefreshTokenDTO,
    RegisterDTO,
    RegisterSuccessDTO,
)
from src.application.exceptions import UnauthorizedError
from src.application.use_cases.auth.ensure_local_user import (
    EnsureLocalUserInput,
    EnsureLocalUserUseCase,
)
from src.application.use_cases.auth.register_store_owner import (
    RegisterStoreOwnerInput,
    RegisterStoreOwnerUseCase,
)
from src.application.use_cases.trials.expire_trials import ExpireTrialsUseCase
from src.application.use_cases.trials.trial_status import BillingStatusUseCase
from src.config.settings import settings
from src.domain.entities.store import Store
from src.infrastructure.auth.password import hash_password, verify_password
from src.infrastructure.auth.supabase_client import get_supabase_client
from src.infrastructure.database.models.pkce_verifier_model import PkceVerifierModel
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.database.repositories.user_repository import UserRepository
from src.presentation.dependencies import (
    DEV_ACCESS_TOKEN,
    DEV_CASHIER_ACCESS_TOKEN,
    DEV_CASHIER_USER_ID,
    DEV_STORE_ID,
    DEV_USER_ID,
    get_current_user_context,
    get_db_session,
    get_store_repo,
    get_user_repo,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

_PKCE_VERIFIER_TTL = timedelta(minutes=10)


def _auth_response_from_supabase(response) -> AuthResponseDTO:
    session = response.session
    user = response.user
    if not session or not user:
        raise PermissionError("Credenciales invalidas")
    return AuthResponseDTO(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "store_id": user.user_metadata.get("store_id"),
            "store_name": user.user_metadata.get("store_name"),
            "full_name": user.user_metadata.get("full_name"),
            "role": user.user_metadata.get("role"),
        },
    )


def _auth_response(
    access_token: str,
    refresh_token: str,
    *,
    user_id,
    email,
    store_id,
    full_name,
    role: str,
    store_name: str | None = None,
    trial_expires_at: datetime | None = None,
    days_until_trial_ends: int | None = None,
    subscription_status: str = "trial",
    access_status: str = "active",
) -> AuthResponseDTO:
    return AuthResponseDTO(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user_id),
            "email": email,
            "store_id": str(store_id),
            "store_name": store_name,
            "full_name": full_name,
            "role": role,
            "trial_expires_at": trial_expires_at.isoformat() if trial_expires_at else None,
            "days_until_trial_ends": days_until_trial_ends,
            "subscription_status": subscription_status,
            "access_status": access_status,
        },
    )


def _enrich_with_trial(response: AuthResponseDTO, store: Store | None) -> None:
    """Agrega datos de trial al dict user de la respuesta."""
    if store is None:
        return
    response.user["trial_expires_at"] = store.trial_expires_at.isoformat() if store.trial_expires_at else None
    response.user["days_until_trial_ends"] = store.days_until_trial_ends


def _dev_auth_response(
    email: str = "dev@local.dev",
    store_id=DEV_STORE_ID,
    user_id=DEV_USER_ID,
    role: str = "owner",
    full_name: str = "Dev User",
    store_name: str = "Mi Tienda Demo",
) -> AuthResponseDTO:
    access_token = DEV_CASHIER_ACCESS_TOKEN if role == "cashier" else DEV_ACCESS_TOKEN
    return AuthResponseDTO(
        access_token=access_token,
        refresh_token="dev-refresh-123",
        user={
            "id": str(user_id),
            "email": email,
            "store_id": str(store_id),
            "store_name": store_name,
            "full_name": full_name,
            "role": role,
        },
    )


@router.post("/login", response_model=AuthResponseDTO)
async def login(
    dto: LoginDTO,
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if settings.DEBUG:
        existing_with_pw = await user_repo.get_by_email_with_password(dto.email)
        if not existing_with_pw or not existing_with_pw[1]:
            raise HTTPException(status_code=401, detail="Credenciales invalidas")
        existing, password_hash = existing_with_pw
        if not verify_password(dto.password, password_hash):
            raise HTTPException(status_code=401, detail="Credenciales invalidas")

        local_user = await EnsureLocalUserUseCase(user_repo, store_repo).execute(
            EnsureLocalUserInput(
                user_id=existing.id,
                email=existing.email,
                store_id=existing.store_id,
                full_name=existing.full_name,
                role=existing.role,
                touch_login=True,
            )
        )
        store = await store_repo.get_by_id(local_user.store_id)
        return _auth_response(
            str(local_user.id),
            "dev-refresh-123",
            user_id=local_user.id,
            email=local_user.email,
            store_id=local_user.store_id,
            store_name=store.name if store else None,
            full_name=local_user.full_name,
            role=local_user.role,
            trial_expires_at=store.trial_expires_at if store else None,
            days_until_trial_ends=store.days_until_trial_ends if store else None,
            subscription_status=store.subscription_status if store else "trial",
            access_status=store.access_status if store else "active",
        )

    supabase = get_supabase_client()
    response = supabase.auth.sign_in_with_password(
        {"email": dto.email, "password": dto.password}
    )
    auth_response = _auth_response_from_supabase(response)
    raw_user = auth_response.user

    store_id = raw_user.get("store_id")
    if not store_id:
        existing = await user_repo.get_by_email(dto.email)
        if existing is None or existing.store_id is None:
            raise UnauthorizedError("No se pudo resolver la tienda del usuario")
        raw_user["store_id"] = str(existing.store_id)
    else:
        existing_store = await store_repo.get_by_id(UUID(str(store_id)))
        if existing_store is None:
            store = Store(
                id=UUID(str(store_id)),
                name=raw_user.get("store_name", raw_user.get("full_name", "Mi Tienda")),
            )
            store.trial_expires_at = Store.calculate_trial_expiry()
            await store_repo.save(store)

    local_user = await EnsureLocalUserUseCase(user_repo, store_repo).execute(
        EnsureLocalUserInput(
            user_id=UUID(str(raw_user["id"])),
            email=str(raw_user["email"]),
            store_id=UUID(str(raw_user["store_id"])),
            full_name=raw_user.get("full_name"),
            role=str(raw_user.get("role") or "cashier"),
            touch_login=True,
        )
    )
    store = await store_repo.get_by_id(local_user.store_id)
    if store is not None:
        now = datetime.now(timezone.utc)
        if store.access_status != "active":
            raise HTTPException(status_code=401, detail="Tu cuenta ha sido suspendida. Contacta a soporte.")
        if (store.subscription_status == "trial"
                and store.trial_expires_at is not None
                and now >= store.trial_expires_at):
            raise HTTPException(
                status_code=401,
                detail="Tu periodo de prueba ha expirado. "
                "Adquiere un plan para continuar usando la aplicacion.",
            )
        if (store.subscription_status == "past_due"
                and store.grace_period_started_at is not None
                and now >= store.grace_period_started_at + timedelta(days=settings.GRACE_PERIOD_DAYS)):
            raise HTTPException(
                status_code=401,
                detail="Tu suscripcion ha sido suspendida por falta de pago. "
                "Contacta a soporte para reactivar.",
            )
        if store.subscription_status == "expired":
            raise HTTPException(
                status_code=401,
                detail="Tu suscripcion ha expirado. "
                "Contacta a soporte para reactivar.",
            )
    if not local_user.is_active:
        raise UnauthorizedError("Usuario inactivo")
    return _auth_response(
        auth_response.access_token,
        auth_response.refresh_token,
        user_id=local_user.id,
        email=local_user.email,
        store_id=local_user.store_id,
        store_name=store.name if store else None,
        full_name=local_user.full_name,
        role=local_user.role,
        trial_expires_at=store.trial_expires_at if store else None,
        days_until_trial_ends=store.days_until_trial_ends if store else None,
        subscription_status=store.subscription_status if store else "trial",
        access_status=store.access_status if store else "active",
    )


@router.post("/register", status_code=201)
async def register(
    dto: RegisterDTO,
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if settings.DEBUG:
        await RegisterStoreOwnerUseCase(store_repo, user_repo).execute(
            RegisterStoreOwnerInput(
                user_id=uuid4(),
                email=dto.email,
                full_name=dto.full_name,
                store_name=dto.store_name,
                password_hash=hash_password(dto.password),
            )
        )
        return RegisterSuccessDTO(message="Tienda creada exitosamente. Ahora puedes iniciar sesion.")

    store_id = str(uuid4())
    supabase = get_supabase_client()
    try:
        response = supabase.auth.sign_up(
            {
                "email": dto.email,
                "password": dto.password,
                "options": {
                    "data": {
                        "full_name": dto.full_name,
                        "store_name": dto.store_name,
                        "store_id": store_id,
                        "role": "owner",
                    },
                    "redirect_to": f"{settings.FRONTEND_URL}/login?verified=true",
                },
            }
        )
    except AuthApiError as e:
        if "already registered" in str(e).lower():
            raise HTTPException(status_code=409, detail="Este email ya esta registrado")
        raise HTTPException(status_code=400, detail=str(e))

    if not response.session:
        return RegisterSuccessDTO(
            message="Revisa tu email para confirmar tu cuenta. Luego inicia sesion."
        )

    auth_response = _auth_response_from_supabase(response)
    result = await RegisterStoreOwnerUseCase(store_repo, user_repo).execute(
        RegisterStoreOwnerInput(
            user_id=UUID(str(auth_response.user["id"])),
            email=dto.email,
            full_name=dto.full_name,
            store_name=dto.store_name,
            store_id=UUID(store_id),
        )
    )
    return _auth_response(
        auth_response.access_token,
        auth_response.refresh_token,
        user_id=result.user.id,
        email=result.user.email,
        store_id=result.store.id,
        store_name=result.store.name,
        full_name=result.user.full_name,
        role=result.user.role,
        trial_expires_at=result.store.trial_expires_at,
        days_until_trial_ends=result.store.days_until_trial_ends,
        subscription_status=result.store.subscription_status,
        access_status=result.store.access_status,
    )


@router.post("/refresh", response_model=AuthResponseDTO)
async def refresh_token(
    dto: RefreshTokenDTO,
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if settings.DEBUG:
        return _dev_auth_response()

    supabase = get_supabase_client()
    response = supabase.auth.refresh_session(dto.refresh_token)
    auth_response = _auth_response_from_supabase(response)

    raw_user = auth_response.user
    local_user = await EnsureLocalUserUseCase(user_repo, store_repo).execute(
        EnsureLocalUserInput(
            user_id=UUID(str(raw_user["id"])),
            email=str(raw_user["email"]),
            store_id=UUID(str(raw_user["store_id"])),
            full_name=raw_user.get("full_name"),
            role=str(raw_user.get("role") or "cashier"),
            touch_login=True,
        )
    )
    if not local_user.is_active:
        raise UnauthorizedError("Usuario inactivo")

    store = await store_repo.get_by_id(local_user.store_id)
    return _auth_response(
        auth_response.access_token,
        auth_response.refresh_token,
        user_id=local_user.id,
        email=local_user.email,
        store_id=local_user.store_id,
        store_name=store.name if store else None,
        full_name=local_user.full_name,
        role=local_user.role,
        trial_expires_at=store.trial_expires_at if store else None,
        days_until_trial_ends=store.days_until_trial_ends if store else None,
        subscription_status=store.subscription_status if store else "trial",
        access_status=store.access_status if store else "active",
    )


@router.post("/dev-login", response_model=AuthResponseDTO)
async def dev_login(
    role: str = "owner",
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if not settings.DEBUG:
        raise PermissionError("Dev login is disabled")
    if role not in {"owner", "cashier"}:
        raise PermissionError("Rol dev invalido")
    is_cashier = role == "cashier"
    user_id = DEV_CASHIER_USER_ID if is_cashier else DEV_USER_ID
    email = "cashier@local.dev" if is_cashier else "dev@local.dev"
    full_name = "Demo Cashier" if is_cashier else "Dev User"
    await EnsureLocalUserUseCase(user_repo, store_repo).execute(
        EnsureLocalUserInput(
            user_id=user_id,
            email=email,
            store_id=DEV_STORE_ID,
            full_name=full_name,
            role=role,
            touch_login=True,
        )
    )
    return _dev_auth_response(email, user_id=user_id, role=role, full_name=full_name)


@router.post("/oauth/google")
async def oauth_google(
    session: AsyncSession = Depends(get_db_session),
):
    if settings.DEBUG or settings.ENVIRONMENT == "local":
        return {"url": f"{settings.FRONTEND_URL}/login?oauth=dev"}
    state = str(uuid4())
    redirect_to = f"{settings.FRONTEND_URL}/auth/callback?state={state}"
    supabase = get_supabase_client()
    response = supabase.auth.sign_in_with_oauth(
        {
            "provider": "google",
            "options": {"redirect_to": redirect_to},
        }
    )
    verifier_key = f"{supabase.auth._storage_key}-code-verifier"
    code_verifier = supabase.auth._storage.get_item(verifier_key)
    if code_verifier:
        try:
            session.add(PkceVerifierModel(state=state, code_verifier=code_verifier))
        except Exception:
            logger.exception("OAuth/google: error al guardar PKCE verifier en DB")
    return {"url": response.url}


@router.post("/oauth/callback", response_model=AuthResponseDTO)
async def oauth_callback(
    dto: OAuthCallbackDTO,
    session: AsyncSession = Depends(get_db_session),
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if settings.DEBUG or settings.ENVIRONMENT == "local":
        return _dev_auth_response()

    supabase = get_supabase_client()

    code_verifier = None
    if dto.state:
        try:
            cutoff = datetime.now(timezone.utc) - _PKCE_VERIFIER_TTL
            await session.execute(
                delete(PkceVerifierModel).where(PkceVerifierModel.created_at < cutoff)
            )
            result = await session.execute(
                select(PkceVerifierModel).where(PkceVerifierModel.state == dto.state)
            )
            verifier_row = result.scalar_one_or_none()
            if verifier_row:
                code_verifier = verifier_row.code_verifier
                await session.delete(verifier_row)
        except Exception:
            logger.exception("OAuth callback: error al buscar PKCE verifier en DB")
            raise HTTPException(
                status_code=503,
                detail="Error de conexion con la base de datos. Intente de nuevo mas tarde.",
            )

    if not code_verifier:
        logger.warning("OAuth callback: no se encontro PKCE verifier para state=%s", dto.state)

    try:
        exchange_params = {"auth_code": dto.code}
        if code_verifier:
            exchange_params["code_verifier"] = code_verifier
        auth_resp = await asyncio.wait_for(
            asyncio.to_thread(supabase.auth.exchange_code_for_session, exchange_params),
            timeout=30,
        )
    except asyncio.TimeoutError:
        logger.error("OAuth callback: timeout al intercambiar codigo con Supabase")
        raise HTTPException(status_code=502, detail="Supabase no respondio a tiempo")
    except AuthApiError as e:
        logger.error("OAuth callback: error de autenticacion con Supabase: %s", e)
        raise HTTPException(status_code=401, detail=str(e))
    except Exception:
        logger.exception("OAuth callback: error inesperado al intercambiar codigo")
        raise HTTPException(status_code=500, detail="Error al iniciar sesion con Google. Intente de nuevo.")

    try:
        supabase_session = auth_resp.session
        supabase_user = auth_resp.user

        user_data = {
            "id": supabase_user.id,
            "email": supabase_user.email,
            "store_id": supabase_user.user_metadata.get("store_id"),
            "full_name": supabase_user.user_metadata.get("full_name") or supabase_user.user_metadata.get("name"),
            "role": supabase_user.user_metadata.get("role", "cashier"),
        }

        if not user_data["store_id"]:
            existing = await user_repo.get_by_email(user_data["email"])
            if existing and existing.store_id:
                user_data["store_id"] = str(existing.store_id)
            else:
                store_name = f"{user_data.get('full_name') or user_data['email'].split('@')[0]}'s Store"
                new_store = Store.create(store_name)
                new_store.trial_expires_at = Store.calculate_trial_expiry()
                new_store = await store_repo.save(new_store)
                user_data["store_id"] = str(new_store.id)
                user_data["role"] = "owner"

        local_user = await EnsureLocalUserUseCase(user_repo, store_repo).execute(
            EnsureLocalUserInput(
                user_id=UUID(user_data["id"]),
                email=user_data["email"],
                store_id=UUID(str(user_data["store_id"])),
                full_name=user_data.get("full_name"),
                role=str(user_data.get("role") or "cashier"),
                touch_login=True,
            )
        )

        store = await store_repo.get_by_id(local_user.store_id)
        return _auth_response(
            supabase_session.access_token,
            supabase_session.refresh_token,
            user_id=local_user.id,
            email=local_user.email,
            store_id=local_user.store_id,
            store_name=store.name if store else None,
            full_name=local_user.full_name,
            role=local_user.role,
            trial_expires_at=store.trial_expires_at if store else None,
            days_until_trial_ends=store.days_until_trial_ends if store else None,
            subscription_status=store.subscription_status if store else "trial",
            access_status=store.access_status if store else "active",
        )
    except Exception:
        logger.exception("OAuth callback: error al acceder a base de datos")
        raise HTTPException(
            status_code=503,
            detail="Error de conexion con la base de datos. Intente de nuevo mas tarde.",
        )


@router.get("/trial-status")
async def trial_status(
    user=Depends(get_current_user_context),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    uc = BillingStatusUseCase(store_repo)
    return await uc.execute(user.store_id)


@router.post("/admin/expire-trials")
async def expire_trials(
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if not settings.DEBUG:
        raise HTTPException(status_code=403, detail="Solo disponible en modo debug")
    uc = ExpireTrialsUseCase(store_repo)
    count = await uc.execute()
    return {"deactivated": count}


@router.get("/me", response_model=CurrentUserDTO)
async def me(
    user=Depends(get_current_user_context),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    store = await store_repo.get_by_id(user.store_id)
    return CurrentUserDTO(
        id=user.id,
        email=user.email,
        store_id=user.store_id,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        trial_expires_at=store.trial_expires_at if store else None,
        days_until_trial_ends=store.days_until_trial_ends if store else None,
        subscription_status=store.subscription_status if store else "trial",
        access_status=store.access_status if store else "active",
    )
