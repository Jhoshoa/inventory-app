from dataclasses import dataclass

from src.domain.entities.lead import Lead
from src.domain.repositories.lead_repository import ILeadRepository


@dataclass
class CreateLeadInput:
    name: str
    phone: str
    store_name: str | None = None
    email: str | None = None
    business_type: str | None = None
    message: str | None = None
    source_page: str | None = None


class CreateLeadUseCase:
    def __init__(self, repo: ILeadRepository):
        self._repo = repo

    async def execute(self, data: CreateLeadInput) -> Lead:
        lead = Lead.create(
            name=data.name,
            phone=data.phone,
            store_name=data.store_name,
            email=data.email,
            business_type=data.business_type,
            message=data.message,
            source_page=data.source_page,
        )
        return await self._repo.save(lead)
