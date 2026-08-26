from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.lead import Lead
from src.domain.repositories.lead_repository import ILeadRepository
from src.infrastructure.database.models.lead_model import LeadModel


class LeadRepository(ILeadRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, lead: Lead) -> Lead:
        model = LeadModel(
            id=lead.id,
            name=lead.name,
            phone=lead.phone,
            store_name=lead.store_name,
            email=lead.email,
            business_type=lead.business_type,
            message=lead.message,
            source_page=lead.source_page,
            created_at=lead.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return lead
