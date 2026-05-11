from dataclasses import dataclass


@dataclass
class RegisterInput:
    email: str
    password: str
    full_name: str
    store_name: str


class RegisterUseCase:
    async def execute(self, input: RegisterInput) -> dict:
        raise NotImplementedError("Delegated to Supabase Auth SDK")
