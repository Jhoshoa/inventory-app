# Enhancement Findings — Web App

> Date: 2026-07-14
> Scope: `apps/web` (UI) and `apps/backend` (API) validation/cross-cutting concerns

---

## 🔴 Critical — Bugs That Affect Users Today

### 1. CSV Import silently swallows all errors

**File:** `apps/web/src/features/products/components/ProductCsvImportDialog.tsx:71-73`

The `catch` block discards the error and resets to idle with zero feedback:

```tsx
catch {
  setState({ phase: "idle" });
}
```

**Impact:** Any failure (network error, 422 validation, 500 server error, async job failure) causes the dialog to close silently. The user never learns what went wrong and may assume the import succeeded.

**Fix needed:** Capture the error message and display it via the existing `Alert` component, consistent with every other dialog in the codebase (`VoidSaleDialog`, `ProductStockDialog`, `ProductDeleteDialog`).

---

### 2. Proxy retry sends null body on POST/PUT/PATCH/DELETE

**File:** `apps/web/src/lib/api/proxy.ts:38-40`

On a 401 response, the proxy refreshes the token and retries. But `request.body` is a `ReadableStream` that was already consumed by the first `fetch` call. The retry will have a `null` body.

```ts
// pseudocode: first fetch consumes request.body (ReadableStream)
const res = await fetch(request.url, { body: request.body, ... });
// on 401: retry with same request — body is now null
const retry = await fetch(request.url, { body: request.body, ... });
```

**Impact:** Any POST/PUT/PATCH/DELETE request that encounters an expired token during the call will have the body silently dropped on retry. The server receives a malformed request (likely 422) and the user sees a generic error.

**Fix needed:** Buffer `request.body` as text/bytes before the first fetch, then reuse the buffered body on retry.

---

### 3. Category mutations leave server caches stale

**File:** `apps/web/src/features/product-categories/components/ProductCategorySettings.tsx:54-57, 81-83`

After creating or deactivating a category, the component updates local `visibleCategories` state but never calls `router.refresh()`.

**Impact:** The category dropdown in `ProductForm` (`/dashboard/products/new` and `/dashboard/products/[productId]/edit`) shows stale data until the user does a full page navigation. A user who creates a category and immediately creates a product won't see the new category in the dropdown.

**Fix needed:** Add `router.refresh()` after successful mutations, consistent with `StoreDayStatusPanel` and `VoidSaleDialog`.

---

## 🟡 Skeletons — Layout Shifts and Missing Loading States

### 4. Dashboard skeleton missing StoreDayStatusPanel placeholder

**Files:** `apps/web/src/features/dashboard/components/DashboardSkeleton.tsx` (lines 3-27), `DashboardOverview.tsx` (line 69)

The skeleton has no placeholder for `StoreDayStatusPanel`, which sits between the header and the metric grid and is always rendered on the dashboard.

**Impact:** When the page loads, the store-day panel appears after the metric grid has already rendered, causing a vertical layout shift.

---

### 5. Products skeleton missing entire PageHeader

**Files:** `apps/web/src/features/products/components/ProductTableSkeleton.tsx` (lines 3-13), `apps/web/app/(app)/dashboard/products/page.tsx` (lines 30-53)

The skeleton is a simple `<section>` with a pulse bar and 8 table rows. The real page renders a full `PageHeader` with eyebrow, title, description, and up to 3 action buttons ("Imprimir etiquetas", CSV import trigger, "Nuevo producto").

Additionally missing:
- Filter bar: skeleton shows one bar; real page has 3+ filter controls
- Pagination: real `ProductBrowser` always renders `ProductPagination`
- Table columns: skeleton has generic rows; real table has 7 columns

---

### 6. Reports skeleton missing ExportPanel and header actions

**Files:** `apps/web/src/features/reports/components/ReportsPageSkeleton.tsx` (lines 14-60), `apps/web/app/(app)/dashboard/reports/page.tsx` (lines 36-87)

The skeleton never renders:
- Action buttons in `PageHeader` ("Movimientos de stock", "Cierres diarios", "Movimientos de caja")
- The `ExportPanel` at the bottom (4 export buttons in a bordered section)

**Impact:** Both the header buttons and export panel appear suddenly after load, causing noticeable layout shifts.

---

### 7. Pages with no loading.tsx (blank screen while fetching)

| Page | File | Data Fetched |
|------|------|-------------|
| Product Detail | `app/(app)/dashboard/products/[productId]/page.tsx` | Product + stock movements (2 API calls) |
| Sale Detail | `app/(app)/dashboard/sales/[saleId]/page.tsx` | Sale data |
| Settings | `app/(app)/dashboard/settings/page.tsx` | Store day + events + categories + closing preview + cash movements (up to 5 calls) |
| Cash Movements | `app/(app)/dashboard/reports/cash-movements/page.tsx` | Session + paginated movements |
| Store Days | `app/(app)/dashboard/reports/store-days/page.tsx` | Session + paginated close reports |
| Store Day Detail | `app/(app)/dashboard/reports/store-days/[businessDayId]/page.tsx` | Close report + cash movements |
| Stock Movements | `app/(app)/dashboard/reports/stock-movements/page.tsx` | Session + paginated movements |

**Impact:** These pages render nothing while the server fetches data. The user sees either a blank white page or the previous page until the full response arrives.

---

## 🟡 Validation Gaps — Frontend Accepts, Backend Rejects (422)

### 8. Login: password minimum length mismatch

| Side | Constraint | File:Line |
|------|-----------|-----------|
| Frontend | `password.length < 6` → min **6** chars | `LoginForm.tsx:140` |
| Backend | `min_length=1` → min **1** char | `auth_dto.py:13` |

A user with a 1-5 character password is blocked by the frontend but accepted by the backend. An API caller bypasses the frontend check entirely.

---

### 9. Cash movement: amount=0 passes frontend, rejected by backend

| Side | Constraint | File:Line |
|------|-----------|-----------|
| Frontend | Regex `/^\d+(\.\d{1,2})?$/` — `"0"` passes | `store-day/schemas.ts:19` |
| Backend | `gt=0` — strictly greater than 0 | `cash_movement_dto.py:10` |

User enters `0` as amount → frontend validates OK → backend returns 422.

---

### 10. Stock adjustment: reason max_length=120 not validated on frontend

| Side | Constraint | File:Line |
|------|-----------|-----------|
| Frontend | No length check on reason | `products/schemas.ts:82-96` |
| Backend | `max_length=120` | `product_dto.py:59` |

---

### 11. Product create/update: sku max_length=50 not validated on frontend

| Side | Constraint | File:Line |
|------|-----------|-----------|
| Frontend | No validation for sku length | `products/schemas.ts:53-80` |
| Backend | `max_length=50` | `product_dto.py:36` |

---

### 12. POS sale: customer_name max_length=100 not validated on frontend

| Side | Constraint | File:Line |
|------|-----------|-----------|
| Frontend | No length check on customer name | `pos/actions.ts:17` |
| Backend | `max_length=100` | `sale_dto.py:25` |

---

### 13. Store-day open/close: money amount has no upper bound on frontend

| Side | Constraint | File:Line |
|------|-----------|-----------|
| Frontend | Only regex pattern; no `max_digits` check | `store-day/schemas.ts:19` |
| Backend | `max_digits=12, decimal_places=2` → max `9999999999.99` | `store_day_dto.py:11-12` |

---

### 14. Cash movement: movement_type not validated against enum on backend

| Side | Constraint | File:Line |
|------|-----------|-----------|
| Frontend | Whitelist: `["cash_in", "cash_out", "expense", "deposit", "withdrawal"]` | `store-day/schemas.ts:30` |
| Backend | Only `max_length=30`, no enum | `cash_movement_dto.py:9` |

An API caller can create a cash movement with `movement_type: "invalid_type"` and it will be stored.

---

## 🟠 Race Conditions

### 15. POS search QR scan fires duplicate requests

**File:** `apps/web/src/features/pos/components/PosProductSearch.tsx:85-108`

The text search (`handleSearch`, lines 42-83) properly uses a `cancelled` flag and timeout debouncing. However `handleExactLookup` (triggered by Enter key or barcode scan) fires `fetch` with no `AbortController` and no deduplication.

**Impact:** If a user presses Enter twice rapidly (or scans a barcode that also triggers Enter), two parallel requests race. The slower response can overwrite the correct result from the faster one.

---

### 16. ImageUploader has no abort on unmount

**Files:** `apps/web/src/features/products/components/ImageUploader.tsx:77-80, 98-100`

`uploadPhoto` and `deletePhoto` do not use `AbortController`. If the component unmounts mid-upload, the response callback updates state on an unmounted component.

**Severity:** LOW (user explicitly triggers the action; unmount during upload is unlikely).

---

## 🟢 Low Severity — Cosmetic or Preventive

### 17. Product table skeleton does not represent column structure

**File:** `apps/web/src/features/products/components/ProductTableSkeleton.tsx:6-11`

Shows 8 generic `h-14` rows with no column differentiation. Real table has 7 columns of varying widths.

---

### 18. Sales skeleton date inputs lack calendar icon

**File:** `apps/web/src/features/sales/components/SalesTableSkeleton.tsx:27, 33`

Skeleton uses plain `<Input type="date">`; real `SalesDateFilter` wraps dates in a `relative` container with `CalendarDays` icon and `pl-9` padding.

---

### 19. min_stock defaults disagree: frontend=5, backend=1

| Side | Default | File:Line |
|------|---------|-----------|
| Frontend | `product?.min_stock ?? "5"` → **5** | `products/schemas.ts:133` |
| Backend | `default=1` → **1** | `product_dto.py:34` |

When creating a product without touching `min_stock`, the frontend sends 5. The backend's default of 1 never applies.

---

### 20. No store settings edit form (read-only only)

**File:** `apps/web/src/features/settings/components/SettingsOverview.tsx`

The backend has a `StoreUpdateDTO` (`store_dto.py:6-9`) with `name`, `address`, `phone` fields. The frontend displays these as read-only with no edit form. Store settings can only be changed via the API.

---

### 21. unit max_length inconsistency between create and update DTOs

| DTO | Constraint | File:Line |
|-----|-----------|-----------|
| `CreateProductDTO.unit` | No `max_length` | `product_dto.py:35` |
| `UpdateProductDTO.unit` | `max_length=20` | `product_dto.py:50` |

A product can be created with a 10,000-character unit but cannot be updated to one.

---

### 22. Cash void reason is hardcoded, not user-provided

**File:** `apps/web/src/features/store-day/actions.ts:122`

```ts
void_reason: "Anulado desde Ajustes"
```

The user never sees or controls the void reason for cash movements.

---

### 23. No frontend register form exists

**Files:** `apps/web/app/(auth)/register/page.tsx` does not exist. `apps/backend/src/application/dto/auth_dto.py:23-44` has a full `RegisterDTO` with email regex, password complexity, `full_name`, `store_name`.

Registration is only possible via the API or Supabase directly. (Noted but out of scope unless registration flow is planned.)

---

## Summary by Priority

| Priority | Count | Key Items |
|----------|-------|-----------|
| 🔴 Critical | 3 | CSV error swallowed, proxy retry null body, stale categories |
| 🟡 High | 10 | Skeleton mismatches (3), missing loading.tsx (6 pages), validation gaps (6) |
| 🟠 Medium | 2 | POS search race condition, ImageUploader abort |
| 🟢 Low | 6 | Cosmetic skeleton issues, defaults, no store edit form, etc. |
