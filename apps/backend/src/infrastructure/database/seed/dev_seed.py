import asyncio
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import AsyncSessionLocal
from src.infrastructure.database.models.exchange_rate_model import ExchangeRateModel
from src.infrastructure.database.models.product_model import ProductModel
from src.infrastructure.database.models.store_model import StoreModel
from src.infrastructure.database.models.user_model import UserModel

DEV_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
DEV_CASHIER_USER_ID = UUID("00000000-0000-0000-0000-000000000002")
DEV_STORE_ID = UUID("00000000-0000-0000-0000-000000000101")

SEEDED_PRODUCT_IDS = {
    "arroz_1kg": UUID("11111111-1111-1111-1111-111111111111"),
    "aceite_1l": UUID("22222222-2222-2222-2222-222222222222"),
    "fideo_400g": UUID("33333333-3333-3333-3333-333333333333"),
}


async def seed_dev_data(session: AsyncSession) -> None:
    store = await session.get(StoreModel, DEV_STORE_ID)
    if store is None:
        store = StoreModel(id=DEV_STORE_ID)
        session.add(store)
    store.name = "Mi Tienda Demo"
    store.address = "Av. Siempre Viva 123"
    store.phone = "70000000"
    store.is_active = True
    store.timezone = "America/La_Paz"

    user = await session.get(UserModel, DEV_USER_ID)
    if user is None:
        user = UserModel(id=DEV_USER_ID)
        session.add(user)
    user.email = "dev@local.dev"
    user.store_id = DEV_STORE_ID
    user.full_name = "Dev User"
    user.role = "owner"
    user.is_active = True

    cashier = await session.get(UserModel, DEV_CASHIER_USER_ID)
    if cashier is None:
        cashier = UserModel(id=DEV_CASHIER_USER_ID)
        session.add(cashier)
    cashier.email = "cashier@local.dev"
    cashier.store_id = DEV_STORE_ID
    cashier.full_name = "Demo Cashier"
    cashier.role = "cashier"
    cashier.is_active = True

    products = [
        {
            "id": SEEDED_PRODUCT_IDS["arroz_1kg"],
            "name": "Arroz 1kg",
            "category": "Abarrotes",
            "sku": "ARR-001",
            "price": Decimal("12.50"),
            "cost_price": Decimal("10.00"),
            "stock": 50,
            "min_stock": 1,
            "unit": "unidad",
            "qr_code": "DEMO-ARR-001",
            "extra_data": {"brand": "Favorito"},
        },
        {
            "id": SEEDED_PRODUCT_IDS["aceite_1l"],
            "name": "Aceite 1l",
            "category": "Abarrotes",
            "sku": "ACE-001",
            "price": Decimal("18.00"),
            "cost_price": Decimal("15.00"),
            "stock": 24,
            "min_stock": 4,
            "unit": "unidad",
            "qr_code": "DEMO-ACE-001",
            "extra_data": {"brand": "Rico"},
        },
        {
            "id": SEEDED_PRODUCT_IDS["fideo_400g"],
            "name": "Fideo 400g",
            "category": "Abarrotes",
            "sku": "FID-001",
            "price": Decimal("8.50"),
            "cost_price": Decimal("6.50"),
            "stock": 30,
            "min_stock": 6,
            "unit": "unidad",
            "qr_code": "DEMO-FID-001",
            "extra_data": {"brand": "Don Demo"},
        },
    ]

    for item in products:
        product = await session.get(ProductModel, item["id"])
        if product is None:
            product = ProductModel(id=item["id"], store_id=DEV_STORE_ID)
            session.add(product)
        product.store_id = DEV_STORE_ID
        product.name = item["name"]
        product.category = item["category"]
        product.sku = item["sku"]
        product.price = item["price"]
        product.cost_price = item["cost_price"]
        product.stock = item["stock"]
        product.min_stock = item["min_stock"]
        product.unit = item["unit"]
        product.qr_code = item["qr_code"]
        product.extra_data = item["extra_data"]
        product.is_active = True
        product.deleted_at = None

    exchange_rates = [
        (date(2026, 5, 12), "bcb", Decimal("6.9600"), Decimal("6.9600")),
        (date(2026, 5, 12), "paralelo", Decimal("9.2000"), Decimal("9.4000")),
    ]
    for rate_date, source, buy_price, sell_price in exchange_rates:
        rate = await session.get(
            ExchangeRateModel,
            {"date": rate_date, "source": source},
        )
        if rate is None:
            rate = ExchangeRateModel(date=rate_date, source=source)
            session.add(rate)
        rate.buy_price = buy_price
        rate.sell_price = sell_price

    await session.flush()


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed_dev_data(session)
        await session.commit()
    print("Seeded dev store, user, products, and exchange rates.")


if __name__ == "__main__":
    asyncio.run(main())
