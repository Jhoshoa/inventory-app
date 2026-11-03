"""Catalogo de demostracion para una tienda real (no para desarrollo local).

Con DEBUG=false no corre el dev_seed (usa un usuario falso con clave conocida), asi
que una tienda recien registrada queda vacia. Esto le carga categorias y productos
tipicos de un almacen boliviano para poder probar el POS, el catalogo publico y los
reportes con algo que mirar.

    python -m src.infrastructure.database.seed.demo_catalog --email dueno@mitienda.com

Es idempotente: si la tienda ya tiene productos no toca nada (salvo --force).
"""

import argparse
import asyncio
import sys
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.use_cases.product_categories.create_product_category import (
    CreateProductCategoryInput,
    CreateProductCategoryUseCase,
)
from src.application.use_cases.products.create_product import CreateProductInput, CreateProductUseCase
from src.application.use_cases.products.name_normalizer import normalize_product_name
from src.infrastructure.database.repositories.product_category_repository import ProductCategoryRepository
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.database.repositories.user_repository import UserRepository

# (nombre, unidad, precio de venta Bs, costo Bs, stock inicial, stock minimo)
_Product = tuple[str, str, str, str, int, int]

DEMO_CATALOG: dict[str, tuple[str, list[_Product]]] = {
    "Abarrotes": (
        "ABA",
        [
            ("Arroz grano de oro 1kg", "unidad", "12.50", "10.00", 60, 15),
            ("Azucar blanca 1kg", "unidad", "8.50", "6.80", 50, 15),
            ("Aceite Fino 1l", "unidad", "18.00", "15.00", 40, 10),
            ("Fideo spaghetti 400g", "unidad", "7.00", "5.50", 45, 12),
            ("Harina de trigo 1kg", "unidad", "9.00", "7.20", 30, 8),
            ("Sal yodada 1kg", "unidad", "3.50", "2.60", 35, 10),
        ],
    ),
    "Bebidas": (
        "BEB",
        [
            ("Coca Cola 2l", "unidad", "14.00", "11.50", 36, 12),
            ("Agua mineral 2l", "unidad", "7.00", "5.00", 40, 12),
            ("Jugo del Valle 1l", "unidad", "12.00", "9.50", 24, 8),
            ("Cerveza Paceña 620ml", "unidad", "15.00", "12.00", 48, 12),
        ],
    ),
    "Lacteos": (
        "LAC",
        [
            ("Leche PIL 1l", "unidad", "8.00", "6.50", 40, 12),
            ("Yogurt natural 1l", "unidad", "14.00", "11.00", 18, 6),
            ("Queso criollo", "kg", "55.00", "45.00", 8, 3),
        ],
    ),
    "Limpieza": (
        "LIM",
        [
            ("Detergente en polvo 1kg", "unidad", "16.00", "12.50", 25, 8),
            ("Lavandina 1l", "unidad", "6.00", "4.20", 30, 10),
            ("Papel higienico x4", "paquete", "10.00", "7.50", 28, 10),
        ],
    ),
    "Snacks": (
        "SNA",
        [
            ("Galleta Cracker 100g", "unidad", "5.00", "3.60", 50, 15),
            ("Papas fritas 120g", "unidad", "9.00", "6.80", 30, 10),
        ],
    ),
}


@dataclass
class DemoSeedResult:
    categories: int
    products: int
    skipped_reason: str | None = None


async def seed_demo_catalog(session: AsyncSession, store_id: UUID, *, force: bool = False) -> DemoSeedResult:
    product_repo = ProductRepository(session)
    category_repo = ProductCategoryRepository(session)

    if not force and await product_repo.count_by_store(store_id) > 0:
        return DemoSeedResult(0, 0, skipped_reason="la tienda ya tiene productos (usa --force para agregar igual)")

    existing = {c.name: c for c in await category_repo.list_by_store(store_id, include_inactive=True)}
    create_category = CreateProductCategoryUseCase(category_repo)
    create_product = CreateProductUseCase(product_repo, category_repo)

    categories = 0
    products = 0
    for category_name, (prefix, items) in DEMO_CATALOG.items():
        category = existing.get(category_name)
        if category is None:
            created = await create_category.execute(
                CreateProductCategoryInput(store_id=store_id, name=category_name, sku_prefix=prefix)
            )
            category_id = created.id
            categories += 1
        else:
            category_id = category.id

        for name, unit, price, cost, stock, min_stock in items:
            if await product_repo.product_name_exists(store_id, normalize_product_name(name), unit):
                continue
            await create_product.execute(
                CreateProductInput(
                    store_id=store_id,
                    name=name,
                    price=Decimal(price),
                    cost_price=Decimal(cost),
                    stock=stock,
                    min_stock=min_stock,
                    unit=unit,
                    category_id=category_id,
                )
            )
            products += 1
    return DemoSeedResult(categories, products)


async def _main(email: str, force: bool) -> int:
    from src.config.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        user = await UserRepository(session).get_by_email(email)
        if user is None or user.store_id is None:
            print(f"No hay un usuario con tienda para {email}. Inicia sesion una vez en la app y vuelve a intentar.")
            return 1
        result = await seed_demo_catalog(session, user.store_id, force=force)
        await session.commit()

    if result.skipped_reason:
        print(f"No se cargo nada: {result.skipped_reason}")
        return 0
    print(f"Listo: {result.categories} categorias y {result.products} productos cargados en la tienda de {email}.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Carga un catalogo de demostracion en la tienda de un usuario.")
    parser.add_argument("--email", required=True, help="correo del dueno de la tienda (ya debe haber iniciado sesion una vez)")
    parser.add_argument("--force", action="store_true", help="agregar los productos aunque la tienda ya tenga alguno")
    args = parser.parse_args()
    sys.exit(asyncio.run(_main(args.email, args.force)))
