# Backend & Frontend Codebase Audit

> Date: 2026-07-15
> Scope: `apps/backend/src/` (API, use cases, repos, auth) and `apps/web/src/` (components, hooks, API client)
> Complements: `findings.md` (UI/UX bugs), `ui-ux-audit-and-improvement-plan.md` (design audit)

---

## Table of Contents

1. [🔴 Security — Must Fix Immediately](#-security--must-fix-immediately)
2. [🔴 Data Integrity — Must Fix Before Data Loss](#-data-integrity--must-fix-before-data-loss)
3. [🔴 Frontend Bugs — Affects Users Today](#-frontend-bugs--affects-users-today)
4. [🟡 Architecture Violations — Clean Code Debt](#-architecture-violations--clean-code-debt)
5. [🟡 Performance — N+1 Queries & Resource Leaks](#-performance--n1-queries--resource-leaks)
6. [🟠 Dead Code & Organization](#-dead-code--organization)
7. [🟠 Test Coverage Gaps](#-test-coverage-gaps)

---

## 🔴 Security — Must Fix Immediately

### S1. Password hash comparison is not constant-time

**Files:** `apps/backend/src/infrastructure/auth/password.py:16`

**Problem:**
```python
# Variable-time string comparison — susceptible to timing side-channel attacks
return dk.hex() == dk_hex
```

Python's `==` short-circuits on the first differing byte, making the comparison time proportional to the matching prefix. An attacker can brute-force the hash byte-by-byte by measuring response times.

**Fix:**
```python
import hmac
return hmac.compare_digest(dk.hex(), dk_hex)
```

`hmac.compare_digest` runs in constant time regardless of how many bytes match.

**Best practice:** Always use `hmac.compare_digest` (or `secrets.compare_digest` in Python 3.13+) for comparing secrets, hashes, or any value derived from secret input.

---

### S2. Exchange rate upsert lacks role authorization

**File:** `apps/backend/src/presentation/api/v1/exchange_rates.py:23-29`

**Problem:**
```python
@router.post("", response_model=ExchangeRateResponseDTO, status_code=201)
async def upsert_exchange_rate(
    dto: ExchangeRateUpsertDTO,
    user: dict = Depends(get_current_user),  # any authenticated user
    repo: ExchangeRateRepository = Depends(get_exchange_rate_repo),
):
    return await repo.upsert(...)  # no owner check
```

A cashier can modify exchange rates, which directly affects financial calculations (sales totals, profit reports, cost of goods sold).

**Fix:**
```python
from src.presentation.dependencies import require_owner

@router.post("", ...)
async def upsert_exchange_rate(
    dto: ExchangeRateUpsertDTO,
    user: CurrentUserDTO = Depends(require_owner),  # <-- owner-only
    repo: ...,
):
```

**Best practice:** Every mutation endpoint should explicitly declare its minimum required role. Use `require_owner` for owner-only mutations, and add a `require_cashier_or_owner` helper for operations both roles can perform. Never rely on implicit frontend-only gating.

---

### S3. OAuth callback leaks internal exception details

**File:** `apps/backend/src/presentation/api/v1/auth.py:477`

**Problem:**
```python
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Error al intercambiar codigo: {e}")
```

`str(e)` can leak stack traces, SQL query fragments, library versions, file paths, or infrastructure details. In production this is an information disclosure vulnerability.

**Fix:**
```python
except Exception:
    logger.exception("OAuth code exchange failed")  # ← log full trace server-side
    raise HTTPException(status_code=500, detail="Error al iniciar sesión con Google")
```

**Best practice:** Never interpolate `str(e)` into user-facing error messages. Always log the full exception with `logger.exception()` and return a generic, user-safe message.

---

### S4. Supabase client recreated on every request

**Files:** `apps/backend/src/presentation/api/v1/auth.py:179,276,338,408,435`, `apps/backend/src/infrastructure/auth/supabase_auth.py:22`

**Problem:**
```python
# Called inside 5+ request handlers
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
```

Each call creates a new HTTP session with its own connection pool and TLS handshake. Under concurrent load this is a resource leak (file descriptors, sockets, memory).

**Fix:**
```python
# Module-level singleton (lazy-init)
_supabase_client: Client | None = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _supabase_client
```

Or better, use FastAPI dependency injection:
```python
# In dependencies.py or a new supabase_deps.py
async def get_supabase_client():
    return get_supabase_client_singleton()
```

**Best practice:** HTTP clients (Supabase, Cloudinary, external APIs) should be created once at startup and reused. Use `httpx.AsyncClient` with connection pooling for custom integrations. In FastAPI, use `@app.on_event("startup")` or the lifespan context manager to initialize and shutdown clients.

---

## 🔴 Data Integrity — Must Fix Before Data Loss

### D1. CSV import has broken transaction atomicity

**Files:** `apps/backend/src/presentation/api/v1/products.py:391-395`, `apps/backend/src/application/use_cases/products/import_products_csv.py:78-81,131-157`

**Problem:**

The import endpoint opens a dedicated `AsyncSession` and passes it to the use case, but the injected repositories (`product_repo`, `category_repo`, `job_repo`) each hold their own session via `get_db_session()`:

```python
# products.py — opens ONE session
async with get_session() as session:
    use_case = ImportProductsCsvUseCase(session, product_repo, category_repo, job_repo)
```

```python
# import_products_csv.py — begins transaction on session
async with self._session.begin():         # ← wraps session (empty transaction)
    for row in parsed:
        await self._product_repo.save(p)  # ← saves on product_repo's session, NOT self._session
    await self._job_repo.save(job)        # ← saves on job_repo's session, NOT self._session
```

The `self._session.begin()` wraps an empty transaction. Product saves and job status updates happen on three independent sessions with no atomicity guarantee. If product inserts succeed but the final job status save fails, the data is inconsistent.

**Fix (option A — prefer DI cleanup):**

Ensure all repositories share the same session instance:
```python
async with get_session() as session:
    product_repo = ProductRepository(session)
    category_repo = ProductCategoryRepository(session)
    job_repo = JobRepository(session)
    use_case = ImportProductsCsvUseCase(session, product_repo, category_repo, job_repo)
```

**Fix (option B — minimal change):**

Drive all operations through the primary session instead of delegating to repo methods that open their own sessions:
```python
async with self._session.begin():
    for row in parsed:
        product = ProductModel(...)
        self._session.add(product)
    self._job = JobModel(...)
    self._session.add(job)
```

**Best practice:** Use a **Unit of Work** pattern or a **request-scoped session** shared across all repositories within a single request. FastAPI's `Depends(get_db_session)` should return the same session instance for the lifetime of the request. Never inject repositories with independent sessions into the same use case.

---

### D2. TOCTOU race condition in sale creation

**File:** `apps/backend/src/application/use_cases/sales/create_sale.py:50-89`

**Problem:**

1. **Line 51:** Read product stock (`SELECT ... WHERE id = ?`)
2. **Line 54:** Check if stock is sufficient (based on potentially stale data)
3. **Line 79:** Save the sale
4. **Line 82:** Deduct stock (`UPDATE ... SET stock = stock - ? WHERE id = ? AND stock >= ?`)

Between steps 1 and 4, a concurrent request can:
- Read the same stock
- Both see `stock >= quantity` (both pass the check)
- Both deduct stock independently
- Result: **oversold** — stock goes negative without a compensating check

**Fix:**

```python
# Option A: SELECT ... FOR UPDATE (row-level lock)
async with self._session.begin():
    product = await self._product_repo.get_by_id_locked(store_id, item.product_id)  # SELECT ... FOR UPDATE
    if product.stock < item.quantity:
        raise InsufficientStockError(...)
    sale = Sale.create(...)
    self._session.add(sale)
    for item in input.items:
        await self._product_repo.update_stock(...)  # still within same transaction
```

```python
# Option B: Pessimistic check on stock deduction
# Ensure update_stock uses: UPDATE ... SET stock = stock - :qty WHERE id = :pid AND stock >= :qty
rows = await self._session.execute(
    update(ProductModel)
    .where(ProductModel.id == product_id)
    .where(ProductModel.store_id == store_id)
    .where(ProductModel.stock >= quantity)
    .values(stock=ProductModel.stock - quantity)
)
if rows.rowcount == 0:
    raise InsufficientStockError(...)  # concurrent request consumed the stock
```

**Best practice:** Never read-then-check-then-write without database-level locking or conditional updates. Use `SELECT ... FOR UPDATE`, optimistic locking with version columns, or a conditional `UPDATE ... WHERE stock >= :needed` that returns the affected row count.

---

### D3. Sale voiding uses N+1 queries (can timeout on voiding large sales)

**File:** `apps/backend/src/application/use_cases/sales/void_sale.py:31-40`

Same N+1 stock-update pattern as sale creation. See Performance section P1 for details and fix.

---

## 🔴 Frontend Bugs — Affects Users Today

### F1. Tooltip.tsx uses `useId()` without `"use client"`

**File:** `apps/web/src/components/ui/Tooltip.tsx:11`

```tsx
import { useId } from "react";
// ...
const id = useId();  // Hook called without "use client" directive
```

**Status: ✅ FIXED** — `"use client";` was added as the first line.

---

### F2. ImageUploader object URL memory leak

**File:** `apps/web/src/features/products/components/ImageUploader.tsx:122-182`

**Problem:**
```tsx
// processFile (line 164-170):
URL.revokeObjectURL(previewUrl);  // revokes OLD url
const newUrl = URL.createObjectURL(blob);
setPreviewUrl(newUrl);             // stores NEW url
// handleUpload() later runs with STALE previewUrl closure,
// revokes the already-revoked url, sets previewUrl to null
// The new object URL (newUrl) is never revoked
```

Each file selection leaks one object URL until the component unmounts.

**Fix:**
```tsx
const processFile = useCallback((file: File) => {
    setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);  // ← use functional update
        return URL.createObjectURL(blob);
    });
    handleUploadRef.current?.(file);
}, []);

// In cleanup:
useEffect(() => {
    return () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
}, [previewUrl]);
```

Or better, use a ref for the current URL to avoid stale closure issues entirely:
```tsx
const previewUrlRef = useRef<string | null>(null);

// processFile
if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
previewUrlRef.current = URL.createObjectURL(blob);
setPreviewUrl(previewUrlRef.current);
```

**Best practice:** Whenever using `URL.createObjectURL`, always pair it with a corresponding `URL.revokeObjectURL` in a `useEffect` cleanup or a ref-based lifecycle. Use functional state updates (`setState(prev => ...)`) when the new value depends on the old one to avoid stale closure bugs.

---

### F3. ProductLabelPage: `NaN` quantity crashes label calculations

**File:** `apps/web/src/features/products/components/ProductLabelPage.tsx:408`

**Problem:**
```tsx
onChange={(event) => updateQuantity(product, Number(event.target.value))}
```

HTML `<input type="number">` accepts characters like `e`, `+`, `-` in the value. `Number("e")` → `NaN`. The quantity becomes `NaN`, and `totalLabels` (sum of all quantities) becomes `NaN`, rendering the entire page unusable until remount.

**Fix:**
```tsx
onChange={(event) => {
    const raw = event.target.value;
    if (raw === "" || raw === "0") {
        updateQuantity(product, 1);
        return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 1) {
        updateQuantity(product, Math.min(num, MAX_LABELS_PER_PRINT));
    }
}}
```

**Best practice:** Always sanitize numeric input from `<input type="number">`. Use `parseInt` (not `Number`) for integer fields, validate with `!isNaN()` and `>= min` before updating state. HTML validation (`min`, `max`, `step`) is a UX hint, not a security or correctness guarantee.

---

### F4. Pagination crashes with missing props

**File:** `apps/web/src/components/ui/Pagination.tsx:58,64`

**Problem:**
```tsx
<PageLink href={hrefFor(basePath!, searchParams!, previousOffset)} />
```

Non-null assertions (`!`) mean that if a caller forgets to pass `basePath` or `searchParams`, the error is `TypeError: Cannot read properties of undefined` at runtime with no useful message.

**Fix:**
```tsx
interface PaginationProps {
    basePath?: string;
    searchParams?: URLSearchParams;
    onNavigate?: (offset: number) => void;
    // ... other props
}
```

And guard at the top of the component:
```tsx
if (!basePath || !searchParams) {
    throw new Error("Pagination: basePath and searchParams are required when onNavigate is not provided");
}
```

**Best practice:** Never use non-null assertions (`!`) on props. Either make the props required in the type definition, or throw an explicit error with a descriptive message. In TypeScript 5.5+, use branded types or satisfies expressions for stronger guarantees.

---

### F5. Button.tsx and ErrorState.tsx accepted event handlers without `"use client"`

**Files:** `apps/web/src/components/ui/Button.tsx`, `apps/web/src/components/ui/ErrorState.tsx`

**Status: ✅ FIXED** — `"use client";` added to both files.

### F6. TrialBanner had unnecessary `"use client"`

**File:** `apps/web/src/features/trial/components/TrialBanner.tsx`

**Status: ✅ FIXED** — Removed `"use client";`. The component is purely presentational.

---

### F7. Proxy retry sends null body on POST/PUT/PATCH/DELETE

**File:** `apps/web/src/lib/api/proxy.ts:38-40`

**Problem:** On 401 response, the proxy retries with `request.body` (a `ReadableStream` already consumed by the first fetch). The retry has `null` body.

**Best practice:** Buffer the body before the first fetch:
```ts
const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.clone().text();
// Then on retry: new Request(url, { body, ... })
```

---

## 🟡 Architecture Violations — Clean Code Debt

### A1. Domain entity imports infrastructure settings

**File:** `apps/backend/src/domain/entities/store.py:5`

**Problem:**
```python
from src.config.settings import settings
```

This is a **direct violation of Clean Architecture** — the domain layer must have zero dependencies on infrastructure or configuration. It ties the entity to a specific settings implementation, making it untestable without loading the full config module.

`settings` is used in `days_until_trial_ends` and `grace_days_remaining` computed properties. These should be injected, not imported.

**Fix:**

```python
# domain/entities/store.py — no settings import
@property
def days_until_trial_ends(self) -> int | None:
    if self.trial_expires_at is None:
        return None
    delta = self.trial_expires_at - date.today()
    return max(delta.days, 0)

# The application layer injects the value:
# application/use_cases/trials/expire_trials.py
GRACE_PERIOD_DAYS = settings.GRACE_PERIOD_DAYS  # ← settings lives here
```

**Best practice:** The domain layer should only use Python builtins, standard library, and domain-defined abstractions. Configuration values, environment variables, and framework-specific imports belong in the infrastructure or application layer and should be passed to domain entities as constructor arguments or method parameters.

---

### A2. ExchangeRateRepository has no domain interface

**File:** `apps/backend/src/infrastructure/database/repositories/exchange_rate_repository.py`

**Problem:** Every other repository follows the pattern:
```
domain/repositories/product_repository.py  ← Interface (ABC)
infrastructure/database/repositories/product_repository.py  ← Implementation
```

`ExchangeRateRepository` is a concrete class with no corresponding domain interface. This breaks the architectural pattern and makes it impossible to:
- Swap the implementation (e.g., to a Redis cache or an external API)
- Mock the repository in unit tests without mocking SQLAlchemy
- Verify interface compliance with static analysis

**Fix:** Create `src/domain/repositories/exchange_rate_repository.py`:
```python
class ExchangeRateRepository(ABC):
    @abstractmethod
    async def upsert(self, store_id: UUID, dto: ...) -> ExchangeRate: ...
    @abstractmethod
    async def get_latest(self, store_id: UUID, source: str) -> ExchangeRate | None: ...
    @abstractmethod
    async def list_by_store(self, store_id: UUID) -> list[ExchangeRate]: ...
```

Then make the infrastructure implementation inherit from it.

---

### A3. Domain entity exposes password_hash

**File:** `apps/backend/src/domain/entities/user.py:16`, `apps/backend/src/infrastructure/database/repositories/user_repository.py:123`

**Problem:** `password_hash: str | None = None` is a public field on the `User` domain entity. The repository always populates it via `_to_entity`. If any endpoint, middleware, or log statement accidentally serializes a `User` entity, password hashes leak.

**Fix:** Remove `password_hash` from the domain entity. The password hash should live only in the repository layer and the auth service. When the login use case needs it, use a dedicated method:
```python
class UserRepository(ABC):
    @abstractmethod
    async def get_by_email_with_password(self, email: str) -> tuple[User, str | None]: ...
```

Or keep it on the model but strip it before serialization:
```python
# In _to_entity — don't set password_hash
return User(id=model.id, email=model.email, ...)
# And handle password separately in the auth use case
```

**Best practice:** Domain entities should not contain secrets. If a secret must cross the domain boundary (e.g., password hash for verification), use a dedicated transport object or a method that explicitly separates the identity from the credential. Never include sensitive fields in `__repr__`, `__str__`, or JSON serialization of domain entities.

---

### A4. Duplicate dev constants across three files

**Files:**
- `apps/backend/src/presentation/dependencies.py:55-59`
- `apps/backend/src/infrastructure/database/seed/dev_seed.py:15-17`
- `apps/backend/src/infrastructure/seed.py:9-13` (dead file)

**Problem:** `DEV_USER_ID`, `DEV_CASHIER_USER_ID`, `DEV_STORE_ID` are defined independently in three places. Changing a UUID in one file silently breaks the others.

**Fix:** Centralize in a single location:
```python
# src/config/dev_constants.py
DEV_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
DEV_CASHIER_USER_ID = UUID("00000000-0000-0000-0000-000000000002")
DEV_STORE_ID = UUID("00000000-0000-0000-0000-000000000101")
```

Then import from `src.config.dev_constants` everywhere.

---

### A5. Overly broad `except Exception` in auth dependency

**File:** `apps/backend/src/presentation/dependencies.py:112`

**Problem:**
```python
except Exception:
    raise HTTPException(status_code=401, detail="Token invalido")
```

Catches `TypeError`, `KeyError`, `AttributeError`, and other programming errors, converting them all into a generic 401. A bug in the JWT decoding logic would silently return "Token invalido" instead of a 500 error.

**Fix:** Catch specific exceptions:
```python
except jwt.ExpiredSignatureError:
    raise HTTPException(status_code=401, detail="Token expirado")
except jwt.JWTError:
    raise HTTPException(status_code=401, detail="Token invalido")
# Let unexpected exceptions propagate (FastAPI will return 500)
```

**Best practice:** Always catch the narrowest exception type. Let unexpected programming errors crash loudly (500) so they're caught during development, not silently swallowed as authentication failures.

---

## 🟡 Performance — N+1 Queries & Resource Leaks

### P1. Sale creation and voiding: N+1 stock updates

**Files:**
- `apps/backend/src/application/use_cases/sales/create_sale.py:50-53,81-89`
- `apps/backend/src/application/use_cases/sales/void_sale.py:31-40`

**Problem:** For N items in a sale, 2N individual DB calls are made:
```python
# N SELECTs
for item in input.items:
    product = await self._product_repo.get_by_id(store_id, item.product_id)

# N UPDATEs
for item in input.items:
    await self._product_repo.update_stock(...)
```

**Fix:** Batch reads and writes:
```python
# Single batch read
product_ids = [item.product_id for item in input.items]
products = await self._product_repo.get_by_ids(store_id, product_ids)
product_map = {p.id: p for p in products}

# Single batch stock update
stock_updates = [{"product_id": item.product_id, "quantity": item.quantity} for item in input.items]
await self._product_repo.batch_update_stock(store_id, stock_updates)
```

```python
# batch_update_stock implementation:
await self._session.execute(
    update(ProductModel),
    [
        {"id": item.product_id, "stock": ProductModel.stock - item.quantity}
        for item in input.items
    ],
)
```

**Best practice:** Whenever you see a `for` loop with a database call inside it, you likely have an N+1 problem. Batch operations reduce round trips from N to 1 and can be wrapped in a single transaction for atomicity.

---

### P2. CSV import validation: 3 queries per row

**File:** `apps/backend/src/application/use_cases/products/import_products_csv.py:381-394`

**Problem:** For each row, 3 individual DB queries:
```python
for row in rows:
    if row.sku:
        exists = await self._product_repo.sku_exists(store_id, row.sku)
    if row.qr_code:
        exists = await self._product_repo.qr_code_exists(row.qr_code)
    exists = await self._product_repo.product_name_exists(...)
```

For a 5000-row CSV, that's up to 15000 round trips.

**Fix:** Batch all validation upfront:
```python
# Collect all SKUs, QRs, names
all_skus = [row.sku for row in rows if row.sku]
all_qrs = [row.qr_code for row in rows if row.qr_code]
all_names = [row.name for row in rows]

# Single batch queries
existing_skus = await self._product_repo.skus_exist(store_id, all_skus)     # WHERE sku IN (...)
existing_qrs = await self._product_repo.qr_codes_exist(all_qrs)             # WHERE qr_code IN (...)
existing_names = await self._product_repo.names_exist(store_id, all_names)  # WHERE name IN (...)

# Then validate each row against the pre-fetched sets
for row in rows:
    if row.sku in existing_skus:
        errors.append(...)
```

**Best practice:** For any batch processing, always move from per-item queries to set-based operations (`WHERE IN (...)`). For very large batches (10k+ rows), consider chunking the set into batches of 500-1000 to avoid SQL query size limits and memory pressure.

---

### P3. Trial expiration uses N+1 individual updates

**Files:**
- `apps/backend/src/application/use_cases/trials/expire_trials.py:23-29`
- `apps/backend/src/application/use_cases/trials/process_grace_period.py:25-31`

**Problem:** Each store gets two individual UPDATE statements. For the first run on a large DB with thousands of expired trials, this is O(N) round trips.

**Fix:**
```python
# Single batch update:
await self._store_repo.batch_update_statuses(
    store_ids=[s.id for s in expired_stores],
    access_status="suspended",
    subscription_status="expired",
)
```

```python
# Repository implementation:
await self._session.execute(
    update(StoreModel)
    .where(StoreModel.id.in_(store_ids))
    .values(access_status=access_status, subscription_status=subscription_status)
)
```

---

### P4. Sync push: individual duplicate checks per change

**File:** `apps/backend/src/infrastructure/database/repositories/sync_repository.py:145-153,254-272`

**Problem:** Each sync change is processed with individual DB queries for duplicate checking, applying, and recording. For N changes in a sync batch, this is O(N) round trips.

**Fix:** Same batching strategy as above. For offline-first sync, consider using `INSERT ... ON CONFLICT DO UPDATE` (upsert) for sale items and product updates to handle duplicates in a single statement per type.

---

### P5. Stock movement export loads 10K rows in memory

**File:** `apps/backend/src/infrastructure/database/repositories/stock_movement_repository.py:66-72`

**Problem:**
```python
movements, _total = await self.search(..., limit=10000, offset=0)
```

All matching rows are loaded into Python objects, then serialized to JSON. For stores with heavy daily activity, this consumes significant memory.

**Fix:** Use `yield_per` for streaming:
```python
async def list_for_export(self, store_id, from_date, to_date):
    stmt = (
        select(StockMovementModel)
        .where(...)
        .execution_options(stream_results=True)
        .yield_per(500)
    )
    async for row in self._session.stream(stmt):
        yield row_to_dto(row)
```

**Best practice:** Never load unbounded result sets into memory. Use `yield_per`, `stream_results`, or server-side cursors for any export that could reasonably exceed a few hundred rows.

---

### P6. Supabase client created per request

Already covered in Security section S4.

### P7. Cloudinary config re-initialized per request

**File:** `apps/backend/src/infrastructure/services/cloudinary/photo_storage.py:29-34`

**Problem:** `cloudinary.config(...)` is called on every `CloudinaryPhotoStorage()` instantiation, which happens per upload/delete request. This is a no-op idempotent call, so it doesn't leak resources — but it's dead code noise. Remove it and configure Cloudinary once at startup if needed.

---

### P8. Frontend: Inline callbacks cause unnecessary re-renders

**File:** `apps/web/src/features/pos/components/PosWorkspace.tsx:38-41`

**Problem:** Four inline arrow functions create new references on every render, causing `PosCart` (and its `QuantityStepper` children) to re-render even when cart state hasn't changed:
```tsx
<PosCart
    onIncrement={(productId) => dispatch(...)}
    onDecrement={(productId) => dispatch(...)}
    onQuantityChange={(productId, qty) => dispatch(...)}
    onRemove={(productId) => dispatch(...)}
/>
```

**Fix:** Extract stable callbacks:
```tsx
const handleIncrement = useCallback(
    (productId: string) => dispatch({ type: "INCREMENT", productId }),
    [dispatch],  // dispatch is stable from useReducer
);
```

Or even simpler, since all handlers just dispatch:
```tsx
// In PosCart, accept dispatch directly
<PosCart dispatch={dispatch} cart={state.cart} />
```

**Best practice:** When using `useReducer`, child components that need to dispatch actions should either:
1. Receive `dispatch` directly (it's stable across renders), or
2. Receive stable callbacks created with `useCallback`

This avoids unnecessary re-renders in the component tree.

---

## 🟠 Dead Code & Organization

### O1. Files to delete

| File | Reason |
|------|--------|
| `apps/backend/src/infrastructure/seed.py` | Duplicate of `database/seed/dev_seed.py` — never imported |
| `apps/backend/src/config/cloudinary.py` | Configures Cloudinary at module level but is never imported anywhere |
| `apps/backend/src/application/ports/exchange_rate_provider.py` | Defines `IExchangeRateProvider` ABC with no implementation — never imported |
| `apps/backend/src/infrastructure/services/exchange_rate/__init__.py` | Empty package — never implemented |
| `apps/backend/src/presentation/api/webhooks/__init__.py` | Empty package — never implemented |
| `apps/backend/src/infrastructure/services/ocr/__pycache__/` | Orphaned bytecode — source was already deleted |
| `apps/web/src/lib/api/messages.ts` | Superseded by `errors.ts:readErrorMessage()` — never imported |
| `apps/web/src/lib/diagnostics/request-id.ts` | Utility function never imported anywhere |
| `apps/backend/src/infrastructure/database/alembic/versions/4e1e63e2bb80_description.py` | Breaks naming convention (no number prefix, placeholder docstring) |
| `apps/backend/src/infrastructure/database/alembic/versions/cd682c8574c1_add_user_password_hash.py` | Breaks naming convention (no number prefix) |

### O2. Files to rename/move

| File | Recommendation |
|------|--------------|
| `apps/web/src/features/store-day/components/store-day-helpers.ts` | MOVE to `features/store-day/utils/store-day-helpers.ts` — contains pure utilities, not React components |
| `4e1e63e2bb80_description.py` | RENAME to `015b_fix_unique_constraint_and_fk.py` to match numbered convention |
| `cd682c8574c1_add_user_password_hash.py` | RENAME to `015c_add_user_password_hash.py` to match numbered convention |

### O3. Code deduplication opportunities

| What | Where | Action |
|------|-------|--------|
| `formatDate` / `formatDateTime` | 7+ files | Centralize in `lib/format/datetime.ts` — already exists there, but most components re-implement |
| `shortId(value.slice(0,8))` | 2 files + inline | Centralize in `lib/format/id.ts` |
| `cashMovementLabel` | 2 files | Centralize in `features/store-day/utils/labels.ts` |
| `readErrorMessage` | `ProductLabelPage.tsx` (local) vs `lib/api/errors.ts` (shared) | Use shared import |
| Dev UUIDs | 3 files | Centralize in `src/config/dev_constants.py` |

---

## 🟠 Test Coverage Gaps

### Endpoints without integration tests

| Endpoint | File |
|----------|------|
| `POST /exchange-rates` | `apps/backend/src/presentation/api/v1/exchange_rates.py` |
| `PATCH /admin/stores/{id}/billing` | `apps/backend/src/presentation/api/v1/billing.py` |
| `GET /billing/status` | `apps/backend/src/presentation/api/v1/billing.py` |
| `PATCH /stores/{id}` | `apps/backend/src/presentation/api/v1/store.py` |

### Use cases without unit tests

| Use Case | File |
|----------|------|
| `ExpireTrialsUseCase` | `src/application/use_cases/trials/expire_trials.py` |
| `ProcessGracePeriodUseCase` | `src/application/use_cases/trials/process_grace_period.py` |
| `BillingStatusUseCase` | `src/application/use_cases/trials/trial_status.py` |
| Login / Register / Refresh | `src/application/use_cases/auth/` |
| Product Category CRUD | `src/application/use_cases/product_categories/` |
| User management | `src/application/use_cases/users/` |

### Frontend components without tests

High-complexity components that should be tested:

- `PosWorkspace.tsx` — POS logic with useReducer
- `ProductCsvImportDialog.tsx` — Multi-step import flow
- `ImageUploader.tsx` — File upload with validation
- `BillingSettings.tsx` — Subscription management
- `PermissionMatrix.tsx` — Role/permission display
- `SalesBrowser.tsx` — Filtered list with pagination
- `StoreDayActionForm.tsx` — Business day open/close

---

## Summary by Priority

| Priority | Count | Key Items |
|----------|-------|-----------|
| 🔴 Security | 4 | Timing attack (S1), missing authz (S2), exception leak (S3), supabase client leak (S4) |
| 🔴 Data Integrity | 3 | CSV atomicity (D1), TOCTOU sale (D2), N+1 void (D3) |
| 🔴 Frontend Bugs | 7 | Memory leak (F2), NaN crash (F3), pagination (F4), proxy retry (F7), + previous 'use client' fixes (F1, F5, F6 ✅) |
| 🟡 Architecture | 5 | Domain depends on infra (A1), missing interface (A2), password hash leak (A3), duplicate UUIDs (A4), broad except (A5) |
| 🟡 Performance | 8 | N+1 in sales (P1), CSV (P2), trials (P3), sync (P4), in-memory export (P5), supabase client (P6=S4), cloudinary (P7), re-renders (P8) |
| 🟠 Dead Code | 10 | Delete stale files, rename migration files, deduplicate utilities |
| 🟠 Tests | 8+ | Missing integration, unit, and component tests |

**Total: ~45+ actionable items** across 7 categories.
