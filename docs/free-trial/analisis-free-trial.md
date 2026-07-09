# Free Trial — Análisis e Implementación

## 1. Objetivo

Implementar un periodo de prueba gratuito de **30 días por tienda** (tenant-based). Todos los usuarios de una misma tienda comparten la misma fecha de expiración. Al vencer el trial, ningún usuario de esa tienda puede acceder al sistema hasta que se adquiera un plan.

---

## 2. User Story

```
Como nuevo usuario (owner),
Quiero probar la aplicación gratuitamente por 30 días,
Para decidir si compro el plan mensual.

Criterios de aceptación:
- Al crear mi tienda, obtengo 30 días de prueba gratuita.
- Puedo usar todas las funcionalidades durante el trial.
- Faltando 5 días para que expire, veo un aviso en el dashboard.
- Los demás usuarios de mi tienda (cashiers, otros owners) también
  expiran el mismo día que la tienda, sin importar cuándo se unieron.
- Al día 31, mi cuenta se desactiva y no puedo iniciar sesión.
- Al intentar loguearme con trial vencido, veo un mensaje claro
  con un enlace a la página de compra.
```

---

## 3. Arquitectura: Trial a nivel de Tienda (Store)

### Por qué Store-level y no User-level

| Aspecto | User-level ❌ | Store-level ✅ |
|---------|--------------|----------------|
| Owner se registra día 0 | Trial 30d | Trial 30d |
| Cashier invitado día 20 | Trial 30d (desde que acepta) | **10d restantes** (hereda de la tienda) |
| 2do Owner se une día 15 | Trial 30d individual | **15d restantes** (hereda de la tienda) |
| Trial expira | Solo ese usuario bloqueado | **TODOS** los usuarios bloqueados |
| Coherencia | Un usuario puede acceder y otro no en la misma tienda | Toda la tienda se bloquea/unifica |
| Modelo SaaS real | No es así como funciona ningún SaaS | Modelo estándar (la suscripción es de la cuenta, no del empleado) |

### Regla de oro

> **El trial es de la tienda. Todos los usuarios de esa tienda expiran y se bloquean al mismo tiempo.**

---

## 4. Variables de Entorno

Agregar a `.env` y a `Settings` (`settings.py`):

```python
# settings.py — agregar al final de la clase Settings

TRIAL_DAYS: int = 30
TRIAL_WARN_DAYS: int = 5
TRIAL_EXPIRE_CRON_HOUR: int = 8  # hora del día (UTC) para ejecutar el cron
PURCHASE_URL: str = "https://tusitio.com/planes"
```

---

## 5. Cambios en Base de Datos

### 5.1 Migración: `018_add_trial_expiry_to_stores.py`

```python
"""add trial_expires_at to stores

Revision ID: 018
Revises: 017
Create Date: 2026-07-08 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    columns = _columns("stores")

    if "trial_expires_at" not in columns:
        op.add_column(
            "stores",
            sa.Column(
                "trial_expires_at",
                sa.DateTime(timezone=True),
                nullable=True,
                comment="Fecha UTC en que expira el periodo de prueba de la tienda. "
                        "NULL para tiendas creadas antes de esta caracteristica.",
            ),
        )

    if "ix_stores_trial_expires" not in _indexes("stores"):
        op.create_index("ix_stores_trial_expires", "stores", ["trial_expires_at"])


def downgrade() -> None:
    indexes = _indexes("stores")
    if "ix_stores_trial_expires" in indexes:
        op.drop_index("ix_stores_trial_expires", table_name="stores")

    columns = _columns("stores")
    if "trial_expires_at" in columns:
        op.drop_column("stores", "trial_expires_at")
```

**Nota:** No se modifica la tabla `users`. El trial se almacena en la tienda, y los usuarios se bloquean/desbloquean en función del trial de su tienda.

---

## 6. Cambios en la Entidad de Dominio

### 6.1 Store (`store.py`)

```python
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

TRIAL_DAYS = 30
TRIAL_WARN_DAYS = 5


@dataclass
class Store:
    id: UUID
    name: str
    address: str | None = None
    phone: str | None = None
    is_active: bool = True
    timezone: str = "America/La_Paz"
    first_business_date: date | None = None
    trial_expires_at: datetime | None = None

    @staticmethod
    def create(
        name: str,
        address: str | None = None,
        phone: str | None = None,
    ) -> "Store":
        return Store(
            id=uuid4(),
            name=name,
            address=address,
            phone=phone,
        )

    @property
    def is_trial_active(self) -> bool:
        """Una tienda SIN trial_expires_at (legacy) nunca expira."""
        if self.trial_expires_at is None:
            return True
        return datetime.now(timezone.utc) < self.trial_expires_at

    @property
    def days_until_trial_ends(self) -> int | None:
        if self.trial_expires_at is None:
            return None
        remaining = (self.trial_expires_at - datetime.now(timezone.utc)).days
        return max(remaining, 0)

    @property
    def should_warn_trial_ending(self) -> bool:
        """True si quedan entre 1 y TRIAL_WARN_DAYS días inclusive."""
        if self.trial_expires_at is None:
            return False
        remaining = self.days_until_trial_ends
        if remaining is None:
            return False
        return 0 < remaining <= TRIAL_WARN_DAYS

    @staticmethod
    def calculate_trial_expiry() -> datetime:
        return datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)
```

### 6.2 User (`user.py`)

**Sin cambios.** El usuario no tiene campos de trial. Su estado de acceso depende del `trial_expires_at` de su tienda.

---

## 7. Cambios en el Modelo SQLAlchemy

### 7.1 StoreModel (`store_model.py`)

```python
# Agregar después de first_business_date
trial_expires_at = Column(DateTime(timezone=True), nullable=True)
```

### 7.2 UserModel (`user_model.py`)

**Sin cambios.**

---

## 8. Cambios en el Repositorio de Stores

### 8.1 Interfaz (`store_repository.py`)

```python
@abstractmethod
async def list_by_expired_trial(self, cutoff: datetime) -> list[Store]: ...
```

### 8.2 Implementación (`store_repository.py`)

```python
async def list_by_expired_trial(self, cutoff: datetime) -> list[Store]:
    from sqlalchemy import select

    stmt = select(StoreModel).where(
        StoreModel.trial_expires_at.isnot(None),
        StoreModel.trial_expires_at < cutoff,
        StoreModel.is_active.is_(True),
    )
    result = await self._session.execute(stmt)
    return [self._to_entity(row) for row in result.scalars()]
```

**Actualizar `save()`** para persistir el nuevo campo:

```python
async def save(self, store: Store) -> Store:
    model = await self._session.get(StoreModel, store.id)
    if model is None:
        model = StoreModel(id=store.id)
        self._session.add(model)
    model.name = store.name
    model.address = store.address
    model.phone = store.phone
    model.is_active = store.is_active
    model.timezone = store.timezone
    model.first_business_date = store.first_business_date
    model.trial_expires_at = store.trial_expires_at   # ← nuevo
    await self._session.flush()
    return store
```

**Actualizar `get_by_id()`** para mapear el nuevo campo:

```python
async def get_by_id(self, store_id: UUID) -> Store | None:
    model = await self._session.get(StoreModel, store_id)
    if model is None or not model.is_active:
        return None
    return Store(
        id=model.id,
        name=model.name,
        address=model.address,
        phone=model.phone,
        is_active=model.is_active,
        timezone=model.timezone or "America/La_Paz",
        first_business_date=model.first_business_date,
        trial_expires_at=model.trial_expires_at,          # ← nuevo
    )
```

### 8.3 Agregar `_to_entity()` helper

Para mantener consistencia con `UserRepository`, se puede refactorizar:

```python
@staticmethod
def _to_entity(model: StoreModel) -> Store:
    return Store(
        id=model.id,
        name=model.name,
        address=model.address,
        phone=model.phone,
        is_active=model.is_active,
        timezone=model.timezone or "America/La_Paz",
        first_business_date=model.first_business_date,
        trial_expires_at=model.trial_expires_at,
    )
```

---

## 9. Cambios en el Repositorio de Usuarios

### 9.1 Interfaz (`user_repository.py`)

```python
@abstractmethod
async def list_active_by_store(self, store_id: UUID) -> list[User]: ...
```

### 9.2 Implementación (`user_repository.py`)

```python
async def list_active_by_store(self, store_id: UUID) -> list[User]:
    from sqlalchemy import select

    stmt = select(UserModel).where(
        UserModel.store_id == store_id,
        UserModel.is_active.is_(True),
    )
    result = await self._session.execute(stmt)
    return [self._to_entity(row) for row in result.scalars()]
```

---

## 10. Cambios en Use Cases

### 10.1 `RegisterStoreOwnerUseCase`

Asignar `trial_expires_at` a la tienda al crearla:

```python
async def execute(self, input: RegisterStoreOwnerInput) -> RegisterStoreOwnerResult:
    store = (
        Store(id=input.store_id, name=input.store_name)
        if input.store_id
        else Store.create(input.store_name)
    )
    store.trial_expires_at = Store.calculate_trial_expiry()
    store = await self._store_repo.save(store)

    user = await self._user_repo.save(
        User(
            id=input.user_id,
            email=input.email,
            store_id=store.id,
            full_name=input.full_name,
            role="owner",
            is_active=True,
            password_hash=input.password_hash,
        )
    )
    return RegisterStoreOwnerResult(store=store, user=user)
```

### 10.2 `EnsureLocalUserUseCase`

**Sin cambios.** El trial se asigna a la tienda, no al usuario. Este use case solo asegura que el usuario exista en DB local.

### 10.3 `GetCurrentUserContextUseCase` (con trial check)

Agregar `store_repo` al constructor y verificar el trial de la tienda:

```python
from datetime import datetime, timezone


class GetCurrentUserContextUseCase:
    def __init__(
        self,
        user_repo: IUserRepository,
        store_repo: IStoreRepository | None = None,
    ):
        self._user_repo = user_repo
        self._store_repo = store_repo

    async def execute(self, raw_user: dict) -> CurrentUserContext:
        user_id = UUID(str(raw_user["id"]))
        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Usuario local no encontrado")
        if user.store_id is None:
            raise UnauthorizedError("Usuario sin tienda asignada")

        # Verificar trial de la tienda
        if self._store_repo is not None:
            store = await self._store_repo.get_by_id(user.store_id)
            if store is None:
                raise UnauthorizedError("Tienda no encontrada")
            if store.trial_expires_at is not None and datetime.now(timezone.utc) >= store.trial_expires_at:
                raise UnauthorizedError(
                    "Tu periodo de prueba ha expirado. "
                    "Adquiere un plan para continuar usando la aplicacion."
                )

        if not user.is_active:
            raise UnauthorizedError("Usuario inactivo")

        return self._to_context(user)
```

**Comportamiento esperado:**
- `store_repo = None` → no se verifica trial (útil para tests o contextos donde no aplica)
- `trial_expires_at = None` → usuario legacy, nunca expira (backward compatible)
- `is_active = False` Y trial expirado → el mensaje de trial **tiene prioridad**
- `is_active = False` Y trial vigente → "Usuario inactivo" (desactivación manual por admin)

### 10.4 `ExpireTrialsUseCase` (nuevo — cron)

```python
"""Desactiva todos los usuarios de tiendas cuyo trial_expires_at ya paso."""

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from src.domain.repositories.store_repository import IStoreRepository
from src.domain.repositories.user_repository import IUserRepository


class ExpireTrialsUseCase:
    """
    Busca tiendas con trial expirado y desactiva todos sus usuarios activos.
    Se ejecuta una vez al dia via cron (8:00 AM UTC).

    Nota: No es el unico punto de bloqueo. GetCurrentUserContextUseCase ya
    rechaza usuarios de tiendas con trial expirado en cada request. Este cron
    solo limpia el flag is_active para mantener la consistencia de datos.
    """

    def __init__(self, store_repo: IStoreRepository, user_repo: IUserRepository):
        self._store_repo = store_repo
        self._user_repo = user_repo

    async def execute(self) -> int:
        now = datetime.now(timezone.utc)
        expired_stores = await self._store_repo.list_by_expired_trial(now)
        total_deactivated = 0

        for store in expired_stores:
            active_users = await self._user_repo.list_active_by_store(store.id)
            for user in active_users:
                user.is_active = False
                await self._user_repo.save(user)
                total_deactivated += 1

        return total_deactivated
```

### 10.5 `TrialStatusUseCase` (nuevo — consulta para frontend)

```python
"""Retorna el estado del trial de la tienda a la que pertenece el usuario."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from src.domain.repositories.store_repository import IStoreRepository
from src.domain.repositories.user_repository import IUserRepository


@dataclass
class TrialStatusResult:
    is_trial: bool
    expires_at: str | None
    days_remaining: int | None
    is_expired: bool
    should_warn: bool


class TrialStatusUseCase:
    def __init__(self, store_repo: IStoreRepository):
        self._store_repo = store_repo

    async def execute(self, store_id: UUID) -> TrialStatusResult:
        store = await self._store_repo.get_by_id(store_id)
        if store is None or store.trial_expires_at is None:
            return TrialStatusResult(
                is_trial=False,
                expires_at=None,
                days_remaining=None,
                is_expired=False,
                should_warn=False,
            )
        return TrialStatusResult(
            is_trial=True,
            expires_at=store.trial_expires_at.isoformat(),
            days_remaining=store.days_until_trial_ends,
            is_expired=not store.is_trial_active,
            should_warn=store.should_warn_trial_ending,
        )
```

---

## 11. Cambios en la Capa de Presentación

### 11.1 `dependencies.py` — pasar store_repo a `GetCurrentUserContextUseCase`

```python
async def get_current_user_context(
    raw_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
) -> CurrentUserContext:
    try:
        return await GetCurrentUserContextUseCase(
            user_repo, store_repo
        ).execute(raw_user)
    except UnauthorizedError as exc:
        if not settings.DEBUG or exc.detail != "Usuario local no encontrado":
            raise
        # … fallback para DEBUG mode …
```

**En DEBUG mode**, el trial no se verifica (el `store_repo` podría no existir o la tienda forzada no tener trial). Considerar inyectar `store_repo=None` en DEBUG, o crear una instancia separada para dev.

### 11.2 Endpoint `/auth/login` — verificar trial después del login

```python
@router.post("/login", response_model=AuthResponseDTO)
async def login(
    dto: LoginDTO,
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    # ... (flujo existente hasta obtener local_user) ...

    # Verificar trial de la tienda ANTES de devolver tokens
    store = await store_repo.get_by_id(local_user.store_id)
    if store is not None and store.trial_expires_at is not None:
        if datetime.now(timezone.utc) >= store.trial_expires_at:
            raise HTTPException(
                status_code=401,
                detail="Tu periodo de prueba ha expirado. "
                       "Adquiere un plan para continuar usando la aplicacion.",
            )

    if not local_user.is_active:
        raise UnauthorizedError("Usuario inactivo")

    # ... (continuar con la respuesta) ...
```

**NOTA:** En `settings.DEBUG`, saltar esta verificación para no bloquear el desarrollo.

### 11.3 Endpoint `/auth/register` — ya asigna trial vía `RegisterStoreOwnerUseCase`

Sin cambios en el endpoint (el trial se asigna en el use case).

### 11.4 Endpoint `/auth/oauth/callback` — asignar trial a tiendas creadas via OAuth

```python
# Dentro de oauth_callback, donde se crea la tienda:
new_store = Store.create(store_name)
new_store.trial_expires_at = Store.calculate_trial_expiry()
new_store = await store_repo.save(new_store)
```

Este bloque aparece en dos lugares dentro del callback (store_id no existe → crear).

### 11.5 Endpoint `/auth/me` — incluir datos de trial

```python
@router.get("/me", response_model=CurrentUserDTO)
async def me(
    user=Depends(get_current_user_context),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    store = await store_repo.get_by_id(user.store_id)
    return CurrentUserDTO(
        id=user.id,
        email=user.email,
        store_id=user.store_id,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        trial_expires_at=store.trial_expires_at if store else None,
        days_until_trial_ends=store.days_until_trial_ends if store else None,
    )
```

### 11.6 Endpoint `/auth/trial-status` (nuevo)

```python
@router.get("/trial-status")
async def trial_status(
    user=Depends(get_current_user_context),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    """Retorna estado del trial para la tienda del usuario autenticado."""
    uc = TrialStatusUseCase(store_repo)
    return await uc.execute(user.store_id)
```

### 11.7 Endpoint `/admin/expire-trials` (ejecución manual del cron)

```python
@router.post("/admin/expire-trials")
async def expire_trials(
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
):
    if not settings.DEBUG:
        raise HTTPException(status_code=403, detail="Solo disponible en modo debug")
    uc = ExpireTrialsUseCase(store_repo, user_repo)
    count = await uc.execute()
    return {"deactivated": count}
```

---

## 12. Tarea Programada (Cron)

Se ejecuta **1 vez al día a las 8:00 AM UTC** (configurable vía `TRIAL_EXPIRE_CRON_HOUR`).

### Opción A: Bucle asíncrono en el lifespan de FastAPI

```python
# En main.py
import asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from src.config.settings import settings


async def expire_trials_loop(app: FastAPI):
    while True:
        now = datetime.now(timezone.utc)
        target_hour = settings.TRIAL_EXPIRE_CRON_HOUR
        next_run = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)
        if now >= next_run:
            next_run += timedelta(days=1)
        sleep_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(sleep_seconds)

        try:
            # Obtener dependencias desde el estado de la app
            session = await anext(get_db_session())
            user_repo = UserRepository(session)
            store_repo = StoreRepository(session)
            uc = ExpireTrialsUseCase(store_repo, user_repo)
            count = await uc.execute()
            logger.info("Cron expire-trials: %d usuarios desactivados", count)
        except Exception:
            logger.exception("Error en expire_trials_loop")
```

### Opción B: Script externo llamado por el scheduler del sistema

```python
# scripts/expire_trials.py
"""Script para ejecutar desde cron del sistema operativo."""
import asyncio
from src.infrastructure.database.session import get_session
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.database.repositories.user_repository import UserRepository
from src.application.use_cases.trials.expire_trials import ExpireTrialsUseCase


async def main():
    async with get_session() as session:
        uc = ExpireTrialsUseCase(
            StoreRepository(session),
            UserRepository(session),
        )
        count = await uc.execute()
        print(f"Desactivados: {count}")


if __name__ == "__main__":
    asyncio.run(main())
```

**Cron del sistema:**

```
0 8 * * * cd /path/to/app && py -m scripts.expire_trials
```

---

## 13. Cambios en DTOs

### 13.1 `CurrentUserDTO`

```python
class CurrentUserDTO(BaseModel):
    id: UUID
    email: str
    store_id: UUID
    full_name: str | None = None
    role: str
    is_active: bool
    trial_expires_at: datetime | None = None
    days_until_trial_ends: int | None = None
```

### 13.2 `AuthResponseDTO`

No cambia la estructura, pero el dict `user` ahora incluye:

```python
# user dict incluye:
#   trial_expires_at: str | None (ISO format)
#   days_until_trial_ends: int | None
```

### 13.3 `StoreDTO` / `StoreResponseDTO` (si existe)

Si se expone la tienda vía API, agregar `trial_expires_at`.

---

## 14. Cambios en el Frontend

### 14.1 Tipo `Session` (`session.ts`)

```typescript
export interface Session {
  userId: string;
  email: string;
  storeId: string | null;
  storeName: string;
  fullName: string | null;
  role: UserRole;
  trialExpiresAt?: string | null;
  daysUntilTrialEnds?: number | null;
}
```

### 14.2 Tipo `AuthUser` (`types.ts`)

```typescript
export interface AuthUser {
  id: string;
  email: string;
  store_id?: string;
  store_name?: string | null;
  full_name?: string | null;
  role?: UserRole;
  is_active?: boolean;
  trial_expires_at?: string | null;
  days_until_trial_ends?: number | null;
}
```

### 14.3 Serialización (`session.ts`)

```typescript
function sessionFromUser(user: AuthUser): Session {
  return {
    userId: user.id,
    email: user.email,
    storeId: user.store_id ?? null,
    storeName: user.store_name ?? "Mi tienda",
    fullName: user.full_name ?? null,
    role: user.role ?? "cashier",
    trialExpiresAt: user.trial_expires_at ?? null,
    daysUntilTrialEnds: user.days_until_trial_ends ?? null,
  };
}
```

### 14.4 Componente `TrialBanner`

```tsx
// src/features/trial/components/TrialBanner.tsx
"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

interface TrialBannerProps {
  daysRemaining: number;
  purchaseUrl: string;
}

export function TrialBanner({ daysRemaining, purchaseUrl }: TrialBannerProps) {
  if (daysRemaining <= 0) return null;

  return (
    <Alert variant="warning" className="rounded-none border-x-0">
      <div className="flex items-center justify-between gap-4">
        <span>
          {daysRemaining === 1
            ? "Tu periodo de prueba termina mañana. "
            : `Tu periodo de prueba termina en ${daysRemaining} dias. `}
          Adquiere el plan mensual para seguir usando la aplicacion.
        </span>
        <Button
          variant="link"
          className="shrink-0"
          onClick={() => window.open(purchaseUrl, "_blank")}
        >
          Ver planes
        </Button>
      </div>
    </Alert>
  );
}
```

### 14.5 Integración en Dashboard Layout

```tsx
// apps/web/app/(app)/dashboard/layout.tsx
const session = await requireSession();

const showTrialWarning =
  session.daysUntilTrialEnds !== null &&
  session.daysUntilTrialEnds !== undefined &&
  session.daysUntilTrialEnds > 0 &&
  session.daysUntilTrialEnds <= 5;

return (
  <AppShell session={session}>
    {showTrialWarning && (
      <TrialBanner
        daysRemaining={session.daysUntilTrialEnds!}
        purchaseUrl="https://tusitio.com/planes"
      />
    )}
    {children}
  </AppShell>
);
```

### 14.6 Manejo de Trial Expirado en Login

```tsx
// LoginForm.tsx o login/route.ts
if (error.message?.includes("prueba ha expirado")) {
  return (
    <Alert variant="warning">
      Tu periodo de prueba ha expirado.
      <br />
      <a
        href="https://tusitio.com/planes"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Adquiere un plan para continuar usando la aplicacion
      </a>
    </Alert>
  );
}
```

---

## 15. Seed Data

```python
"""Seed: tiendas con diferentes estados de trial."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from src.domain.entities.store import Store

now = datetime.now(timezone.utc)

seed_stores = [
    # Tienda con trial activo (25/30 días restantes)
    Store(
        id=uuid4(),
        name="Tienda Trial Activo",
        trial_expires_at=now + timedelta(days=25),
    ),
    # Tienda con trial próximo a vencer (3 días restantes → debe ver warning)
    Store(
        id=uuid4(),
        name="Tienda por Vencer",
        trial_expires_at=now + timedelta(days=3),
    ),
    # Tienda con trial expirado (sus usuarios deben estar inactivos)
    Store(
        id=uuid4(),
        name="Tienda Expirada",
        trial_expires_at=now - timedelta(days=1),
    ),
    # Tienda legacy sin trial (nunca expira)
    Store(
        id=uuid4(),
        name="Tienda Legacy",
        trial_expires_at=None,
    ),
]

# Para cada tienda, crear un usuario owner asociado:
seed_users = [
    User(id=uuid4(), email="activo@test.com", store_id=seed_stores[0].id,
         full_name="Trial Activo", role="owner", is_active=True),
    User(id=uuid4(), email="por-vencer@test.com", store_id=seed_stores[1].id,
         full_name="Trial por Vencer", role="owner", is_active=True),
    User(id=uuid4(), email="expirado@test.com", store_id=seed_stores[2].id,
         full_name="Trial Expirado", role="owner", is_active=False),
    User(id=uuid4(), email="legacy@test.com", store_id=seed_stores[3].id,
         full_name="Sin Trial", role="owner", is_active=True),
]
```

---

## 16. Flujo Completo

```
REGISTRO (email+password o Google OAuth)
  │
  ▼
RegisterStoreOwnerUseCase / oauth_callback
  │
  ├── Store.create(name)
  ├── store.trial_expires_at = now + 30d
  ├── User.create(role="owner", is_active=true)
  │
  └── Response OK (tokens o "revisa tu email")


LOGIN (cada vez)
  │
  ▼
POST /auth/login
  │
  ├── Supabase valida credenciales
  ├── EnsureLocalUserUseCase (crea user local si no existe)
  ├── Verificar trial de la STORE:
  │   ├── trial_expires_at == None     → OK (legacy)
  │   ├── trial_expires_at > now       → OK (activo)
  │   │   └── days_remaining <= 5      → Frontend muestra banner
  │   └── trial_expires_at <= now      → 401 "Tu periodo de prueba ha expirado..."
  │
  └── user.is_active == false          → 401 "Usuario inactivo"


REQUEST AUTENTICADO (cualquier endpoint con get_current_user_context)
  │
  ▼
GetCurrentUserContextUseCase(user_repo, store_repo)
  │
  ├── User not found       → 401
  ├── Store not found      → 401
  ├── Store trial expirado → 401 "Tu periodo de prueba ha expirado..."
  ├── User is_active=false → 401 "Usuario inactivo"
  └── Todo OK              → CurrentUserContext


CRON (8:00 AM UTC diario)
  │
  ▼
ExpireTrialsUseCase
  │
  ├── StoreRepository.list_by_expired_trial(now)
  ├── Por cada tienda:
  │   ├── UserRepository.list_active_by_store(store.id)
  │   └── user.is_active = False (para cada usuario)
  │
  └── Log: "X usuarios desactivados"
```

---

## 17. Edge Cases y Mitigaciones

| # | Edge Case | Comportamiento | Mitigación |
|---|-----------|---------------|------------|
| 1 | Tienda creada antes de la migración (`trial_expires_at = NULL`) | Nunca expira, backward compatible | `Store.is_trial_active` retorna `True` si `trial_expires_at is None` |
| 2 | Cashier se une a una tienda que lleva 20 días de trial | Solo le quedan 10 días de acceso | El trial es de la tienda, no del usuario |
| 3 | Usuario intenta loguear justo cuando expira el trial | Rechazado con mensaje específico | Comparación `>=` (no solo `>`) en `GetCurrentUserContextUseCase` |
| 4 | Cron desactiva usuarios, pero el trial check ya los bloquea antes | Sin impacto, defensa en profundidad | El cron es secundario; la guardia real está en cada request |
| 5 | Admin desactiva manualmente a un usuario (`is_active = False`) y además el trial expira | Mensaje de trial tiene prioridad | El orden en `GetCurrentUserContextUseCase`: trial primero, `is_active` después |
| 6 | Usuario de tienda expirada intenta acceder a `/auth/me` | Rechazado por `get_current_user_context` | Necesario para evitar datos a cuentas vencidas |
| 7 | Tienda expirada quiere renovar | Admin actualiza `trial_expires_at` (manualmente, futuro: webhook de pago) | No hay lógica de renovación en este MVP, solo desactivación |
| 8 | Varias tiendas, mismo dueño, expiran en distintas fechas | Cada tienda es independiente | Cada tienda tiene su propio `trial_expires_at` |
| 9 | DEBUG mode | No se verifica trial | En `auth.py` login, el bloque DEBUG retorna antes del chequeo. En `dependencies.py`, se puede pasar `store_repo=None`. |
| 10 | Cron falla un día | Sin impacto: el trial check en cada request sigue funcionando | Defensa en profundidad |

---

## 18. Riesgos y Mitigaciones (Generales)

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Usuario se registra, no confirma email, el trial corre igual | Bajo | El trial se asigna al crear la tienda (en registro), pero como no puede loguear sin confirmar email, el tiempo corre igual. Aceptable para MVP. Futuro: pausar trial hasta confirmación. |
| Diferencia horaria servidor vs Supabase vs frontend | Bajo | Todo en UTC. El frontend convierte a local para mostrar. |
| Un usuario crea múltiples cuentas para extender el trial | Medio | Supabase previene emails duplicados. Para extender el trial, necesitaría otro email y otra tienda. Aceptable. |
| El banner de advertencia no se muestra por caché del navegador | Bajo | `days_until_trial_ends` se calcula server-side y se envía en la sesión (cookie httponly). No depende de caché. |
| Owner quiere acceder a datos históricos después del trial | Medio | Los datos no se eliminan. Si renueva, se reactivan los usuarios. Si no renueva, los datos quedan en DB pero inaccesibles. |

---

## 19. Validaciones y Buenas Prácticas

### Backend
- **Defensa en profundidad**: El trial se verifica en 3 capas: login → `GetCurrentUserContextUseCase` → cron
- **Backward compatibility**: `trial_expires_at = NULL` → nunca expira
- **Idempotencia**: La migración usa `_columns()` helper para no fallar si se ejecuta múltiples veces
- **Timezone**: Siempre `datetime.now(timezone.utc)`. Almacenar con `DateTime(timezone=True)`
- **No hardcodear URLs**: `PURCHASE_URL` va en settings
- **DEBUG bypass**: En modo debug, no se verifica trial para no bloquear desarrollo
- **Orden de validación**: Trial check ANTES de `is_active`, para dar mensaje más específico

### Frontend
- **No confiar solo en frontend**: El banner es informativo. El backend siempre rechaza si el trial expiró
- **Banner liviano**: No hace fetch extra (datos vienen en la sesión)
- **No bloquear UX**: El banner no debe impedir la navegación

### Base de datos
- **Índice en `trial_expires_at`**: Necesario para que el cron sea eficiente
- **Columna nullable**: Para tiendas legacy

---

## 20. Orden de Implementación

1. **Migración DB** (`018_add_trial_expiry_to_stores.py`)
2. **Modelo SQLAlchemy** (`store_model.py`): agregar `trial_expires_at`
3. **Entidad de dominio** (`store.py`): propiedades `is_trial_active`, `days_until_trial_ends`, `should_warn_trial_ending`
4. **Repositorio de stores** (`store_repository.py`): `list_by_expired_trial`, mapeo en `save` y `get_by_id`
5. **Repositorio de usuarios** (`user_repository.py`): `list_active_by_store`
6. **Use cases**:
   - `RegisterStoreOwnerUseCase`: asignar `trial_expires_at` en store
   - `GetCurrentUserContextUseCase`: agregar `store_repo`, verificar trial
   - `ExpireTrialsUseCase`: nuevo
   - `TrialStatusUseCase`: nuevo
7. **DTOs**: `CurrentUserDTO` con campos de trial
8. **Presentación**:
   - `dependencies.py`: pasar `store_repo` a `GetCurrentUserContextUseCase`
   - `auth.py`: verificar trial en login, oauth_callback, `/me`, `/trial-status`
   - Endpoint `/admin/expire-trials` (debug)
   - Tarea programada `expire_trials_loop`
9. **Frontend**:
   - Tipos (`AuthUser`, `Session`)
   - Serialización (`session.ts`)
   - Componente `TrialBanner`
   - Integración en dashboard layout
   - Manejo de error de trial expirado en login
10. **Seed data**
11. **Tests**

---

## 21. Notas Finales

- **No tocar la tabla `users`**: El trial vive en `stores`, los usuarios heredan el estado de su tienda.
- **El cron es opcional para la seguridad, pero necesario para consistencia de datos**: Sin cron, el trial check protege todos los accesos. Con cron, los reportes y queries que filtran por `is_active` reflejan el estado real.
- **La renovación** se haría actualizando `trial_expires_at` en la tienda (futuro: webhook Stripe/PayPal).
- **La URL de compra** debe apuntar a una página pública (aún no implementada en este repo).
- **Todas las comparaciones de fecha son en UTC**.

---

## 22. Modelo de Negocio y Registro de Usuarios

### 22.1 ¿Auto-registro abierto o controlado?

**Recomendación: Auto-registro abierto (sin restricción).**

| Aspecto | Auto-registro (recomendado) | Controlado (admin crea cada cuenta) |
|---------|----------------------------|-------------------------------------|
| Fricción | Baja: email + password | Alta: contactar, esperar, recibir invitación |
| Conversión estimada | ~80% de los que llegan al formulario | ~10-20% |
| Escalabilidad | Automático, sin intervención humana | Requiere equipo de ventas/soporte |
| Control de abuso | Suficiente con email único + verificación | Control total, pero lento |

**¿Y si alguien crea múltiples cuentas para extender el trial?**

El riesgo es bajo porque:
1. Cada registro requiere un **email único** (unique en `users.email`)
2. Si Confirm email está ON, necesita **acceder a cada bandeja** para verificar
3. Cada cuenta crea una **tienda separada**. No puede consolidar datos entre tiendas.
4. El esfuerzo de re-ingresar productos, clientes, etc. supera el beneficio de unos días extra.

**Conclusión:** El trial por tienda + verificación de email es suficiente protección para un MVP. No justifica frenar la adquisición de usuarios.

### 22.2 Invitación de usuarios vs email existente

**Problema:** `users.email` tiene `UNIQUE`. Si el usuario A (email@example.com) ya tiene su propia tienda y es invitado a otra, hay conflicto.

**Regla para MVP: rechazar la invitación si el email ya existe en el sistema.**

```
FLUJO DE INVITACIÓN (futuro endpoint)

POST /api/v1/stores/{store_id}/invitations
  Body: { email: "invitado@example.com", role: "cashier" }
  
  1. Buscar user por email en DB local
  2. Si existe → 409 Conflict "Este email ya pertenece a otra tienda"
  3. Si no existe → crear User con:
       - id = uuid4()
       - email = "invitado@example.com"
       - store_id = store_id (la tienda que invita)
       - role = "cashier"
       - is_active = true
  4. El usuario invitado debe completar registro en Supabase
     (crear cuenta con ese email + password) y luego loguear.
  5. Al loguear, EnsureLocalUserUseCase encuentra el user local
     ya creado con store_id asignada → login exitoso.
```

**¿Por qué no mover al usuario de tienda?**
- Perdería acceso a su tienda original.
- Los datos históricos quedarían huérfanos.
- El modelo actual (1 user → 1 store) no soporta pertenencia múltiple.

### 22.3 Modelo futuro: multi-tenant real (post-MVP)

Cuando el negocio requiera que un usuario pertenezca a varias tiendas (ej. contador externo, dueño de múltiples sucursales), se necesita una **tabla pivote**:

```sql
CREATE TABLE user_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    role VARCHAR(20) NOT NULL DEFAULT 'cashier',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, store_id)
);
```

**Cambios que implica:**
- `users.store_id` se vuelve nullable o se elimina (el store_id se lee de `user_stores`)
- El login elige a qué tienda acceder (o tiene una default)
- `CurrentUserContext` incluye `store_id` de la tienda activa en esa sesión
- El trial se sigue verificando contra `stores.trial_expires_at`
- Las invitaciones ya no chocan: un email puede estar en N tiendas

**No implementar ahora.** Es un cambio estructural grande que no aporta valor hasta que haya clientes reales pidiéndolo.
