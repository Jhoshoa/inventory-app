# Backend Implementation Plan

Basado en los documentos `folder-structure.md` y `first-approach-v1.md`.

---

## Resumen de estructura del backend

```
apps/backend/
├── pyproject.toml                 # Poetry: python 3.12+, fastapi, sqlalchemy, etc.
├── Dockerfile
├── docker-compose.yml             # FastAPI + Redis + Celery Worker
└── .env.example
│
├── src/
│   ├── main.py                    # FastAPI app entry point
│   │
│   ├── config/                    # Configuración (Pydantic Settings)
│   │   ├── settings.py            #   Variables de entorno validadas
│   │   ├── database.py            #   SQLAlchemy engine
│   │   ├── supabase.py            #   Supabase client
│   │   ├── cloudinary.py          #   Cloudinary config
│   │   └── redis.py               #   Redis / Celery config
│   │
│   ├── domain/                    # CAPA DOMAIN (core puro)
│   │   ├── entities/              #   Product, Sale, Store, User, etc.
│   │   ├── value_objects/         #   Price, Stock, SKU, Phone
│   │   └── repositories/         #   Interfaces (ABC)
│   │
│   ├── application/              # CAPA APPLICATION (casos de uso)
│   │   ├── use_cases/            #   CreateProduct, CreateSale, etc.
│   │   ├── ports/                #   Puertos (interfaces de infraestructura)
│   │   └── dto/                  #   Pydantic DTOs
│   │
│   ├── infrastructure/          # CAPA INFRASTRUCTURE
│   │   ├── database/            #   SQLAlchemy models, repos, alembic, seed
│   │   ├── services/            #   Cloudinary, Celery tasks, OCR, ExchangeRate
│   │   └── auth/                #   SupabaseAuth
│   │
│   └── presentation/            # CAPA PRESENTATION
│       ├── api/v1/              #   FastAPI routers
│       ├── middleware/          #   Auth, error handler, rate limit
│       └── dependencies.py     #   FastAPI DI
│
└── tests/
    ├── conftest.py
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Fase 0: Fundación e Infraestructura (Días 1-3)

### Paso 0.1 — Inicializar proyecto Python

**Qué hacer:**
- Crear `apps/backend/` con `pyproject.toml` usando Poetry
- Python 3.12+, tipado estricto

**Archivo: `apps/backend/pyproject.toml`**

```toml
[tool.poetry]
name = "inventory-backend"
version = "0.1.0"
description = "Inventory App API"
python = "^3.12"

[tool.poetry.dependencies]
python = "^3.12"
fastapi = "^0.115"
uvicorn = {extras = ["standard"], version = "^0.34"}
sqlalchemy = "^2.0"
asyncpg = "^0.30"
alembic = "^1.14"
pydantic = "^2.10"
pydantic-settings = "^2.7"
httpx = "^0.28"
supabase-py = "^2.0"
cloudinary = "^1.42"
celery = "^5.4"
redis = "^5.2"
easyocr = "^1.7"
pillow = "^11.1"
opencv-python = "^4.10"
scikit-learn = "^1.6"
spacy = "^3.8"
python-multipart = "^0.0.18"
qrcode = "^7.4"
sentry-sdk = "^2.20"

[tool.poetry.group.dev.dependencies]
pytest = "^8.3"
pytest-asyncio = "^0.25"
pytest-cov = "^6.0"
ruff = "^0.9"
mypy = "^1.14"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

**Comandos:**

```bash
cd apps/backend
poetry install
poetry shell
mkdir -p src/{config,domain/{entities,value_objects,repositories},application/{use_cases/{products,sales,photos,sync,auth,store},ports,dto},infrastructure/{database/{models,repositories,alembic/versions,seed},services/{cloudinary,queue/tasks,ocr,exchange_rate},auth},presentation/{api/v1,middleware}}
mkdir -p tests/{unit/{domain,application,infrastructure},integration,e2e}
touch src/__init__.py src/domain/__init__.py src/domain/entities/__init__.py src/domain/value_objects/__init__.py src/domain/repositories/__init__.py
touch src/application/__init__.py src/application/use_cases/__init__.py src/application/ports/__init__.py src/application/dto/__init__.py
touch src/infrastructure/__init__.py src/infrastructure/database/__init__.py src/presentation/__init__.py
touch src/main.py tests/__init__.py tests/conftest.py
```

---

### Paso 0.2 — Configuración de entorno (Pydantic Settings)

**Archivo: `src/config/settings.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Inventory API"
    DEBUG: bool = False

    # Database (Supabase PostgreSQL)
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host:5432/postgres

    # Supabase Auth
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT (Supabase)
    JWT_SECRET: str

    # Sentry
    SENTRY_DSN: str | None = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()
```

**Archivo: `src/config/database.py`**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.config.settings import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
```

**Archivo: `src/config/redis.py`**

```python
from redis.asyncio import Redis
from src.config.settings import settings

redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
```

---

### Paso 0.3 — FastAPI app entry point

**Archivo: `src/main.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk import init as sentry_init

from src.config.settings import settings
from src.presentation.api.v1.router import api_v1_router
from src.presentation.middleware.error_handler import add_error_handlers

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: conectar BD, Redis, etc.
    if settings.SENTRY_DSN:
        sentry_init(dsn=settings.SENTRY_DSN)
    yield
    # Shutdown: cerrar conexiones

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_error_handlers(app)
app.include_router(api_v1_router, prefix="/api/v1")
```

---

### Paso 0.4 — Docker Compose (desarrollo local)

**Archivo: `docker-compose.yml`**

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      redis:
        condition: service_started
    command: uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

  celery-worker:
    build: .
    env_file: .env
    depends_on:
      - redis
      - api
    command: celery -A src.infrastructure.services.queue.celery_app worker --loglevel=info

  celery-beat:
    build: .
    env_file: .env
    depends_on:
      - redis
      - api
    command: celery -A src.infrastructure.services.queue.celery_app beat --loglevel=info

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**Archivo: `Dockerfile`**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && poetry config virtualenvs.create false && poetry install --no-interaction
COPY . .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Fase 1: Domain + Application (Días 4-7)

Construir el core del negocio **sin depender de infraestructura**. Todo es Python puro.

### Paso 1.1 — Entities

**Archivo: `src/domain/entities/product.py`**

```python
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID, uuid4

@dataclass
class Product:
    id: UUID
    store_id: UUID
    name: str
    price: Decimal
    stock: int
    min_stock: int = 5
    category: str | None = None
    sku: str | None = None
    unit: str = "unidad"
    photo_url: str | None = None
    qr_code: str | None = None
    cost_price: Decimal | None = None
    is_active: bool = True
    version: int = 1

    @staticmethod
    def create(store_id: UUID, name: str, price: Decimal, stock: int, **kwargs) -> "Product":
        return Product(
            id=uuid4(),
            store_id=store_id,
            name=name,
            price=price,
            stock=stock,
            **kwargs,
        )

    def can_sell(self, quantity: int) -> bool:
        return self.stock >= quantity and self.is_active

    def reduce_stock(self, quantity: int) -> None:
        if not self.can_sell(quantity):
            raise ValueError(f"Stock insuficiente: {self.stock} < {quantity}")
        self.stock -= quantity
        self.version += 1
```

**Archivos restantes (mismo patrón):**
- `src/domain/entities/sale.py` — Sale + SaleItem, cálculo de total
- `src/domain/entities/store.py` — Store (nombre, dirección, teléfono)
- `src/domain/entities/user.py` — User (id, email, store_id)
- `src/domain/entities/exchange_rate.py` — ExchangeRate (date, source, buy, sell)

---

### Paso 1.2 — Value Objects

**Archivo: `src/domain/value_objects/price.py`**

```python
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class Price:
    value: Decimal
    currency: str = "Bs"

    def __post_init__(self):
        if self.value < 0:
            raise ValueError("El precio no puede ser negativo")

    def __mul__(self, quantity: int) -> "Price":
        return Price(self.value * quantity, self.currency)

    def __add__(self, other: "Price") -> "Price":
        if self.currency != other.currency:
            raise ValueError("Monedas diferentes")
        return Price(self.value + other.value, self.currency)
```

**Archivos restantes:** `stock.py`, `sku.py`, `phone.py`

---

### Paso 1.3 — Repository Interfaces (ABC)

**Archivo: `src/domain/repositories/product_repository.py`**

```python
from abc import ABC, abstractmethod
from uuid import UUID
from src.domain.entities.product import Product

class IProductRepository(ABC):
    @abstractmethod
    async def save(self, product: Product) -> Product: ...

    @abstractmethod
    async def get_by_id(self, product_id: UUID) -> Product | None: ...

    @abstractmethod
    async def list_by_store(self, store_id: UUID) -> list[Product]: ...

    @abstractmethod
    async def delete(self, product_id: UUID) -> None: ...

    @abstractmethod
    async def update_stock(self, product_id: UUID, quantity: int) -> Product: ...
```

**Archivos restantes:** `sale_repository.py`, `store_repository.py`, `user_repository.py`, `sync_repository.py`

---

### Paso 1.4 — Use Cases (Application Layer)

**Archivo: `src/application/use_cases/products/create_product.py`**

```python
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository

@dataclass
class CreateProductInput:
    store_id: UUID
    name: str
    price: Decimal
    stock: int
    category: str | None = None
    min_stock: int = 5

class CreateProductUseCase:
    def __init__(self, repo: IProductRepository):
        self._repo = repo

    async def execute(self, input: CreateProductInput) -> Product:
        product = Product.create(
            store_id=input.store_id,
            name=input.name.strip().title(),
            price=input.price,
            stock=input.stock,
            category=input.category,
            min_stock=input.min_stock,
        )
        return await self._repo.save(product)
```

**Archivos restantes (mismo patrón):**

| Carpeta | Archivos |
|---|---|
| `products/` | `update_product.py`, `delete_product.py`, `get_product.py`, `list_products.py`, `update_stock.py` |
| `sales/` | `create_sale.py`, `get_sale.py`, `list_sales.py`, `return_sale.py` |
| `photos/` | `upload_photo.py`, `process_photo_ocr.py` |
| `sync/` | `sync_push.py`, `sync_pull.py`, `resolve_conflict.py` |
| `auth/` | `login.py`, `register.py`, `refresh_token.py` |
| `store/` | `get_store.py`, `update_store.py` |

---

### Paso 1.5 — Ports (interfaces de infraestructura)

**Archivo: `src/application/ports/photo_storage.py`**

```python
from abc import ABC, abstractmethod

class IPhotoStorage(ABC):
    @abstractmethod
    async def upload(self, image_bytes: bytes, filename: str) -> str: ...

    @abstractmethod
    async def delete(self, public_id: str) -> None: ...
```

**Archivos restantes:** `queue_service.py`, `ocr_service.py`, `exchange_rate_provider.py`

---

### Paso 1.6 — DTOs (Pydantic)

**Archivo: `src/application/dto/product_dto.py`**

```python
from decimal import Decimal
from pydantic import BaseModel, Field

class CreateProductDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    category: str | None = None
    min_stock: int = Field(default=5, ge=0)
    unit: str = "unidad"
    cost_price: Decimal | None = None
    metadata: dict = {}

class ProductResponseDTO(BaseModel):
    id: str
    name: str
    price: float
    stock: int
    category: str | None
    qr_code: str | None
    photo_url: str | None
    min_stock: int

    model_config = {"from_attributes": True}
```

**Archivos restantes:** `sale_dto.py`, `sync_dto.py`, `auth_dto.py`

---

## Fase 2: Infraestructura (Días 8-14)

Implementar las conexiones reales con servicios externos.

### Paso 2.1 — SQLAlchemy Models + Session

**Archivo: `src/infrastructure/database/models/product_model.py`**

```python
import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime, timezone

class Base(DeclarativeBase):
    pass

class ProductModel(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50))
    sku = Column(String(50))
    price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2))
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=5)
    unit = Column(String(20), default="unidad")
    photo_url = Column(String(500))
    qr_code = Column(String(100), unique=True)
    is_active = Column(Boolean, default=True)
    metadata = Column(JSON, default=dict)
    version = Column(Integer, default=1)
    deleted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
```

**Archivos restantes:** `sale_model.py`, `store_model.py`, `user_model.py`, `exchange_rate_model.py`

**Archivo: `src/infrastructure/database/session.py`**

```python
from src.config.database import AsyncSessionLocal

async def get_session():
    async with AsyncSessionLocal() as session:
        yield session
```

---

### Paso 2.2 — Repository Implementations

**Archivo: `src/infrastructure/database/repositories/product_repository.py`**

```python
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.product import Product
from src.domain.repositories.product_repository import IProductRepository
from src.infrastructure.database.models.product_model import ProductModel

class ProductRepository(IProductRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, product: Product) -> Product:
        model = ProductModel(
            id=product.id,
            store_id=product.store_id,
            name=product.name,
            price=product.price,
            stock=product.stock,
            min_stock=product.min_stock,
            category=product.category,
            sku=product.sku,
            unit=product.unit,
            qr_code=product.qr_code,
        )
        self._session.add(model)
        await self._session.commit()
        return product

    async def get_by_id(self, product_id: UUID) -> Product | None:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.id == product_id, ProductModel.deleted_at.is_(None))
        )
        model = result.scalar_one_or_none()
        if not model:
            return None
        return Product(
            id=model.id,
            store_id=model.store_id,
            name=model.name,
            price=model.price,
            stock=model.stock,
            min_stock=model.min_stock,
            category=model.category,
        )

    async def list_by_store(self, store_id: UUID) -> list[Product]:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.store_id == store_id, ProductModel.deleted_at.is_(None))
        )
        return [
            Product(id=m.id, store_id=m.store_id, name=m.name, price=m.price, stock=m.stock)
            for m in result.scalars().all()
        ]

    async def delete(self, product_id: UUID) -> None:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.id == product_id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.deleted_at = datetime.now(timezone.utc)
            await self._session.commit()
```

**Archivos restantes:** `sale_repository.py`, `store_repository.py`, `sync_repository.py`

---

### Paso 2.3 — Alembic Migrations

**Comandos:**

```bash
cd apps/backend
alembic init src/infrastructure/database/alembic
# Configurar alembic.ini: sqlalchemy.url = DATABASE_URL
alembic revision --autogenerate -m "create_products_table"
alembic upgrade head
```

**Archivos de migración esperados:**

| Archivo | Contenido |
|---|---|
| `001_create_stores.py` | Tabla `stores` |
| `002_create_products.py` | Tabla `products` |
| `003_create_sales.py` | Tablas `sales`, `sale_items` |
| `004_create_exchange_rates.py` | Tabla `exchange_rates` |
| `005_add_sync_columns.py` | Columnas `synced`, `version`, `device_id` |

---

### Paso 2.4 — Celery Config + Tasks

**Archivo: `src/infrastructure/services/queue/celery_app.py`**

```python
from celery import Celery
from src.config.settings import settings

celery_app = Celery(
    "inventory",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.infrastructure.services.queue.tasks.photo_tasks",
        "src.infrastructure.services.queue.tasks.sync_tasks",
        "src.infrastructure.services.queue.tasks.notification_tasks",
    ],
)

celery_app.conf.task_routes = {
    "photo_tasks.*": {"queue": "photo-processing"},
    "sync_tasks.*": {"queue": "sync-offline"},
    "notification_tasks.*": {"queue": "notifications"},
}

celery_app.conf.beat_schedule = {
    "sync-every-5-minutes": {
        "task": "sync_tasks.process_sync_queue",
        "schedule": 300.0,
    },
}
```

**Archivo: `src/infrastructure/services/queue/tasks/photo_tasks.py`**

```python
from celery import shared_task

@shared_task(bind=True, max_retries=3, acks_late=True)
def process_photo_ocr(self, photo_id: str, image_bytes: bytes):
    """Procesa OCR sobre una foto y devuelve JSON estructurado."""
    try:
        from src.infrastructure.services.ocr.easy_ocr import EasyOCRService
        ocr = EasyOCRService()
        result = ocr.extract_from_bytes(image_bytes)
        return result.model_dump()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
```

**Archivo: `src/infrastructure/services/queue/tasks/sync_tasks.py`**

```python
from celery import shared_task

@shared_task(bind=True, max_retries=5, acks_late=True)
def process_sync_queue(self):
    """Procesa la cola de sync offline."""
    # Lógica de sync push/pull
    pass
```

**Archivo: `src/infrastructure/services/queue/tasks/notification_tasks.py`**

```python
from celery import shared_task

@shared_task(max_retries=3)
def notify_low_stock(store_id: str, product_name: str, stock: int):
    """Envía notificación de stock bajo."""
    pass
```

---

### Paso 2.5 — Cloudinary Service

**Archivo: `src/infrastructure/services/cloudinary/photo_storage.py`**

```python
import cloudinary
import cloudinary.uploader
from src.config.settings import settings
from src.application.ports.photo_storage import IPhotoStorage

class CloudinaryPhotoStorage(IPhotoStorage):
    def __init__(self):
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
        )

    async def upload(self, image_bytes: bytes, filename: str) -> str:
        result = cloudinary.uploader.upload(
            image_bytes,
            public_id=f"products/{filename}",
            resource_type="image",
            quality="auto:good",
            width=800,
            fetch_format="auto",
        )
        return result["secure_url"]

    async def delete(self, public_id: str) -> None:
        cloudinary.uploader.destroy(public_id)
```

---

### Paso 2.6 — OCR Service (EasyOCR)

**Archivo: `src/infrastructure/services/ocr/easy_ocr.py`**

```python
import re
import easyocr
from PIL import Image
from io import BytesIO
from pydantic import BaseModel

class OCRResult(BaseModel):
    raw_text: str
    structured: dict | None = None

class EasyOCRService:
    def __init__(self):
        self.reader = easyocr.Reader(['es'], gpu=False)

    def extract_from_bytes(self, image_bytes: bytes) -> OCRResult:
        image = Image.open(BytesIO(image_bytes))
        result = self.reader.readtext(image)
        raw_text = " ".join([text for _, text, conf in result if conf > 0.5])
        structured = self._structure(raw_text)
        return OCRResult(raw_text=raw_text, structured=structured)

    def _structure(self, text: str) -> dict | None:
        """Intenta extraer nombre, precio, cantidad del texto."""
        # "arroz 10bs 20und" o "arroz 12.50 50"
        text = text.lower().strip()

        # Buscar precio: número seguido de 'bs' o suelto
        price_match = re.search(r'(\d+[.,]?\d*)\s*(?:bs|bob)?', text)
        # Buscar cantidad: número al final
        qty_match = re.findall(r'\d+', text)

        if price_match:
            name = text[:price_match.start()].strip()
            price = float(price_match.group(1).replace(',', '.'))
            stock = int(qty_match[-1]) if len(qty_match) > 1 else 0
            return {"name": name.title(), "price": price, "stock": stock}

        return None
```

---

### Paso 2.7 — Auth (Supabase JWT verification)

**Archivo: `src/infrastructure/auth/supabase_auth.py`**

```python
from supabase import create_client
from src.config.settings import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def verify_jwt(token: str) -> dict:
    """Verifica JWT de Supabase y devuelve payload del usuario."""
    response = supabase.auth.get_user(token)
    if not response.user:
        raise PermissionError("Token inválido o expirado")
    return {
        "id": response.user.id,
        "email": response.user.email,
        "store_id": response.user.user_metadata.get("store_id"),
    }
```

---

## Fase 3: Presentation Layer (Días 15-20)

Conectar los casos de uso con HTTP.

### Paso 3.1 — Dependencies (FastAPI DI)

**Archivo: `src/presentation/dependencies.py`**

```python
from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.database.session import get_session
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.auth.supabase_auth import verify_jwt

async def get_db_session() -> AsyncSession:
    async with get_session() as session:
        yield session

async def get_current_user(authorization: str = Header(...)) -> dict:
    token = authorization.replace("Bearer ", "")
    try:
        return verify_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

def get_product_repo(session: AsyncSession = Depends(get_db_session)) -> ProductRepository:
    return ProductRepository(session)
```

---

### Paso 3.2 — Products Router

**Archivo: `src/presentation/api/v1/products.py`**

```python
from fastapi import APIRouter, Depends
from src.application.dto.product_dto import CreateProductDTO, ProductResponseDTO
from src.application.use_cases.products.create_product import CreateProductUseCase, CreateProductInput
from src.presentation.dependencies import get_current_user, get_product_repo
from src.infrastructure.database.repositories.product_repository import ProductRepository

router = APIRouter(prefix="/products", tags=["products"])

@router.get("", response_model=list[ProductResponseDTO])
async def list_products(
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    products = await repo.list_by_store(user["store_id"])
    return products

@router.post("", response_model=ProductResponseDTO, status_code=201)
async def create_product(
    dto: CreateProductDTO,
    user: dict = Depends(get_current_user),
    repo: ProductRepository = Depends(get_product_repo),
):
    use_case = CreateProductUseCase(repo)
    product = await use_case.execute(CreateProductInput(
        store_id=user["store_id"],
        name=dto.name,
        price=dto.price,
        stock=dto.stock,
        category=dto.category,
        min_stock=dto.min_stock,
    ))
    return product
```

**Archivos restantes:** `sales.py`, `photos.py`, `sync.py`, `auth.py`, `store.py`, `exchange_rates.py`

---

### Paso 3.3 — Router Aggregator

**Archivo: `src/presentation/api/v1/router.py`**

```python
from fastapi import APIRouter
from src.presentation.api.v1 import products, sales, photos, sync, auth, store, exchange_rates

api_v1_router = APIRouter()
api_v1_router.include_router(products.router)
api_v1_router.include_router(sales.router)
api_v1_router.include_router(photos.router)
api_v1_router.include_router(sync.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(store.router)
api_v1_router.include_router(exchange_rates.router)
```

---

### Paso 3.4 — Middleware

**Archivo: `src/presentation/middleware/error_handler.py`**

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

def add_error_handlers(app: FastAPI):
    @app.exception_handler(Exception)
    async def global_exception(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"error": "Error interno del servidor", "detail": str(exc)},
        )

    @app.exception_handler(ValueError)
    async def value_error(request: Request, exc: ValueError):
        return JSONResponse(
            status_code=400,
            content={"error": "Datos inválidos", "detail": str(exc)},
        )
```

**Archivo: `src/presentation/middleware/auth.py`** (si se necesita validación adicional aparte de dependencies)

---

## Fase 4: Tests (Días 21-23)

### Paso 4.1 — Unit Tests (Domain + Application)

**Archivo: `tests/unit/domain/test_product.py`**

```python
from decimal import Decimal
from uuid import uuid4
from src.domain.entities.product import Product

def test_create_product():
    store_id = uuid4()
    product = Product.create(
        store_id=store_id,
        name="Arroz 1kg",
        price=Decimal("12.50"),
        stock=50,
    )
    assert product.name == "Arroz 1kg"
    assert product.price == Decimal("12.50")
    assert product.stock == 50
    assert product.can_sell(10) is True

def test_cannot_sell_if_insufficient_stock():
    product = Product(id=uuid4(), store_id=uuid4(), name="Test", price=Decimal("10"), stock=2)
    assert product.can_sell(5) is False
```

**Archivo: `tests/unit/application/test_create_product.py`**

```python
from decimal import Decimal
from uuid import uuid4
from src.application.use_cases.products.create_product import CreateProductUseCase, CreateProductInput

class MockProductRepo:
    async def save(self, product):
        return product

async def test_create_product_use_case():
    use_case = CreateProductUseCase(MockProductRepo())
    product = await use_case.execute(CreateProductInput(
        store_id=uuid4(),
        name="arroz 1kg",
        price=Decimal("12.50"),
        stock=50,
    ))
    assert product.name == "Arroz 1kg"  # title case applied
```

---

### Paso 4.2 — Integration Tests

**Archivo: `tests/integration/test_products_api.py`**

```python
from httpx import AsyncClient, ASGITransport
from src.main import app

async def test_list_products_empty():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/products")
        # Con mock de auth, debería retornar 200 o 401
        assert response.status_code in (200, 401)
```

---

## Fase 5: Deploy y Keepalive (Día 24)

### Paso 5.1 — GitHub Actions Keepalive

**Archivo: `.github/workflows/daily-keepalive.yml`**

```yaml
name: Daily Keepalive + Exchange Rates

on:
  schedule:
    - cron: "0 12 * * *"
  workflow_dispatch:

jobs:
  keepalive:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install httpx
      - run: python scripts/keepalive.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

**Archivo: `scripts/keepalive.py`**

```python
"""Cron diario: inserta tipo de cambio y mantiene BD activa."""
import os
import httpx
from datetime import date

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

def main():
    today = str(date.today())
    rates = [
        {"date": today, "source": "bcb", "buy_price": 6.96, "sell_price": 6.96},
        {"date": today, "source": "paralelo", "buy_price": 9.20, "sell_price": 9.40},
        {"date": today, "source": "referencial", "buy_price": 8.10, "sell_price": 8.30},
    ]
    for rate in rates:
        resp = httpx.post(f"{SUPABASE_URL}/rest/v1/exchange_rates", headers=HEADERS, json=rate)
        print(f"{rate['source']}: {resp.status_code}")

if __name__ == "__main__":
    main()
```

---

## Resumen del plan de implementación

| Fase | Días | Entregable |
|---|---|---|
| **Fase 0**: Fundación | 1-3 | Proyecto Python, Docker, config, app entry point |
| **Fase 1**: Domain + Application | 4-7 | Entities, Value Objects, Use Cases, DTOs, Ports |
| **Fase 2**: Infrastructure | 8-14 | SQLAlchemy models, repos, migrations, Celery, Cloudinary, OCR, Auth |
| **Fase 3**: Presentation | 15-20 | FastAPI routers, middleware, dependencias |
| **Fase 4**: Tests | 21-23 | Tests unitarios + integración |
| **Fase 5**: Deploy | 24 | Docker build, keepalive script, CI |
| **Total** | **24 días** | **Backend listo para consumir desde frontends** |
