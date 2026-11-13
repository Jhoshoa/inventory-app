import csv
import io
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.exceptions import ConflictError
from src.application.use_cases.products.code_rules import (
    free_product_code,
    normalize_product_code,
    product_code_error,
)
from src.application.use_cases.products.name_normalizer import normalize_product_name
from src.domain.entities.import_job import ImportJob, ImportJobStatus, RowError
from src.domain.entities.product import Product
from src.domain.entities.product_batch import (
    DEFAULT_ALERT_DAYS,
    MAX_ALERT_DAYS,
    MAX_EXPIRY_YEAR,
    MIN_EXPIRY_YEAR,
    NewBatch,
)
from src.domain.repositories.product_batch_repository import IProductBatchRepository
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
    expires_on: str | None = None
    alert_days: str | None = None


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
    initial_batch: NewBatch | None = None


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
    # Opcionales: el stock inicial entra como un lote que vence ese dia.
    "vence",
    "aviso_dias",
]

# Formatos aceptados en "vence": 2026-12-31 (planillas) o 31/12/2026 (como se escribe aca).
EXPIRY_DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y")


def parse_expiry_date(value: str) -> date | None:
    for fmt in EXPIRY_DATE_FORMATS:
        try:
            parsed = datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
        return parsed if MIN_EXPIRY_YEAR <= parsed.year <= MAX_EXPIRY_YEAR else None
    return None


class ImportProductsCsvUseCase:
    def __init__(
        self,
        session: AsyncSession,
        product_repo: IProductRepository,
        category_repo: IProductCategoryRepository,
        job_repo: IImportJobRepository,
        batch_repo: IProductBatchRepository | None = None,
    ):
        self._session = session
        self._product_repo = product_repo
        self._category_repo = category_repo
        self._job_repo = job_repo
        self._batch_repo = batch_repo

    async def execute(
        self,
        store_id: UUID,
        user_id: UUID,
        filename: str,
        content: str,
        default_alert_days: int = DEFAULT_ALERT_DAYS,
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

        parsed = self._parse_rows(raw_rows, default_alert_days)

        business_errors = await self._validate_business(store_id, parsed)
        if business_errors:
            job.complete(len(raw_rows), 0, business_errors)
            await self._job_repo.save(job)
            return job

        job.status = ImportJobStatus.INSERTING
        await self._job_repo.save(job)

        imported = 0
        # Codigos que ya trae el archivo: un automatico no puede repetir uno de ellos.
        used_codes = {row.qr_code for row in parsed if row.qr_code}

        async def code_taken(code: str) -> bool:
            return code in used_codes or await self._product_repo.qr_code_exists(store_id, code)

        current_row = 0
        # La sesion ya tiene una transaccion abierta (el job se guardo arriba):
        # un SAVEPOINT deja la insercion en todo o nada sin abrir otra.
        try:
            async with self._session.begin_nested():
                for row in parsed:
                    current_row = row.row_number
                    if row.category_id and not row.sku:
                        sku = await self._category_repo.reserve_next_sku(store_id, row.category_id)
                        if sku is None:
                            raise ConflictError(f"No se pudo generar SKU para la categoria en fila {row.row_number}")
                        row.sku = sku

                    if not row.qr_code:
                        row.qr_code = await free_product_code(row.sku, code_taken)
                        used_codes.add(row.qr_code)

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
                    if row.initial_batch is not None and self._batch_repo is not None:
                        await self._batch_repo.add(store_id, product.id, product.stock, row.initial_batch)
                    imported += 1
        except IntegrityError:
            # Otro producto tomo el mismo nombre, SKU o codigo mientras se importaba (o un
            # caso que la revision no vio): se informa la fila en lugar de un error 500.
            job.complete(
                len(raw_rows),
                0,
                [
                    RowError(
                        row=current_row,
                        field="file",
                        message="El nombre, SKU o codigo de esta fila ya esta en uso. Revisa y vuelve a importar.",
                    )
                ],
            )
            await self._job_repo.save(job)
            return job

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
                    sku=normalize_product_code(self._get(row, "sku")),
                    unit=self._get(row, "unit"),
                    min_stock=self._get(row, "min_stock"),
                    cost_price=self._get(row, "cost_price"),
                    qr_code=normalize_product_code(self._get(row, "qr_code")),
                    photo_url=self._get(row, "photo_url"),
                    expires_on=self._get(row, "vence"),
                    alert_days=self._get(row, "aviso_dias"),
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

            sku_error = product_code_error(row.sku)
            if sku_error:
                errors.append(RowError(row=row.row_number, field="sku", message=f"SKU: {sku_error}"))

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

            qr_error = product_code_error(row.qr_code)
            if qr_error:
                errors.append(RowError(row=row.row_number, field="qr_code", message=f"Codigo para escanear: {qr_error}"))

            if row.photo_url is not None and len(row.photo_url) > 500:
                errors.append(RowError(row=row.row_number, field="photo_url", message="photo_url debe tener maximo 500 caracteres"))

            errors.extend(self._validate_expiry(row))

        return errors

    def _validate_expiry(self, row: RawProductRow) -> list[RowError]:
        errors: list[RowError] = []
        if row.expires_on is not None:
            if parse_expiry_date(row.expires_on) is None:
                errors.append(
                    RowError(
                        row=row.row_number,
                        field="vence",
                        message="vence debe ser una fecha valida (AAAA-MM-DD o DD/MM/AAAA)",
                    )
                )
            elif self._batch_repo is None:
                errors.append(RowError(row=row.row_number, field="vence", message="vence no esta disponible"))
            elif not (row.stock or "").isdigit() or int(row.stock or 0) <= 0:
                errors.append(
                    RowError(row=row.row_number, field="vence", message="vence necesita un stock mayor a 0")
                )
        if row.alert_days is not None:
            if row.expires_on is None:
                errors.append(
                    RowError(row=row.row_number, field="aviso_dias", message="aviso_dias necesita una fecha en vence")
                )
            elif not row.alert_days.isdigit() or int(row.alert_days) > MAX_ALERT_DAYS:
                errors.append(
                    RowError(
                        row=row.row_number,
                        field="aviso_dias",
                        message=f"aviso_dias debe ser un numero entero entre 0 y {MAX_ALERT_DAYS}",
                    )
                )
        return errors

    def _parse_rows(
        self, raw_rows: list[RawProductRow], default_alert_days: int = DEFAULT_ALERT_DAYS
    ) -> list[ParsedProductRow]:
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

            initial_batch: NewBatch | None = None
            expires_on = parse_expiry_date(row.expires_on) if row.expires_on else None
            if expires_on is not None:
                alert_days = int(row.alert_days) if row.alert_days is not None else default_alert_days
                initial_batch = NewBatch(expires_on=expires_on, alert_days=alert_days)

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
                    initial_batch=initial_batch,
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

        all_skus = [row.sku for row in rows if row.sku]
        all_qrs = [row.qr_code for row in rows if row.qr_code]
        all_names = [(normalize_product_name(row.name), row.unit) for row in rows]

        existing_skus = await self._product_repo.skus_exist(store_id, all_skus) if all_skus else set()
        existing_qrs = await self._product_repo.qr_codes_exist(store_id, all_qrs) if all_qrs else set()
        existing_names = await self._product_repo.names_exist(store_id, all_names) if all_names else set()

        for row in rows:
            if row.sku and row.sku in existing_skus:
                errors.append(RowError(row=row.row_number, field="sku", message=f"El SKU {row.sku} ya esta en uso por otro producto"))

            if row.qr_code and row.qr_code in existing_qrs:
                errors.append(RowError(row=row.row_number, field="qr_code", message=f"El codigo escaneable {row.qr_code} ya esta en uso por otro producto"))

            if normalize_product_name(row.name) in existing_names:
                errors.append(RowError(row=row.row_number, field="name", message=f"Ya existe un producto con el nombre '{row.name}' y unidad '{row.unit}'"))

        return errors
