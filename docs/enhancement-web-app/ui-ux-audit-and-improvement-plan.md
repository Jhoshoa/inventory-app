# UI/UX Audit & Improvement Plan — Web App

> Date: 2026-07-14
> Scope: `apps/web` — Frontend UI/UX quality, accessibility, and architecture
> Complements: `findings.md` (bugs, validation gaps, race conditions)

---

## Executive Summary

### MUI Migration: Not Recommended

The idea of switching to Material UI was evaluated. **The migration is not recommended** for the following reasons:

| Factor | Impact |
|--------|--------|
| **Server Components** | MUI does not support Next.js 15 server components. All pages would need `"use client"`, losing the server-first architecture. |
| **Bundle size** | MUI core + theming adds ~80-120KB gzipped. Current stack is near-zero client JS for server pages. |
| **Tailwind conflict** | MUI uses Emotion (CSS-in-JS). Running both systems doubles complexity. Removing Tailwind means rewriting 100+ components. |
| **Server Actions** | `useActionState` + native `<form action={}>` works with HTML elements. MUI components break this pattern. |
| **Testing** | Co-located vitest + Playwright E2E tests reference current component APIs. Migration breaks most tests. |
| **Estimated cost** | 3-6 weeks with high regression risk. |

**Verdict:** The current stack (Next.js 15 + Tailwind + React 19 server actions) is technically superior for this use case. The problems are in the **application layer** (accessibility, notifications, code duplication), not the framework.

### What Needs to Change

The audit identified **34 issues** across 6 categories. The codebase has solid foundations (feature-based architecture, server-first data flow, consistent token system) but has gaps in accessibility, user feedback, and code hygiene.

| Category | Issues | Severity |
|----------|--------|----------|
| Dialog accessibility | 5 dialogs missing ARIA + focus trapping | Critical |
| Broken Tailwind classes | 4 files with invalid token references | High |
| Form accessibility | Missing `aria-invalid`, `aria-describedby`, `aria-label` | High |
| No toast notification system | Zero transient feedback for mutations | High |
| Code duplication | 6 instances of duplicated logic | Medium |
| Large components | 2 components exceeding 300 lines | Medium |

---

## 1. Critical — Dialog Accessibility

### 1.1 Form dialogs lack ARIA attributes and focus trapping

**Affected files (5 dialogs):**

| Dialog | File | Lines |
|--------|------|-------|
| ProductDeleteDialog | `src/features/products/components/ProductDeleteDialog.tsx` | 70-97 |
| ProductStockDialog | `src/features/products/components/ProductStockDialog.tsx` | 68-98 |
| VoidSaleDialog | `src/features/sales/components/VoidSaleDialog.tsx` | 52-78 |
| ConfirmDialog | `src/components/ui/ConfirmDialog.tsx` | 30-46 |
| ProductCsvImportDialog | `src/features/products/components/ProductCsvImportDialog.tsx` | 90-110 |

**What is missing:**

All 5 dialogs render as:
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-text-strong/30 p-4">
  <DialogSurface className="w-full max-w-md">
    {/* content */}
  </DialogSurface>
</div>
```

They are missing:
- `role="dialog"` on the container
- `aria-modal="true"` on the container
- `aria-labelledby` pointing to the dialog title `<h2>`
- Focus trapping (Tab cycles within dialog, Escape closes)
- Focus restoration on close (return focus to trigger button)

**Reference implementation:** `MobileNavDrawer.tsx` (lines 32-80, 111-114) already implements all of these correctly. The pattern should be extracted and applied to all dialogs.

**Impact:** Screen readers do not announce these as dialogs. Keyboard users can Tab out of the dialog into background content. Focus is not restored after closing.

### 1.2 DialogSurface provides no behavioral logic

**File:** `src/components/ui/Dialog.tsx` (13 lines)

`DialogSurface` is a purely visual wrapper (rounded, bordered, shadow). It provides zero accessibility behavior. Consider either:
- **Option A:** Enhance `DialogSurface` with `role`, `aria-modal`, `aria-labelledby` props and an `onKeyDown` handler for Escape
- **Option B:** Replace with `@radix-ui/react-dialog` (headless, ~6KB gzipped) which handles all ARIA, focus trapping, scroll locking, and portal rendering

### 1.3 Inconsistent backdrop opacity

| Dialog | Backdrop class | File:Line |
|--------|---------------|-----------|
| ConfirmDialog | `bg-text-strong/40` | `ConfirmDialog.tsx:31` |
| ProductDeleteDialog | `bg-text-strong/30` | `ProductDeleteDialog.tsx:71` |
| ProductStockDialog | `bg-text-strong/30` | `ProductStockDialog.tsx:69` |
| VoidSaleDialog | `bg-text-strong/30` | `VoidSaleDialog.tsx:53` |
| ProductCsvImportDialog | `bg-black/50` | `ProductCsvImportDialog.tsx:94` |
| MobileNavDrawer | `bg-text-strong/40` | `MobileNavDrawer.tsx:104` |

**Fix:** Standardize to `bg-text-strong/40` across all dialogs.

### 1.4 ConfirmDialog is incomplete

**File:** `src/components/ui/ConfirmDialog.tsx:42`

The confirm button renders as `<span className="sr-only">{confirmLabel}</span>` — an invisible, non-interactive element. There is no actual confirm button. The `children` render prop receives `close` but no `onConfirm` callback. The component cannot fulfill its stated purpose.

**Fix:** Add a proper confirm `<Button>` that calls an `onConfirm` callback, or refactor to accept `children` as the full dialog body (including confirm action).

---

## 2. High — Broken Tailwind Classes

Four files reference Tailwind tokens that do not exist in `tailwind.config.ts`:

| File | Line | Broken class | Should be |
|------|------|-------------|-----------|
| `features/auth/components/LoginForm.tsx` | 106 | `bg-card` | `bg-app-surface` |
| `features/auth/components/LoginForm.tsx` | 106 | `text-muted-foreground` | `text-text-muted` |
| `app/(auth)/register/page.tsx` | 154 | `text-muted-foreground` | `text-text-muted` |
| `features/reports/components/DateRangeFilter.tsx` | 137 | `text-danger-700` | `text-status-danger` |
| `features/sales/components/SalesDateFilter.tsx` | 121 | `text-danger-700` | `text-status-danger` |

**Impact:** These classes produce either no styling (no-op) or fall back to Tailwind defaults (incorrect colors). The login divider text and register hint text render with browser-default colors instead of the designed muted text color. Error messages in date filters render with default red instead of the theme's danger color.

---

## 3. High — Form Accessibility Gaps

### 3.1 Input component missing ARIA error state

**File:** `src/components/ui/Input.tsx:8-19`

The `Input` component accepts an `error` boolean prop and changes border color, but does not set:
- `aria-invalid="true"` when `error` is true
- `aria-describedby` linking to the error message element

**File:** `src/components/ui/FieldError.tsx:1-4`

`FieldError` renders a `<p>` with no `id` attribute, so even if `Input` had `aria-describedby`, there is nothing to link to.

**Fix:**
```tsx
// Input.tsx — add when error is true:
aria-invalid={error || undefined}
aria-describedby={error && id ? `${id}-error` : undefined}

// FieldError.tsx — add id prop:
id?: string
// render: <p id={id} className="...">{message}</p>
```

### 3.2 Password toggle button has no accessible label

**File:** `features/auth/components/LoginForm.tsx:87-94`

```tsx
<button type="button" onClick={...} className="..." tabIndex={-1}>
  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
</button>
```

Screen readers announce "button" with no description. Also: `tabIndex={-1}` makes the button unreachable by keyboard.

**Fix:** Add `aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}` and remove `tabIndex={-1}`.

### 3.3 Register page password toggle — same issue

**File:** `app/(auth)/register/page.tsx:145-152`

Identical pattern: icon-only button with no `aria-label` and `tabIndex={-1}`.

### 3.4 ImageUploader drag zone not keyboard accessible

**File:** `features/products/components/ImageUploader.tsx:384-409`

The drop zone is a `<div>` with `onDrop`, `onDragOver`, and `onClick` handlers but:
- No `role="button"`
- No `tabIndex={0}`
- No `onKeyDown` for Enter/Space
- No `aria-label`

Compare with `ProductCsvImportDialog.tsx:170-175` which correctly implements all of these on its drop zone.

### 3.5 Raw HTML input bypasses shared component

**File:** `features/store-day/components/StoreDayStatusPanel.tsx:330-335`

```tsx
<input
  type="text"
  name="void_reason"
  placeholder="Razon (opcional)"
  className="h-9 w-40 rounded-md border border-app-border bg-app-surface px-2 text-xs text-text-strong placeholder:text-text-muted"
/>
```

This raw `<input>` bypasses the shared `Input` component, resulting in inconsistent styling, no focus ring, and no `aria-label`. Should use `<Input aria-label="Razón de anulación" name="void_reason" ... />`.

---

## 4. High — No Toast Notification System

The app has **zero transient notification feedback**. All user feedback is via inline `<Alert>` components that persist until the user navigates away.

**Current behavior examples:**
- Create product → inline alert at top of form (stays visible)
- Adjust stock → inline alert inside dialog
- Delete product → navigates to list (no success confirmation)
- Open/close store → inline alert in panel
- Void sale → inline alert in dialog

**What is missing:**
- Success toasts after mutations (e.g., "Producto creado exitosamente")
- Auto-dismissing error notifications for transient issues
- Non-intrusive placement that doesn't push page content down

**Recommended solution:** Install [`sonner`](https://github.com/emilkowalski/sonner) (~3KB gzipped).
- Native support for React Server Components
- Minimal API: `toast.success("Producto creado")`, `toast.error("Error al eliminar")`
- Renders via portal, doesn't affect layout
- Auto-dismiss with configurable duration
- Stacks multiple notifications

**Integration points** (every `actions.ts` file and form submit handler):
- `features/products/actions.ts` — create, update, delete, stock adjust
- `features/sales/actions.ts` — void sale
- `features/store-day/actions.ts` — open, close, reopen, cash movements, void cash movement
- `features/product-categories/actions.ts` — create, deactivate
- `features/pos/actions.ts` — create sale
- `features/auth/components/LoginForm.tsx` — login success/error

---

## 5. Medium — Code Duplication

### 5.1 Duplicated pagination components

| Component | File | Mode |
|-----------|------|------|
| `Pagination` | `src/components/ui/Pagination.tsx` | Link-based (server navigation) |
| `ProductPagination` | `features/products/components/ProductBrowser.tsx:152-196` | Callback-based (client navigation) |

Both have identical layout (`flex justify-between`), identical text ("Mostrando X-Y de Z"), and identical logic (offset calculation, hasPrevious/hasNext). The only difference is `<Link>` vs `<Button onClick>`.

**Fix:** Extend the shared `Pagination` component with an optional `onNavigate?: (offset: number) => void` prop. When provided, use `<Button>` instead of `<Link>`.

### 5.2 Duplicated `readErrorMessage` function

| File | Lines |
|------|-------|
| `features/products/components/ProductBrowser.tsx` | 242-251 |
| `features/sales/components/SalesBrowser.tsx` | 161-170 |

Identical logic: parse JSON response, extract `message` or `detail` field, fallback to default string.

**Fix:** Extract to `src/lib/api/errors.ts` as `export async function readApiErrorMessage(response: Response, fallback: string): Promise<string>`.

### 5.3 Duplicated `formatDate` functions

| File | Lines | Locale | Format |
|------|-------|--------|--------|
| `features/sales/components/SaleDetail.tsx` | 86-90 | `es-BO` | date + time |
| `features/dashboard/components/DashboardOverview.tsx` | 304-308 | `es-BO` | date only |
| `features/settings/components/BillingSettings.tsx` | 128-137 | `es-ES` | date + time |
| `features/store-day/components/StoreDayStatusPanel.tsx` | 374-392 | `es-BO` | date + time (formatToParts) |

Inconsistent locales (`es-BO` vs `es-ES`) and duplicated `Intl.DateTimeFormat` setup.

**Fix:** Create `src/lib/format/datetime.ts` with shared formatters using a consistent locale (`es-BO`).

### 5.4 Duplicated subscription constants

| File | Lines | Keys |
|------|-------|------|
| `components/layout/AppHeader.tsx` | 7-19 | trial, active, past_due, expired |
| `features/settings/components/BillingSettings.tsx` | 5-19 | trial, active, past_due, expired, canceled |

Different labels for the same keys (e.g., `trial` → "Prueba" vs "Prueba gratuita"). `BillingSettings` includes `canceled` which `AppHeader` does not.

**Fix:** Create `src/lib/constants/subscription.ts` with unified maps.

### 5.5 Duplicated debounce constants

| File | Constant | Value |
|------|----------|-------|
| `features/products/components/ProductBrowser.tsx:20` | `PRODUCT_SEARCH_DEBOUNCE_MS` | 500 |
| `features/pos/components/PosProductSearch.tsx:12` | `POS_SEARCH_DEBOUNCE_MS` | 500 |

**Fix:** Create `src/lib/constants/ui.ts` with `SEARCH_DEBOUNCE_MS = 500`.

### 5.6 Duplicated `Field` wrapper pattern

`ProductForm.tsx:290-307` defines a local `Field` component that wraps `Label` + children + `FieldError`. The same pattern (label + input + error) is repeated in:
- `LoginForm.tsx:60-72, 74-96`
- `VoidSaleDialog.tsx`
- `ProductStockDialog.tsx`
- `StoreDayStatusPanel.tsx:156-168, 182-193`

**Fix:** Extract to `src/components/ui/Field.tsx`:
```tsx
function Field({ label, htmlFor, error, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
```

---

## 6. Medium — Large Components Need Decomposition

### 6.1 StoreDayStatusPanel (392 lines)

**File:** `features/store-day/components/StoreDayStatusPanel.tsx`

Contains 5 components and 3 helper functions in a single file:

| Component | Lines | Responsibility |
|-----------|-------|---------------|
| `StoreDayStatusPanel` | 26-104 | Main panel (status display + conditional action form) |
| `StoreDayActionForm` | 106-213 | Open/close/reopen form |
| `CashMovementPanel` | 216-276 | Cash movement form + list |
| `CashMovementList` | 278-291 | List of recent movements |
| `CashMovementRow` | 293-342 | Single movement row with void action |
| `cashMovementLabel` | 344-353 | Label helper |
| `sanitizeMoneyInput` | 355-359 | Input sanitization |
| `toMoneyInputValue` | 361-366 | Value transformation |
| `formatBusinessDate` | 368-372 | Date formatting |
| `formatDateTime` | 374-392 | DateTime formatting |

**Recommended split:**
```
store-day/components/
├── StoreDayStatusPanel.tsx          (status display only, ~80 lines)
├── StoreDayActionForm.tsx           (open/close/reopen form, ~110 lines)
├── CashMovementPanel.tsx            (form + list, ~65 lines)
├── CashMovementRow.tsx              (single row + void, ~55 lines)
└── store-day-helpers.ts             (labels, sanitizers, formatters)
```

### 6.2 ProductForm (308 lines)

**File:** `features/products/components/ProductForm.tsx`

Manageable but would benefit from extracting the `Field` wrapper (lines 290-307) to a shared component, and potentially splitting the image upload section into a sub-component.

---

## 7. Low — Cosmetic and Preventive Issues

### 7.1 Inconsistent spinner implementations

`ImageUploader.tsx:309-328` uses a raw inline SVG spinner while all other loading states use `Loader2` from lucide-react with `animate-spin`. Should standardize on `Loader2`.

### 7.2 Missing `aria-label` on password toggle in register page

**File:** `app/(auth)/register/page.tsx:145-152` — same issue as LoginForm (see section 3.3).

### 7.3 `ProductDeleteDialog` confirm input has no client-side validation

**File:** `features/products/components/ProductDeleteDialog.tsx:84`

The confirm `<Input>` has no `required`, `minLength`, or `pattern` attribute. Validation happens server-side only. Add `required` and `pattern="ELIMINAR"` for immediate client feedback.

### 7.4 `QuantityStepper` allows empty/non-positive values

**File:** `components/ui/QuantityStepper.tsx`

`sanitizeQuantityInput` strips non-digits but allows empty string. No `min` prop. The `onDecrement` callback has no guard against going below 1.

---

## 8. Improvement Plan

### Phase 1 — Dialog Accessibility & Broken Classes (1-2 days)

**Priority: Critical**

| Task | Files | Effort |
|------|-------|--------|
| Add `role="dialog"`, `aria-modal`, `aria-labelledby` to all 5 form dialogs | `ProductDeleteDialog`, `ProductStockDialog`, `VoidSaleDialog`, `ConfirmDialog`, `ProductCsvImportDialog` | 2h |
| Extract focus trapping + Escape handling from `MobileNavDrawer` into a `useFocusTrap` hook or enhance `DialogSurface` | `MobileNavDrawer.tsx` → new `src/hooks/useFocusTrap.ts` or `Dialog.tsx` | 3h |
| Fix `ConfirmDialog` — add actual confirm button with `onConfirm` callback | `ConfirmDialog.tsx` | 1h |
| Standardize backdrop opacity to `bg-text-strong/40` | All 5 dialog files | 30min |
| Fix 4 broken Tailwind classes | `LoginForm.tsx`, `register/page.tsx`, `DateRangeFilter.tsx`, `SalesDateFilter.tsx` | 30min |

### Phase 2 — Form Accessibility (0.5 days)

**Priority: High**

| Task | Files | Effort |
|------|-------|--------|
| Add `aria-invalid` + `aria-describedby` to `Input` | `Input.tsx`, `FieldError.tsx` | 1h |
| Add `aria-label` to password toggle buttons | `LoginForm.tsx`, `register/page.tsx` | 15min |
| Remove `tabIndex={-1}` from password toggle buttons | `LoginForm.tsx`, `register/page.tsx` | 5min |
| Add keyboard handlers to `ImageUploader` drop zone | `ImageUploader.tsx` | 30min |
| Replace raw `<input>` in `CashMovementRow` with shared `Input` | `StoreDayStatusPanel.tsx:330-335` | 15min |
| Add `required` + `pattern` to delete confirm input | `ProductDeleteDialog.tsx:84` | 5min |

### Phase 3 — Toast Notifications (1 day)

**Priority: High**

| Task | Files | Effort |
|------|-------|--------|
| Install `sonner` | `package.json` | 5min |
| Add `<Toaster />` to root layout | `app/layout.tsx` | 10min |
| Add `toast.success()` after successful mutations | `features/products/actions.ts`, `features/sales/actions.ts`, `features/store-day/actions.ts`, `features/product-categories/actions.ts`, `features/pos/actions.ts` | 3h |
| Add `toast.error()` for catch blocks in dialog forms | All dialog components with `onSubmit` handlers | 2h |

### Phase 4 — Code Deduplication (1 day)

**Priority: Medium**

| Task | Files | Effort |
|------|-------|--------|
| Unify pagination (add `onNavigate` prop to shared `Pagination`) | `Pagination.tsx`, `ProductBrowser.tsx`, `SalesBrowser.tsx` | 1.5h |
| Extract `readErrorMessage` to `src/lib/api/errors.ts` | `ProductBrowser.tsx`, `SalesBrowser.tsx`, new utility | 30min |
| Create `src/lib/format/datetime.ts` with shared formatters | `SaleDetail.tsx`, `DashboardOverview.tsx`, `BillingSettings.tsx`, `StoreDayStatusPanel.tsx` | 1h |
| Create `src/lib/constants/subscription.ts` | `AppHeader.tsx`, `BillingSettings.tsx` | 30min |
| Create `src/lib/constants/ui.ts` with shared debounce | `ProductBrowser.tsx`, `PosProductSearch.tsx` | 15min |
| Extract `Field` wrapper to `src/components/ui/Field.tsx` | `ProductForm.tsx`, `LoginForm.tsx`, other forms | 1h |

### Phase 5 — Component Decomposition (1 day)

**Priority: Medium**

| Task | Files | Effort |
|------|-------|--------|
| Split `StoreDayStatusPanel` into 4 files + helpers | `StoreDayStatusPanel.tsx` → 5 new files | 3h |
| Extract image upload section from `ProductForm` | `ProductForm.tsx` | 1h |

### Optional — Radix UI Primitives (2-3 days)

If a more thorough accessibility upgrade is desired, install Radix UI headless primitives selectively:

| Package | Replaces | Size |
|---------|----------|------|
| `@radix-ui/react-dialog` | All 5 manual dialogs + `DialogSurface` | ~6KB |
| `@radix-ui/react-select` | Custom `Select` component | ~8KB |
| `@radix-ui/react-toast` | (or use `sonner` instead) | ~5KB |
| `@radix-ui/react-popover` | `Tooltip` component | ~4KB |

Radix is **headless** (no styles) — it provides behavior and accessibility, you keep Tailwind for styling. This integrates naturally with the existing stack.

---

## Appendix A — Full Issue Index

| # | Category | Severity | File | Line(s) | Summary |
|---|----------|----------|------|---------|---------|
| 1 | Dialog A11y | Critical | `ProductDeleteDialog.tsx` | 70-97 | Missing role, aria-modal, focus trap |
| 2 | Dialog A11y | Critical | `ProductStockDialog.tsx` | 68-98 | Missing role, aria-modal, focus trap |
| 3 | Dialog A11y | Critical | `VoidSaleDialog.tsx` | 52-78 | Missing role, aria-modal, focus trap |
| 4 | Dialog A11y | Critical | `ConfirmDialog.tsx` | 30-46 | Missing role, aria-modal, focus trap, broken confirm |
| 5 | Dialog A11y | Critical | `ProductCsvImportDialog.tsx` | 90-110 | Missing role, aria-modal, focus trap |
| 6 | Dialog A11y | Medium | `Dialog.tsx` | 1-13 | DialogSurface is purely visual |
| 7 | Dialog A11y | Medium | Multiple | — | Inconsistent backdrop opacity (6 values) |
| 8 | Broken CSS | High | `LoginForm.tsx` | 106 | `bg-card` token does not exist |
| 9 | Broken CSS | High | `LoginForm.tsx` | 106 | `text-muted-foreground` token does not exist |
| 10 | Broken CSS | High | `register/page.tsx` | 154 | `text-muted-foreground` token does not exist |
| 11 | Broken CSS | High | `DateRangeFilter.tsx` | 137 | `text-danger-700` token does not exist |
| 12 | Broken CSS | High | `SalesDateFilter.tsx` | 121 | `text-danger-700` token does not exist |
| 13 | Form A11y | High | `Input.tsx` | 8-19 | Missing `aria-invalid`, `aria-describedby` |
| 14 | Form A11y | High | `FieldError.tsx` | 1-4 | Missing `id` for aria linking |
| 15 | Form A11y | High | `LoginForm.tsx` | 87-94 | Password toggle: no aria-label, tabIndex=-1 |
| 16 | Form A11y | High | `register/page.tsx` | 145-152 | Password toggle: no aria-label, tabIndex=-1 |
| 17 | Form A11y | High | `ImageUploader.tsx` | 384-409 | Drop zone: no role, tabIndex, onKeyDown |
| 18 | Form A11y | Medium | `StoreDayStatusPanel.tsx` | 330-335 | Raw `<input>` bypasses shared Input |
| 19 | UX | High | All mutations | — | No toast notification system |
| 20 | Duplication | Medium | `ProductBrowser.tsx` | 152-196 | Duplicated pagination component |
| 21 | Duplication | Medium | `ProductBrowser.tsx` | 242-251 | Duplicated `readErrorMessage` |
| 22 | Duplication | Medium | `SalesBrowser.tsx` | 161-170 | Duplicated `readErrorMessage` |
| 23 | Duplication | Medium | 4 files | — | Duplicated `formatDate` with inconsistent locales |
| 24 | Duplication | Medium | `AppHeader.tsx` + `BillingSettings.tsx` | 7-19 / 5-19 | Duplicated subscription constants |
| 25 | Duplication | Low | `ProductBrowser.tsx` + `PosProductSearch.tsx` | 20 / 12 | Duplicated debounce constant |
| 26 | Duplication | Medium | Multiple forms | — | Duplicated Field wrapper pattern |
| 27 | Structure | Medium | `StoreDayStatusPanel.tsx` | 1-392 | 392 lines, 5 components in one file |
| 28 | Structure | Low | `ProductForm.tsx` | 1-308 | 308 lines, extractable Field wrapper |
| 29 | Cosmetic | Low | `ImageUploader.tsx` | 309-328 | Inline SVG spinner vs lucide Loader2 |
| 30 | Cosmetic | Low | `ProductDeleteDialog.tsx` | 84 | Confirm input: no required/pattern |
| 31 | Cosmetic | Low | `QuantityStepper.tsx` | — | Allows empty/non-positive values |
| 32 | Cosmetic | Low | `StoreDayStatusPanel.tsx` | 374-392 | `formatDateTime` uses formatToParts, others don't |
| 33 | A11y | Medium | `LoginForm.tsx` | 87-94 | Focus not managed after password toggle |
| 34 | Consistency | Low | `ProductCsvImportDialog.tsx` | 94 | Different backdrop color (`bg-black/50`) |

---

## Appendix B — Recommended File Structure After Refactor

```
src/
├── components/
│   ├── ui/
│   │   ├── Alert.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── CollapsibleSection.tsx
│   │   ├── ConfirmDialog.tsx        (fixed: real confirm button)
│   │   ├── Dialog.tsx               (enhanced: role, aria, focus trap)
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── Field.tsx                (NEW: extracted from ProductForm)
│   │   ├── FieldError.tsx           (enhanced: id prop for aria)
│   │   ├── ForbiddenState.tsx
│   │   ├── Input.tsx                (enhanced: aria-invalid, aria-describedby)
│   │   ├── Label.tsx
│   │   ├── Pagination.tsx           (enhanced: onNavigate prop)
│   │   ├── QuantityStepper.tsx
│   │   ├── Select.tsx
│   │   ├── SummaryRow.tsx
│   │   ├── Table.tsx
│   │   ├── Textarea.tsx
│   │   └── Tooltip.tsx
│   └── layout/
│       └── (unchanged)
├── features/
│   └── store-day/
│       └── components/
│           ├── StoreDayStatusPanel.tsx    (slimmed: ~80 lines)
│           ├── StoreDayActionForm.tsx     (NEW: extracted)
│           ├── CashMovementPanel.tsx      (NEW: extracted)
│           ├── CashMovementRow.tsx        (NEW: extracted)
│           └── store-day-helpers.ts       (NEW: extracted)
├── hooks/
│   └── useFocusTrap.ts              (NEW: shared dialog focus management)
└── lib/
    ├── api/
    │   └── errors.ts                 (enhanced: add readApiErrorMessage)
    ├── constants/
    │   ├── subscription.ts           (NEW: unified subscription maps)
    │   └── ui.ts                     (NEW: SEARCH_DEBOUNCE_MS)
    └── format/
        ├── currency.ts               (existing)
        └── datetime.ts               (NEW: shared date formatters)
```
