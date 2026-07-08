import csv
import io
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.exceptions import ConflictError
from src.application.use_cases.products.name_normalizer import normalize_product_name
from src.domain.entities.import_job import ImportJob, ImportJobStatus, RowError
from src.domain.entities.product import Product
from src.domain.repositories.import_job_repository import IImportJobRepository
from src.domain.repositories.product_category_repository import (
    IProductCategoryRepository,
)
from src.domain.repositories.product_repository import IProductRepository

MAX_ROWS = 5000
MAX_FILE_SIZE = 5 * 1024 * 1024


@dataclass
class RawProductRow:
    row_number: int
    name: str | None
    price: str | None
    stock: str | None
    category: str | None
    category_id: str | None
    sku: str | None
    unit: str | None
    min_stock: str | None
    cost_price: str | None
    qr_code: str | None
    photo_url: str | None


@dataclass
class ParsedProductRow:
    row_number: int
    name: str
    price: Decimal
    stock: int
    category: str | None
    category_id: UUID | None
    sku: str | None
    unit: str
    min_stock: int
    cost_price: Decimal | None
    qr_code: str | None
    photo_url: str | None


EXPECTED_HEADERS = [
    "name",
    "price",
    "stock",
    "category",
    "category_id",
    "sku",
    "unit",
    "min_stock",
    "cost_price",
    "qr_code",
    "photo_url",
]


class ImportProductsCsvUseCase:
    def __init__(
        self,
        session: AsyncSession,
        product_repo: IProductRepository,
        category_repo: IProductCategoryRepository,
        job_repo: IImportJobRepository,
    ):
        self._session = session
        self._product_repo = product_repo
        self._category_repo = category_repo
        self._job_repo = job_repo

    async def execute(
        self,
        store_id: UUID,
        user_id: UUID,
        filename: str,
        content: str,
    ) -> ImportJob:
        job = ImportJob.create(store_id=store_id, user_id=user_id, filename=filename)
        await self._job_repo.save(job)

        if len(content.encode("utf-8")) > MAX_FILE_SIZE:
            job.complete(0, 0, [RowError(row=0, field="file", message="El archivo excede el tamaño maximo de 5MB")])
            await self._job_repo.save(job)
            return job

        raw_rows = self._parse_csv(content)
        if len(raw_rows) > MAX_ROWS:
            job.complete(0, 0, [RowError(row=0, field="file", message=f"El archivo supera el maximo de {MAX_ROWS} filas")])
            await self._job_repo.save(job)
            return job

        if not raw_rows:
            job.complete(0, 0, [RowError(row=0, field="file", message="El archivo CSV no contiene datos")])
            await self._job_repo.save(job)
            return job

        job.total_rows = len(raw_rows)
        job.status = ImportJobStatus.VALIDATING
        await self._job_repo.save(job)

        structural_errors = self._validate_structure(raw_rows)
        if structural_errors:
            job.complete(len(raw_rows), 0, structural_errors)
            await self._job_repo.save(job)
            return job

        parsed = self._parse_rows(raw_rows)

        business_errors = await self._validate_business(store_id, parsed)
        if business_errors:
            job.complete(len(raw_rows), 0, business_errors)
            await self._job_repo.save(job)
            return job

        job.status = ImportJobStatus.INSERTING
        await self._job_repo.save(job)

        imported = 0
        async with self._session.begin():
            for row in parsed:
                if row.category_id and not row.sku:
                    sku = await self._category_repo.reserve_next_sku(store_id, row.category_id)
                    if sku is None:
                        raise ConflictError(f"No se pudo generar SKU para la categoria en fila {row.row_number}")
                    row.sku = sku

                if not row.qr_code:
                    row.qr_code = self._generate_qr_code(row.sku)

                product = Product.create(
                    store_id=store_id,
                    name=normalize_product_name(row.name),
                    price=row.price,
                    stock=row.stock,
                    category_id=row.category_id,
                    category=row.category,
                    min_stock=row.min_stock,
                    unit=row.unit,
                    sku=row.sku,
                    cost_price=row.cost_price,
                    photo_url=row.photo_url,
                    qr_code=row.qr_code,
                )
                await self._product_repo.save(product)
                imported += 1

        job.complete(len(raw_rows), imported, [])
        await self._job_repo.save(job)
        return job

    def _parse_csv(self, content: str) -> list[RawProductRow]:
        content = content.lstrip("\ufeff")
        reader = csv.DictReader(io.StringIO(content))
        if reader.fieldnames is None:
            return []

        rows: list[RawProductRow] = []
        for i, row in enumerate(reader, start=1):
            rows.append(
                RawProductRow(
                    row_number=i,
                    name=self._get(row, "name"),
                    price=self._get(row, "price"),
                    stock=self._get(row, "stock"),
                    category=self._get(row, "category"),
                    category_id=self._get(row, "category_id"),
                    sku=self._get(row, "sku"),
                    unit=self._get(row, "unit"),
                    min_stock=self._get(row, "min_stock"),
                    cost_price=self._get(row, "cost_price"),
                    qr_code=self._get(row, "qr_code"),
                    photo_url=self._get(row, "photo_url"),
                )
            )
        return rows

    def _get(self, row: dict, key: str) -> str | None:
        value = row.get(key, "")
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return str(value).strip()

    def _validate_structure(self, rows: list[RawProductRow]) -> list[RowError]:
        errors: list[RowError] = []
        for row in rows:
            if not row.name:
                errors.append(RowError(row=row.row_number, field="name", message="El nombre del producto es requerido"))
            elif len(row.name) > 100:
                errors.append(RowError(row=row.row_number, field="name", message="El nombre debe tener maximo 100 caracteres"))

            if row.price is None:
                errors.append(RowError(row=row.row_number, field="price", message="El precio es requerido"))
            else:
                try:
                    price = Decimal(row.price)
                    if price <= 0:
                        errors.append(RowError(row=row.row_number, field="price", message="El precio debe ser mayor a 0"))
                except InvalidOperation:
                    errors.append(RowError(row=row.row_number, field="price", message="El precio debe ser un numero valido"))

            if row.stock is None:
                errors.append(RowError(row=row.row_number, field="stock", message="El stock es requerido"))
            else:
                try:
                    stock = int(row.stock)
                    if stock < 0:
                        errors.append(RowError(row=row.row_number, field="stock", message="El stock no puede ser negativo"))
                except (ValueError, TypeError):
                    errors.append(RowError(row=row.row_number, field="stock", message="El stock debe ser un numero entero valido"))

            if row.category is not None and len(row.category) > 50:
                errors.append(RowError(row=row.row_number, field="category", message="La categoria debe tener maximo 50 caracteres"))

            if row.category_id is not None:
                try:
                    UUID(row.category_id)
                except (ValueError, TypeError):
                    errors.append(RowError(row=row.row_number, field="category_id", message="category_id debe ser un UUID valido"))

            if row.sku is not None and len(row.sku) > 50:
                errors.append(RowError(row=row.row_number, field="sku", message="El SKU debe tener maximo 50 caracteres"))

            if row.unit is not None and len(row.unit) > 20:
                errors.append(RowError(row=row.row_number, field="unit", message="La unidad debe tener maximo 20 caracteres"))

            if row.min_stock is not None:
                try:
                    ms = int(row.min_stock)
                    if ms < 0:
                        errors.append(RowError(row=row.row_number, field="min_stock", message="min_stock no puede ser negativo"))
                except (ValueError, TypeError):
                    errors.append(RowError(row=row.row_number, field="min_stock", message="min_stock debe ser un numero entero valido"))

            if row.cost_price is not None:
                try:
                    cp = Decimal(row.cost_price)
                    if cp < 0:
                        errors.append(RowError(row=row.row_number, field="cost_price", message="cost_price no puede ser negativo"))
                except InvalidOperation:
                    errors.append(RowError(row=row.row_number, field="cost_price", message="cost_price debe ser un numero valido"))

            if row.qr_code is not None and len(row.qr_code) > 100:
                errors.append(RowError(row=row.row_number, field="qr_code", message="qr_code debe tener maximo 100 caracteres"))

            if row.photo_url is not None and len(row.photo_url) > 500:
                errors.append(RowError(row=row.row_number, field="photo_url", message="photo_url debe tener maximo 500 caracteres"))

        return errors

    def _parse_rows(self, raw_rows: list[RawProductRow]) -> list[ParsedProductRow]:
        parsed: list[ParsedProductRow] = []
        for row in raw_rows:
            category_id: UUID | None = None
            if row.category_id:
                category_id = UUID(row.category_id)

            min_stock = 1
            if row.min_stock is not None:
                min_stock = int(row.min_stock)

            cost_price: Decimal | None = None
            if row.cost_price is not None:
                cost_price = Decimal(row.cost_price)

            parsed.append(
                ParsedProductRow(
                    row_number=row.row_number,
                    name=row.name or "",
                    price=Decimal(row.price),
                    stock=int(row.stock or 0),
                    category=row.category,
                    category_id=category_id,
                    sku=row.sku,
                    unit=row.unit or "unidad",
                    min_stock=min_stock,
                    cost_price=cost_price,
                    qr_code=row.qr_code,
                    photo_url=row.photo_url,
                )
            )
        return parsed

    async def _validate_business(self, store_id: UUID, rows: list[ParsedProductRow]) -> list[RowError]:
        errors: list[RowError] = []

        categories = await self._category_repo.list_by_store(store_id, include_inactive=False)
        cat_by_id: dict[UUID, str] = {}
        cat_by_name: dict[str, UUID] = {}
        for cat in categories:
            cat_by_id[cat.id] = cat.name
            cat_by_name[cat.name.lower()] = cat.id

        for row in rows:
            resolved_name: str | None = None

            if row.category_id:
                cat_name = cat_by_id.get(row.category_id)
                if cat_name is None:
                    errors.append(RowError(row=row.row_number, field="category_id", message=f"Categoria {row.category_id} no encontrada"))
                else:
                    resolved_name = cat_name

            if row.category:
                cat_id = cat_by_name.get(row.category.lower().strip())
                if cat_id is None:
                    errors.append(RowError(row=row.row_number, field="category", message=f"Categoria '{row.category}' no encontrada"))
                else:
                    resolved_name = cat_by_id[cat_id]

            if row.category_id and row.category:
                name_by_id = cat_by_id.get(row.category_id)
                name_by_name = cat_by_name.get(row.category.lower().strip())
                if name_by_id and name_by_name and name_by_id.lower() != row.category.lower().strip():
                    errors.append(
                        RowError(
                            row=row.row_number,
                            field="category",
                            message=f"category_id y category no coinciden: '{name_by_id}' vs '{row.category}'",
                        )
                    )

            if resolved_name:
                row.category = resolved_name
                if not row.category_id:
                    row.category_id = cat_by_name.get(resolved_name.lower())

        name_unit_map: dict[tuple[str, str], list[int]] = {}
        for row in rows:
            key = (normalize_product_name(row.name or ""), row.unit)
            if key in name_unit_map:
                name_unit_map[key].append(row.row_number)
            else:
                name_unit_map[key] = [row.row_number]

        for (name, unit), row_numbers in name_unit_map.items():
            if len(row_numbers) > 1:
                rows_str = ", ".join(str(r) for r in row_numbers)
                errors.append(RowError(row=row_numbers[0], field="name", message=f"Nombre duplicado en filas: {rows_str}"))

        sku_map: dict[str, list[int]] = {}
        for row in rows:
            if row.sku:
                if row.sku in sku_map:
                    sku_map[row.sku].append(row.row_number)
                else:
                    sku_map[row.sku] = [row.row_number]

        for sku, row_numbers in sku_map.items():
            if len(row_numbers) > 1:
                rows_str = ", ".join(str(r) for r in row_numbers)
                errors.append(RowError(row=row_numbers[0], field="sku", message=f"SKU duplicado en filas: {rows_str}"))

        qr_map: dict[str, list[int]] = {}
        for row in rows:
            if row.qr_code:
                if row.qr_code in qr_map:
                    qr_map[row.qr_code].append(row.row_number)
                else:
                    qr_map[row.qr_code] = [row.row_number]

        for qr, row_numbers in qr_map.items():
            if len(row_numbers) > 1:
                rows_str = ", ".join(str(r) for r in row_numbers)
                errors.append(RowError(row=row_numbers[0], field="qr_code", message=f"QR duplicado en filas: {rows_str}"))

        if errors:
            return errors

        for row in rows:
            if row.sku:
                exists = await self._product_repo.sku_exists(store_id, row.sku)
                if exists:
                    errors.append(RowError(row=row.row_number, field="sku", message=f"El SKU {row.sku} ya esta en uso por otro producto"))

            if row.qr_code:
                exists = await self._product_repo.qr_code_exists(row.qr_code)
                if exists:
                    errors.append(RowError(row=row.row_number, field="qr_code", message=f"El codigo escaneable {row.qr_code} ya esta en uso por otro producto"))

            exists = await self._product_repo.product_name_exists(store_id, normalize_product_name(row.name), row.unit)
            if exists:
                errors.append(RowError(row=row.row_number, field="name", message=f"Ya existe un producto con el nombre '{row.name}' y unidad '{row.unit}'"))

        return errors

    def _generate_qr_code(self, sku: str | None) -> str:
        if sku:
            return f"QR-{sku}"
        return f"P-{uuid4().hex[:12].upper()}"
