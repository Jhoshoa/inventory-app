from dataclasses import dataclass


@dataclass
class RefreshTokenInput:
    refresh_token: str


class RefreshTokenUseCase:
    async def execute(self, input: RefreshTokenInput) -> dict:
        raise NotImplementedError("Delegated to Supabase Auth SDK")
