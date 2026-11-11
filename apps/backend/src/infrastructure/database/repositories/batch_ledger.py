"""Lotes con vencimiento de un producto (FEFO: primero el que vence primero).

El stock del producto es la fuente de verdad. Los lotes llevan la cuenta de
cuantas de esas unidades tienen una fecha de vencimiento conocida, con una
regla que se mantiene siempre: la suma de quantity_remaining de los lotes
de un producto nunca supera products.stock. Lo que sobra es stock "sin lote".

Cuando sale stock sin indicar un lote (ventas, ajustes, sync):
  1. lotes vigentes, del que vence antes al que vence despues;
  2. stock sin lote;
  3. lotes ya vencidos, solo si no queda otra cosa (las unidades vendidas
     tuvieron que salir de ahi). Asi una venta no "esconde" un vencido: ese
     se retira a mano desde el producto, eligiendo el lote.

Estas funciones se llaman en la misma transaccion y despues del UPDATE de
products, que bloquea la fila del producto: los cambios de stock de un mismo
producto quedan en fila y sus lotes no se pisan.
"""

from datetime import date, timedelta
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.store_day._business_date import local_business_date
from src.domain.entities.product_batch import NewBatch
from src.infrastructure.database.models.product_batch_model import (
    BatchConsumptionModel,
    ProductBatchModel,
)
from src.infrastructure.database.models.store_model import StoreModel

async def store_today(session: AsyncSession, store_id: UUID) -> date:
    timezone_name = await session.scalar(select(StoreModel.timezone).where(StoreModel.id == store_id))
    return local_business_date(timezone_name)


async def _open_batches(session: AsyncSession, store_id: UUID, product_id: UUID) -> list[ProductBatchModel]:
    result = await session.execute(
        select(ProductBatchModel)
        .where(
            ProductBatchModel.store_id == store_id,
            ProductBatchModel.product_id == product_id,
            ProductBatchModel.quantity_remaining > 0,
        )
        .order_by(ProductBatchModel.expires_on.asc(), ProductBatchModel.created_at.asc())
    )
    return list(result.scalars().all())


def _take(
    session: AsyncSession,
    batch: ProductBatchModel,
    quantity: int,
    *,
    sale_id: UUID | None,
    movement_id: UUID | None,
    reason: str,
) -> None:
    batch.quantity_remaining -= quantity
    session.add(
        BatchConsumptionModel(
            id=uuid4(),
            store_id=batch.store_id,
            batch_id=batch.id,
            product_id=batch.product_id,
            sale_id=sale_id,
            stock_movement_id=movement_id,
            quantity=quantity,
            reason=reason,
        )
    )


async def add_batch(
    session: AsyncSession,
    *,
    store_id: UUID,
    product_id: UUID,
    quantity: int,
    batch: NewBatch,
) -> ProductBatchModel:
    if quantity <= 0:
        raise ValueError("Un lote necesita una cantidad positiva")
    model = ProductBatchModel(
        id=uuid4(),
        store_id=store_id,
        product_id=product_id,
        expires_on=batch.expires_on,
        alert_days=batch.alert_days,
        alert_on=batch.expires_on - timedelta(days=batch.alert_days),
        quantity_initial=quantity,
        quantity_remaining=quantity,
    )
    session.add(model)
    return model


async def consume(
    session: AsyncSession,
    *,
    store_id: UUID,
    product_id: UUID,
    quantity: int,
    stock_after: int,
    sale_id: UUID | None = None,
    movement_id: UUID | None = None,
    reason: str = "sale",
    batch_id: UUID | None = None,
) -> None:
    """Descuenta `quantity` unidades que ya salieron de products.stock."""
    if quantity <= 0:
        return

    if batch_id is not None:
        batch = await session.get(ProductBatchModel, batch_id)
        if batch is None or batch.store_id != store_id or batch.product_id != product_id:
            raise NotFoundError("Lote no encontrado")
        if batch.quantity_remaining < quantity:
            raise ConflictError(
                f"El lote solo tiene {batch.quantity_remaining} unidades",
                {"batch_id": str(batch.id), "available": batch.quantity_remaining},
            )
        _take(session, batch, quantity, sale_id=sale_id, movement_id=movement_id, reason=reason)
        await session.flush()
        return

    batches = await _open_batches(session, store_id, product_id)
    if not batches:
        return

    today = await store_today(session, store_id)
    in_date = [batch for batch in batches if batch.expires_on >= today]
    expired = [batch for batch in batches if batch.expires_on < today]
    untracked = max(0, stock_after + quantity - sum(batch.quantity_remaining for batch in batches))

    pending = quantity
    for batch in in_date:
        if pending == 0:
            break
        taken = min(pending, batch.quantity_remaining)
        _take(session, batch, taken, sale_id=sale_id, movement_id=movement_id, reason=reason)
        pending -= taken

    pending -= min(pending, untracked)

    for batch in expired:
        if pending == 0:
            break
        taken = min(pending, batch.quantity_remaining)
        _take(session, batch, taken, sale_id=sale_id, movement_id=movement_id, reason=reason)
        pending -= taken

    await session.flush()
    await enforce_limit(session, store_id=store_id, product_id=product_id, stock=stock_after)


async def restore_sale(
    session: AsyncSession,
    *,
    store_id: UUID,
    product_id: UUID,
    sale_id: UUID,
    quantity: int,
    movement_id: UUID | None = None,
) -> int:
    """Devuelve a sus lotes hasta `quantity` unidades que la venta saco de ellos.

    Devuelve cuantas volvieron a un lote; el resto queda como stock sin lote.
    """
    if quantity <= 0:
        return 0
    result = await session.execute(
        select(BatchConsumptionModel.batch_id, func.sum(BatchConsumptionModel.quantity))
        .where(
            BatchConsumptionModel.store_id == store_id,
            BatchConsumptionModel.product_id == product_id,
            BatchConsumptionModel.sale_id == sale_id,
        )
        .group_by(BatchConsumptionModel.batch_id)
    )
    net_by_batch = {batch_id: int(net) for batch_id, net in result.all() if net and net > 0}
    if not net_by_batch:
        return 0

    batches = (
        await session.execute(
            select(ProductBatchModel)
            .where(ProductBatchModel.id.in_(list(net_by_batch)))
            .order_by(ProductBatchModel.expires_on.desc(), ProductBatchModel.created_at.desc())
        )
    ).scalars().all()

    restored = 0
    for batch in batches:
        room = batch.quantity_initial - batch.quantity_remaining
        amount = min(net_by_batch[batch.id], room, quantity - restored)
        if amount <= 0:
            continue
        # Cantidad negativa: la venta "devuelve" esas unidades al lote.
        _take(session, batch, -amount, sale_id=sale_id, movement_id=movement_id, reason="sale_void")
        restored += amount
        if restored == quantity:
            break
    await session.flush()
    return restored


async def enforce_limit(session: AsyncSession, *, store_id: UUID, product_id: UUID, stock: int) -> None:
    """Si los lotes suman mas que el stock (p. ej. un sync que fijo el stock),
    recorta el exceso en el mismo orden en que sale el stock."""
    batches = await _open_batches(session, store_id, product_id)
    excess = sum(batch.quantity_remaining for batch in batches) - max(stock, 0)
    if excess <= 0:
        return
    today = await store_today(session, store_id)
    ordered = [b for b in batches if b.expires_on >= today] + [b for b in batches if b.expires_on < today]
    for batch in ordered:
        if excess == 0:
            break
        taken = min(excess, batch.quantity_remaining)
        _take(session, batch, taken, sale_id=None, movement_id=None, reason="reconcile")
        excess -= taken
    await session.flush()
