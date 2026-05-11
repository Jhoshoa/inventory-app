from dataclasses import dataclass


@dataclass
class LoginInput:
    email: str
    password: str


class LoginUseCase:
    async def execute(self, input: LoginInput) -> dict:
        raise NotImplementedError("Delegated to Supabase Auth SDK")
