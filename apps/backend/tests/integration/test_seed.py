from sqlalchemy import select

from src.infrastructure.database.models.exchange_rate_model import ExchangeRateModel
from src.infrastructure.database.models.product_model import ProductModel
from src.infrastructure.database.models.store_model import StoreModel
from src.infrastructure.database.models.user_model import UserModel
from src.infrastructure.database.seed.dev_seed import DEV_CASHIER_USER_ID, DEV_STORE_ID, DEV_USER_ID, seed_dev_data


async def test_seed_dev_data_is_idempotent(db_session):
    await seed_dev_data(db_session)
    await seed_dev_data(db_session)
    await db_session.commit()

    store = await db_session.get(StoreModel, DEV_STORE_ID)
    user = await db_session.get(UserModel, DEV_USER_ID)
    cashier = await db_session.get(UserModel, DEV_CASHIER_USER_ID)
    products = await db_session.execute(select(ProductModel))
    rates = await db_session.execute(select(ExchangeRateModel))

    assert store is not None
    assert store.name == "Mi Tienda Demo"
    assert user is not None
    assert user.store_id == DEV_STORE_ID
    assert user.role == "owner"
    assert cashier is not None
    assert cashier.email == "cashier@local.dev"
    assert cashier.store_id == DEV_STORE_ID
    assert cashier.role == "cashier"
    assert len(products.scalars().all()) == 3
    assert len(rates.scalars().all()) == 2
