import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from src.application.dto.auth_dto import AuthResponseDTO
from src.application.dto.user_invitation_dto import (
    AcceptUserInvitationDTO,
    CreateUserInvitationDTO,
    UserInvitationCreatedDTO,
    UserInvitationListResponseDTO,
    UserInvitationPreviewDTO,
    UserInvitationResponseDTO,
)
from src.application.use_cases.user_invitations.accept_user_invitation import (
    AcceptUserInvitationInput,
    AcceptUserInvitationUseCase,
)
from src.application.use_cases.user_invitations.create_user_invitation import (
    CreateUserInvitationInput,
    CreateUserInvitationUseCase,
)
from src.application.use_cases.user_invitations.list_user_invitations import (
    ListUserInvitationsInput,
    ListUserInvitationsUseCase,
)
from src.application.use_cases.user_invitations.preview_user_invitation import (
    PreviewUserInvitationInput,
    PreviewUserInvitationUseCase,
)
from src.application.use_cases.user_invitations.resend_user_invitation import (
    ResendUserInvitationInput,
    ResendUserInvitationUseCase,
)
from src.application.use_cases.user_invitations.revoke_user_invitation import (
    RevokeUserInvitationInput,
    RevokeUserInvitationUseCase,
)
from src.config.settings import settings
from src.infrastructure.auth.supabase_client import (
    get_supabase_admin_client,
    get_supabase_client,
)
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.database.repositories.user_invitation_repository import (
    UserInvitationRepository,
)
from src.infrastructure.database.repositories.user_repository import UserRepository
from src.infrastructure.services.rate_limit.in_memory_rate_limiter import (
    invitation_accept_rate_limiter,
)
from src.presentation.dependencies import (
    get_email_sender,
    get_store_repo,
    get_user_invitation_repo,
    get_user_repo,
    require_owner,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user-invitations", tags=["user-invitations"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("", response_model=UserInvitationCreatedDTO, status_code=201)
async def create_user_invitation(
    dto: CreateUserInvitationDTO,
    current_user=Depends(require_owner),
    invitation_repo: UserInvitationRepository = Depends(get_user_invitation_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
    email_sender=Depends(get_email_sender),
):
    result = await CreateUserInvitationUseCase(
        invitation_repo, user_repo, store_repo, email_sender
    ).execute(
        CreateUserInvitationInput(
            store_id=current_user.store_id,
            invited_by_user_id=current_user.id,
            invited_by_name=current_user.full_name or current_user.email,
            email=dto.email,
            role=dto.role.value,
        )
    )
    response = UserInvitationCreatedDTO.model_validate(result.invitation)
    if settings.DEBUG:
        response.dev_invite_url = f"{settings.FRONTEND_URL}/invite/{result.raw_token}"
    return response


@router.get("", response_model=UserInvitationListResponseDTO)
async def list_user_invitations(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_owner),
    invitation_repo: UserInvitationRepository = Depends(get_user_invitation_repo),
):
    items, total = await ListUserInvitationsUseCase(invitation_repo).execute(
        ListUserInvitationsInput(store_id=current_user.store_id, limit=limit, offset=offset)
    )
    return UserInvitationListResponseDTO(items=items, total=total, limit=limit, offset=offset)


@router.post("/{invitation_id}/revoke", response_model=UserInvitationResponseDTO)
async def revoke_user_invitation(
    invitation_id: UUID,
    current_user=Depends(require_owner),
    invitation_repo: UserInvitationRepository = Depends(get_user_invitation_repo),
):
    return await RevokeUserInvitationUseCase(invitation_repo).execute(
        RevokeUserInvitationInput(store_id=current_user.store_id, invitation_id=invitation_id)
    )


@router.post("/{invitation_id}/resend", response_model=UserInvitationCreatedDTO)
async def resend_user_invitation(
    invitation_id: UUID,
    current_user=Depends(require_owner),
    invitation_repo: UserInvitationRepository = Depends(get_user_invitation_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
    email_sender=Depends(get_email_sender),
):
    result = await ResendUserInvitationUseCase(invitation_repo, store_repo, email_sender).execute(
        ResendUserInvitationInput(
            store_id=current_user.store_id,
            invitation_id=invitation_id,
            invited_by_name=current_user.full_name or current_user.email,
        )
    )
    response = UserInvitationCreatedDTO.model_validate(result.invitation)
    if settings.DEBUG:
        response.dev_invite_url = f"{settings.FRONTEND_URL}/invite/{result.raw_token}"
    return response


@router.get("/preview/{token}", response_model=UserInvitationPreviewDTO)
async def preview_user_invitation(
    token: str,
    request: Request,
    invitation_repo: UserInvitationRepository = Depends(get_user_invitation_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if not invitation_accept_rate_limiter.is_allowed(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Demasiados intentos. Intenta nuevamente en unos minutos.")

    result = await PreviewUserInvitationUseCase(invitation_repo, store_repo).execute(
        PreviewUserInvitationInput(token=token)
    )
    return UserInvitationPreviewDTO(
        email=result.email,
        store_name=result.store_name,
        role=result.role,
        status=result.status,
        expires_at=result.expires_at,
    )


@router.post("/accept", response_model=AuthResponseDTO)
async def accept_user_invitation(
    dto: AcceptUserInvitationDTO,
    request: Request,
    invitation_repo: UserInvitationRepository = Depends(get_user_invitation_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if not invitation_accept_rate_limiter.is_allowed(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Demasiados intentos. Intenta nuevamente en unos minutos.")

    user = await AcceptUserInvitationUseCase(invitation_repo, user_repo).execute(
        AcceptUserInvitationInput(token=dto.token, full_name=dto.full_name, password=dto.password)
    )
    store = await store_repo.get_by_id(user.store_id)
    user_payload = {
        "id": str(user.id),
        "email": user.email,
        "store_id": str(user.store_id),
        "store_name": store.name if store else None,
        "full_name": user.full_name,
        "role": user.role,
    }

    if settings.DEBUG:
        return AuthResponseDTO(
            access_token=str(user.id),
            refresh_token="dev-refresh-123",
            user=user_payload,
        )

    try:
        admin_client = get_supabase_admin_client()
        admin_client.auth.admin.create_user(
            {
                "email": user.email,
                "password": dto.password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": user.full_name,
                    "role": user.role,
                    "store_id": str(user.store_id),
                    "store_name": store.name if store else None,
                },
            }
        )
        supabase = get_supabase_client()
        session_response = supabase.auth.sign_in_with_password(
            {"email": user.email, "password": dto.password}
        )
        session = session_response.session
    except Exception:
        logger.exception("Error creando la cuenta de Supabase para una invitacion aceptada")
        session = None

    if not session:
        raise HTTPException(
            status_code=502,
            detail="Tu cuenta fue creada pero no se pudo iniciar sesion automaticamente. Intenta iniciar sesion.",
        )
    return AuthResponseDTO(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user=user_payload,
    )
