from abc import ABC, abstractmethod

from src.domain.entities.lead import Lead


class ILeadRepository(ABC):
    @abstractmethod
    async def save(self, lead: Lead) -> Lead: ...
