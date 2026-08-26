import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request

from src.application.dto.lead_dto import LeadCreateDTO, LeadResponseDTO
from src.application.use_cases.leads.create_lead import (
    CreateLeadInput,
    CreateLeadUseCase,
)
from src.infrastructure.database.repositories.lead_repository import LeadRepository
from src.infrastructure.services.rate_limit.in_memory_rate_limiter import (
    lead_rate_limiter,
)
from src.presentation.dependencies import get_lead_repo

router = APIRouter(prefix="/public", tags=["public"])
logger = logging.getLogger(__name__)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/leads", response_model=LeadResponseDTO, status_code=201)
async def create_lead(
    dto: LeadCreateDTO,
    request: Request,
    repo: LeadRepository = Depends(get_lead_repo),
):
    if not lead_rate_limiter.is_allowed(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta nuevamente en unos minutos.")

    if dto.is_spam:
        # Respuesta identica a la de exito para no revelar la deteccion de spam
        # a un bot, pero sin persistir nada.
        logger.info("Lead descartado por honeypot")
        return LeadResponseDTO(id=uuid4(), name=dto.name)

    lead = await CreateLeadUseCase(repo).execute(
        CreateLeadInput(
            name=dto.name,
            phone=dto.phone,
            store_name=dto.store_name,
            email=dto.email,
            business_type=dto.business_type,
            message=dto.message,
            source_page=dto.source_page,
        )
    )
    return LeadResponseDTO(id=lead.id, name=lead.name)
