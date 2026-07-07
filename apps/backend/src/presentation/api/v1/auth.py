from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from src.application.dto.auth_dto import (
    AuthResponseDTO,
    CurrentUserDTO,
    LoginDTO,
    OAuthCallbackDTO,
    RefreshTokenDTO,
    RegisterDTO,
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
from src.config.settings import settings
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.database.repositories.user_repository import UserRepository
from src.presentation.dependencies import (
    DEV_ACCESS_TOKEN,
    DEV_CASHIER_ACCESS_TOKEN,
    DEV_CASHIER_USER_ID,
    DEV_STORE_ID,
    DEV_USER_ID,
    get_current_user_context,
    get_store_repo,
    get_user_repo,
)

router = APIRouter(prefix="/auth", tags=["auth"])


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


def _auth_response(access_token: str, refresh_token: str, *, user_id, email, store_id, full_name, role: str, store_name: str | None = None) -> AuthResponseDTO:
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
        },
    )


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
        is_cashier_login = dto.email.lower() == "cashier@local.dev"
        user_id = DEV_CASHIER_USER_ID if is_cashier_login else DEV_USER_ID
        role = "cashier" if is_cashier_login else "owner"
        full_name = "Demo Cashier" if is_cashier_login else "Dev User"
        await EnsureLocalUserUseCase(user_repo, store_repo).execute(
            EnsureLocalUserInput(
                user_id=user_id,
                email=dto.email,
                store_id=DEV_STORE_ID,
                full_name=full_name,
                role=role,
                touch_login=True,
            )
        )
        return _dev_auth_response(dto.email, user_id=user_id, role=role, full_name=full_name)

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    response = supabase.auth.sign_in_with_password(
        {"email": dto.email, "password": dto.password}
    )
    auth_response = _auth_response_from_supabase(response)
    raw_user = auth_response.user
    if not raw_user.get("store_id"):
        existing = await user_repo.get_by_email(dto.email)
        if existing is None or existing.store_id is None:
            raise UnauthorizedError("No se pudo resolver la tienda del usuario")
        raw_user["store_id"] = str(existing.store_id)
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
    )


@router.post("/register", response_model=AuthResponseDTO, status_code=201)
async def register(
    dto: RegisterDTO,
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if settings.DEBUG:
        result = await RegisterStoreOwnerUseCase(store_repo, user_repo).execute(
            RegisterStoreOwnerInput(
                user_id=uuid4(),
                email=dto.email,
                full_name=dto.full_name,
                store_name=dto.store_name,
            )
        )
        return _dev_auth_response(dto.email, result.store.id, result.user.id, result.user.role, store_name=result.store.name)

    store_id = str(uuid4())
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
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
                }
            },
        }
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
    )


@router.post("/refresh", response_model=AuthResponseDTO)
async def refresh_token(
    dto: RefreshTokenDTO,
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if settings.DEBUG:
        return _dev_auth_response()

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
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
async def oauth_google():
    if settings.DEBUG:
        return {"url": "http://localhost:3000/login?oauth=dev"}
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    response = supabase.auth.sign_in_with_oauth({"provider": "google"})
    return {"url": response.url}


@router.post("/oauth/callback", response_model=AuthResponseDTO)
async def oauth_callback(
    dto: OAuthCallbackDTO,
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if settings.DEBUG:
        return _dev_auth_response()
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    session = supabase.auth.exchange_code_for_session({"auth_code": dto.code})
    user_data = {
        "id": session.user.id,
        "email": session.user.email,
        "store_id": session.user.user_metadata.get("store_id"),
        "full_name": session.user.user_metadata.get("full_name") or session.user.user_metadata.get("name"),
        "role": session.user.user_metadata.get("role", "cashier"),
    }

    if not user_data["store_id"]:
        existing = await user_repo.get_by_email(user_data["email"])
        if existing and existing.store_id:
            user_data["store_id"] = str(existing.store_id)
        else:
            raise HTTPException(
                status_code=400,
                detail="Debes completar el registro de tu tienda primero",
            )

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
        session.access_token,
        session.refresh_token,
        user_id=local_user.id,
        email=local_user.email,
        store_id=local_user.store_id,
        store_name=store.name if store else None,
        full_name=local_user.full_name,
        role=local_user.role,
    )


@router.get("/me", response_model=CurrentUserDTO)
async def me(user=Depends(get_current_user_context)):
    return user
