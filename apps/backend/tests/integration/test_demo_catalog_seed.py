from sqlalchemy import func, select

from src.infrastructure.database.models import ProductModel
from src.infrastructure.database.seed.demo_catalog import DEMO_CATALOG, seed_demo_catalog
from src.presentation import dependencies

EXPECTED_PRODUCTS = sum(len(items) for _, items in DEMO_CATALOG.values())


async def _count_products(db_session):
    return (await db_session.execute(select(func.count()).select_from(ProductModel))).scalar_one()


async def test_loads_categories_and_products_into_an_empty_store(db_session):
    result = await seed_demo_catalog(db_session, dependencies.DEV_STORE_ID)

    assert result.categories == len(DEMO_CATALOG)
    assert result.products == EXPECTED_PRODUCTS
    assert result.skipped_reason is None
    assert await _count_products(db_session) == EXPECTED_PRODUCTS


async def test_every_demo_product_is_sellable_and_has_a_scannable_code_and_sku(db_session):
    await seed_demo_catalog(db_session, dependencies.DEV_STORE_ID)

    rows = (await db_session.execute(select(ProductModel))).scalars().all()
    assert all(p.stock > 0 and p.price > p.cost_price > 0 for p in rows)
    assert all(p.sku and p.qr_code for p in rows)
    assert len({p.qr_code for p in rows}) == len(rows)
    assert len({p.sku for p in rows}) == len(rows)


async def test_does_nothing_if_the_store_already_has_products(db_session):
    await seed_demo_catalog(db_session, dependencies.DEV_STORE_ID)

    again = await seed_demo_catalog(db_session, dependencies.DEV_STORE_ID)

    assert (again.categories, again.products) == (0, 0)
    assert again.skipped_reason
    assert await _count_products(db_session) == EXPECTED_PRODUCTS


async def test_force_never_duplicates_products_that_already_exist(db_session):
    await seed_demo_catalog(db_session, dependencies.DEV_STORE_ID)

    forced = await seed_demo_catalog(db_session, dependencies.DEV_STORE_ID, force=True)

    assert (forced.categories, forced.products) == (0, 0)
    assert await _count_products(db_session) == EXPECTED_PRODUCTS
