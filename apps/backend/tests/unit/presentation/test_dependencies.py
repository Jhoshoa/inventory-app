from fastapi.security import HTTPAuthorizationCredentials

from src.presentation import dependencies


async def test_get_current_user_accepts_dev_access_token_in_debug(monkeypatch):
    monkeypatch.setattr(dependencies.settings, "DEBUG", True)

    user = await dependencies.get_current_user(
        HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=dependencies.DEV_ACCESS_TOKEN,
        )
    )

    assert user["id"] == dependencies.DEV_USER_ID
    assert user["email"] == "dev@local.dev"
    assert user["store_id"] == dependencies.DEV_STORE_ID
    assert user["role"] == "owner"

