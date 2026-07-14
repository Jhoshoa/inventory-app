import logging

from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.store import Store
from src.infrastructure.auth.password import hash_password
from src.infrastructure.database.models.store_model import StoreModel
from src.infrastructure.database.models.user_model import UserModel
from src.presentation.dependencies import (
    DEV_CASHIER_USER_ID,
    DEV_STORE_ID,
    DEV_USER_ID,
)

logger = logging.getLogger(__name__)

DEV_PASSWORD_HASH = hash_password("Dev12345!")

DEV_USERS: list[dict] = [
    {
        "id": DEV_USER_ID,
        "email": "dev@local.dev",
        "full_name": "Dev User",
        "role": "owner",
        "store_id": DEV_STORE_ID,
        "password_hash": DEV_PASSWORD_HASH,
    },
    {
        "id": DEV_CASHIER_USER_ID,
        "email": "cashier@local.dev",
        "full_name": "Demo Cashier",
        "role": "cashier",
        "store_id": DEV_STORE_ID,
        "password_hash": DEV_PASSWORD_HASH,
    },
]


async def seed_dev_data(session: AsyncSession) -> None:
    store_model = await session.get(StoreModel, DEV_STORE_ID)
    if store_model is None:
        store = Store.create("Mi Tienda Demo")
        store.id = DEV_STORE_ID
        store_model = StoreModel(id=store.id)
        session.add(store_model)
        store_model.name = store.name
        store_model.timezone = store.timezone
        store_model.is_active = True
        store_model.access_status = "active"
        store_model.subscription_status = "trial"
        logger.info("Seed: created store %s", DEV_STORE_ID)

    for user_data in DEV_USERS:
        user_model = await session.get(UserModel, user_data["id"])
        if user_model is None:
            user_model = UserModel(id=user_data["id"])
            session.add(user_model)
            user_model.email = user_data["email"]
            user_model.full_name = user_data["full_name"]
            user_model.role = user_data["role"]
            user_model.store_id = user_data["store_id"]
            user_model.password_hash = user_data["password_hash"]
            user_model.is_active = True
            logger.info("Seed: created user %s", user_data["email"])

    await session.flush()
