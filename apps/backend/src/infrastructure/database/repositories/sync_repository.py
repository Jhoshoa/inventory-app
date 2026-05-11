from uuid import UUID
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.repositories.sync_repository import ISyncRepository


class SyncRepository(ISyncRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_updates_since(self, store_id: UUID, since: datetime) -> list[dict]:
        result = await self._session.execute(
            text("""
                SELECT 'product' as entity, id, updated_at, version
                FROM products
                WHERE store_id = :store_id AND updated_at > :since
                UNION ALL
                SELECT 'sale' as entity, id, created_at, 1 as version
                FROM sales
                WHERE store_id = :store_id AND created_at > :since
                ORDER BY updated_at ASC
            """),
            {"store_id": store_id, "since": since},
        )
        return [dict(row._mapping) for row in result.all()]

    async def push_changes(self, store_id: UUID, changes: list[dict]) -> None:
        for change in changes:
            entity = change.get("entity")
            action = change.get("action", "upsert")
            data = change.get("data", {})
            if entity == "product" and action == "upsert":
                await self._session.execute(
                    text("""
                        INSERT INTO products (id, store_id, name, price, stock, version, updated_at)
                        VALUES (:id, :store_id, :name, :price, :stock, 1, NOW())
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            price = EXCLUDED.price,
                            stock = EXCLUDED.stock,
                            version = products.version + 1,
                            updated_at = NOW()
                    """),
                    {"id": data["id"], "store_id": store_id, "name": data.get("name"), "price": data.get("price"), "stock": data.get("stock")},
                )
            elif entity == "product" and action == "delete":
                await self._session.execute(
                    text("UPDATE products SET deleted_at = NOW() WHERE id = :id"),
                    {"id": data["id"]},
                )
        await self._session.commit()
