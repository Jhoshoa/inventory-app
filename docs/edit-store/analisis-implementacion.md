# Analisis de Implementacion: Formulario de Editar Tienda

## 1. Estado Actual

### Backend (ya implementado)
- **`PATCH /api/v1/store`** — endpoint existente en `apps/backend/src/presentation/api/v1/store.py:29`
  - Requiere `require_owner` (solo rol `owner` puede editar)
  - Acepta `StoreUpdateDTO` con campos: `name`, `address`, `phone`
  - Retorna `StoreResponseDTO`
- **`StoreUpdateDTO`** — en `apps/backend/src/application/dto/store_dto.py:1-5`
  ```python
  class StoreUpdateDTO(BaseModel):
      name: str | None = Field(default=None, min_length=1, max_length=100)
      address: str | None = Field(default=None, max_length=255)
      phone: str | None = Field(default=None, max_length=20)
  ```
- **`UpdateStoreUseCase`** — en `apps/backend/src/application/use_cases/store/update_store.py`
  - Actualiza solo campos no-None del input
- **Modelo DB** — `stores` tabla con columnas `name`, `address`, `phone` ya existentes desde migracion 001
- **No se necesita migracion** — las columnas ya existen
- **`GET /api/v1/store`** — endpoint existente en `store.py:21`, requiere solo `get_current_user`

### Frontend (implementado)
- `types.ts` — `StoreResponse`, `StoreFormValues`, `StoreEditorState`
- `api.ts` — `getStore()` llama a `GET /store`
- `schemas.ts` — `validateStoreForm()` con reglas de negocio
- `actions.ts` — `updateStoreAction()` server action con validacion + PATCH /store + actualizacion de cookie de sesion
- `components/StoreEditorDialog.tsx` — modal dialog (patron `ProductStockDialog`) con formulario de edicion
- `components/StoreEditorDialog.test.tsx` — tests del dialog
- `components/SettingsOverview.tsx` — tarjeta "Tienda" con datos via `storeData` prop y boton editor en slot `action` (solo owner)
- `components/SettingsOverview.test.tsx` — tests actualizados con `storeData` mock
- `app/(app)/dashboard/settings/page.tsx` — fetch `getStore()` y pasa a `SettingsOverview`

## 2. Analisis de Seguridad Multitenant (Backend)

### 2.1 Cadena de dependencias de seguridad

```
PATCH /api/v1/store
  └── Depends(get_current_user)       # 1. Autenticacion JWT
       └── extrae store_id del JWT    #    store_id del token, NO del body
  └── Depends(require_owner)          # 2. Autorizacion: solo role="owner"
       └── Depends(require_active_user)
            └── Depends(get_current_user_context)
                 └── verifica usuario existe en DB local
                 └── verifica store existe y access_status="active"
                 └── verifica is_active=true
  └── UpdateStoreInput(store_id=user["store_id"])  # 3. store_id del JWT
```

### 2.2 Verificacion de que es multitenant

| Mecanismo | Como protege |
|-----------|-------------|
| **`store_id` del JWT** | El `store_id` se extrae directamente del JWT decodificado (`get_current_user` en `dependencies.py:103-104`). El `StoreUpdateDTO` **no tiene campo `store_id`** — es imposible sobreescribirlo desde el body de la request. |
| **`require_owner`** | Verifica que `user.role == "owner"` (`dependencies.py:216-219`). Un cashier de cualquier tienda recibe 403. |
| **`GetCurrentUserContextUseCase`** | Carga el usuario desde la DB local y verifica que `store_id` del usuario corresponde a una tienda existente y activa (`get_current_user_context.py:37-43`). |
| **`UpdateStoreUseCase`** | Recibe `store_id` como parametro (no del body), busca la store por ID, y hace upsert. Solo puede modificar la store cuyo UUID coincide con el del JWT. |
| **`StoreRepository.save`** | Hace upsert por `store.id`. Nunca hay una operacion que afecte a todas las stores. |

### 2.3 Prueba de concepto: que pasa si...

| Escenario | Resultado |
|-----------|-----------|
| Cashier de Tienda A llama a `PATCH /store` | ❌ 403 Forbidden (`require_owner` falla) |
| Owner de Tienda A modifica body en Postman para cambiar `store_id` | ❌ `StoreUpdateDTO` no tiene campo `store_id`. El `store_id` usado es el del JWT, no del body. |
| Owner de Tienda A roba el JWT de Tienda B y llama a `PATCH /store` | ⚠️ Teoricamente podria, pero el JWT es firmado por Supabase y no se puede falsificar. Aun asi, solo modificaria Tienda B, no Tienda A. |
| Owner de Tienda A llama con token expirado | 🔄 `apiRequest` refresca el token automaticamente y reintenta |
| Owner de Tienda A, tienda suspendida (`access_status != "active"`) | ❌ `GetCurrentUserContextUseCase` lanza `UnauthorizedError("Tu cuenta ha sido suspendida")` |

**Conclusion:** La seguridad multitenant es correcta. No hay forma de que un usuario modifique los datos de una tienda que no le pertenece, incluso manipulando la request manualmente con Postman. El `store_id` siempre viene del JWT autenticado, nunca del cuerpo de la request.

## 2. Datos a Editar

| Campo | Tipo | Requerido | Max | Validacion |
|-------|------|-----------|-----|------------|
| `name` | string | Si | 100 | `min_length=1`, `max_length=100`, no vacio |
| `address` | string | No | 255 | `max_length=255` |
| `phone` | string | No | 20 | `max_length=20`, formato telefonico opcional |

**Campos que NO se editan:**
- `email` — gestionado por auth, no debe cambiar desde settings de tienda
- `billing_email`, `billing_nit`, `billing_razon_social` — facturacion, fuera de alcance
- `timezone` — configuracion avanzada, no debe cambiar casualmente
- `is_active` — gestionado por sistema de suscripcion

## 3. Arquitectura de Implementacion

### 3.1 Flujo de Datos

```
SettingsPage (server)
  ├── requireSession() + canViewSettings()
  ├── GET /store → StoreResponseDTO
  └── SettingsOverview (server component)
       ├── Tarjeta Tienda con InfoItems + action slot
       └── StoreEditorDialog (client component)
            ├── Boton "Editar" → abre modal
            ├── Formulario con name, address, phone
            ├── onSubmit → updateStoreAction (server action)
            │    ├── Validar campos
            │    ├── getAuthToken()
            │    ├── PATCH /store { name, address, phone }
            │    ├── Actualizar cookie de sesion (store_name)
            │    └── revalidatePath("/dashboard/settings")
            ├── toast.success/error (sonner)
            └── router.refresh() → header refleja nuevo nombre
```

### 3.2 Archivos a Crear / Modificar

| Archivo | Accion | Proposito |
|---------|--------|-----------|
| `apps/web/src/features/settings/types.ts` | **CREAR** | Tipos StoreResponse, StoreFormValues, StoreEditorState |
| `apps/web/src/features/settings/api.ts` | **CREAR** | Funcion `getStore()` para GET /store |
| `apps/web/src/features/settings/schemas.ts` | **CREAR** | `validateStoreForm()` |
| `apps/web/src/features/settings/actions.ts` | **CREAR** | Server action `updateStoreAction` + actualiza cookie de sesion |
| `apps/web/src/features/settings/components/StoreEditorDialog.tsx` | **CREAR** | Dialog modal con formulario (patron ProductStockDialog) |
| `apps/web/src/features/settings/components/StoreEditorDialog.test.tsx` | **CREAR** | Tests del dialog |
| `apps/web/src/features/settings/components/SettingsOverview.tsx` | **MODIFICAR** | Aceptar `storeData` prop, StoreEditorDialog en slot `action` de tarjeta Tienda |
| `apps/web/src/features/settings/components/SettingsOverview.test.tsx` | **MODIFICAR** | Mock StoreEditorDialog, test con storeData + visibilidad por rol |
| `apps/web/app/(app)/dashboard/settings/page.tsx` | **MODIFICAR** | Fetch `getStore()` y pasar a SettingsOverview |

## 4. Diseno de Cada Componente

### 4.1 Tipos (`types.ts`)

```typescript
export interface StoreResponse {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface StoreFormValues {
  name: string;
  address: string;
  phone: string;
}

export type StoreEditorState = {
  ok: boolean;
  message: string;
  fieldErrors: Record<string, string>;
};
```

### 4.2 API (`api.ts`)

```typescript
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { StoreResponse } from "./types";

export async function getStore(): Promise<StoreResponse> {
  const token = await getAuthToken();
  const result = await apiRequest<StoreResponse>("/store", { token: token ?? undefined });
  if (!result.ok) throw result.error;
  return result.data;
}
```

### 4.3 Validacion (`schemas.ts`)

```typescript
import type { StoreFormValues } from "./types";

export function validateStoreForm(values: StoreFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors.name = "El nombre de la tienda es requerido";
  } else if (values.name.trim().length > 100) {
    errors.name = "El nombre no puede exceder 100 caracteres";
  }

  if (values.address && values.address.length > 255) {
    errors.address = "La direccion no puede exceder 255 caracteres";
  }

  if (values.phone && values.phone.length > 20) {
    errors.phone = "El telefono no puede exceder 20 caracteres";
  }

  return errors;
}
```

### 4.4 Server Action (`actions.ts`)

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken, SESSION_COOKIE, serializeSession } from "@/lib/auth/session";
import { validateStoreForm } from "./schemas";
import type { StoreEditorState, StoreFormValues, StoreResponse } from "./types";

export async function updateStoreAction(
  _previousState: StoreEditorState,
  formData: FormData,
): Promise<StoreEditorState> {
  const rawName = formData.get("name");
  const rawAddress = formData.get("address");
  const rawPhone = formData.get("phone");

  const values: StoreFormValues = {
    name: (typeof rawName === "string" ? rawName : "").trim(),
    address: typeof rawAddress === "string" ? rawAddress.trim() : "",
    phone: typeof rawPhone === "string" ? rawPhone.trim() : "",
  };

  const fieldErrors = validateStoreForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Corrige los errores del formulario", fieldErrors };
  }

  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida", fieldErrors: {} };

  const body: Record<string, string> = {};
  body.name = values.name;
  if (values.address) body.address = values.address;
  if (values.phone) body.phone = values.phone;

  const result = await apiRequest<StoreResponse>("/store", {
    method: "PATCH",
    token,
    body,
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  // Sincronizar cookie de sesion para que el header refleje el nuevo nombre
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawSession) {
    try {
      const user = JSON.parse(Buffer.from(rawSession, "base64url").toString("utf8"));
      user.store_name = values.name;
      cookieStore.set(SESSION_COOKIE, serializeSession(user), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      });
    } catch {
      // skip updating session if it can't be parsed
    }
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Tienda actualizada correctamente", fieldErrors: {} };
}
```

### 4.5 Componente StoreEditorDialog

**Patron:** Client component con `useState` para dialog state + form `onSubmit` con `FormEvent`. Sigue el mismo patron que `ProductStockDialog`, `VoidSaleDialog`.

```tsx
"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { StoreResponse } from "@/features/settings/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { updateStoreAction } from "../actions";
import type { StoreEditorState } from "../types";

const initialStoreEditorState: StoreEditorState = {
  ok: false,
  message: "",
  fieldErrors: {},
};

export function StoreEditorDialog({ storeData }: { storeData: StoreResponse }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<StoreEditorState>(initialStoreEditorState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialStoreEditorState);
    try {
      const nextState = await updateStoreAction(
        initialStoreEditorState,
        new FormData(event.currentTarget),
      );
      setState(nextState);
      if (nextState.ok) {
        toast.success(nextState.message);
        setOpen(false);
        router.refresh();
      } else if (!Object.keys(nextState.fieldErrors).length) {
        toast.error(nextState.message || "No se pudo actualizar la tienda");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la tienda.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Editar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle close>Editar datos de tienda</DialogTitle>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="store-name">Nombre de la tienda</Label>
                <Input
                  id="store-name"
                  name="name"
                  defaultValue={storeData.name}
                  maxLength={100}
                  required
                />
                <FieldError message={fieldErrors.name} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="store-address">Direccion</Label>
                <Input
                  id="store-address"
                  name="address"
                  defaultValue={storeData.address ?? ""}
                  maxLength={255}
                />
                <FieldError message={fieldErrors.address} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="store-phone">Telefono</Label>
                <Input
                  id="store-phone"
                  name="phone"
                  type="tel"
                  defaultValue={storeData.phone ?? ""}
                  maxLength={20}
                />
                <FieldError message={fieldErrors.phone} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
```

**Estados del componente:**
- **Cerrado** — solo se ve el boton "Editar" con icono de lapiz
- **Abierto** — modal con formulario y valores precargados via `defaultValue`
- **Validacion** — errores por campo via `FieldError` debajo de cada input
- **Envio** — boton deshabilitado con texto "Guardando..."
- **Exito** — `toast.success()` + cierre del modal + `router.refresh()` → pagina (incluyendo header) se re-renderiza con datos actualizados
- **Error de campo** — `FieldError` muestra el mensaje; toast no se muestra (el error es visual en el formulario)
- **Error general** — `toast.error()` con mensaje del server action
- **Error de red** — catch general, `toast.error()` con mensaje de error
- **`noValidate`** — desactiva validacion nativa del browser para que el form siempre dispare el `onSubmit`

### 4.6 Integracion en SettingsOverview

La tarjeta Tienda usa `AdminSummaryCard` con `items` condicionales y un slot `action` para el boton de editar:

```tsx
// page.tsx
const [storeData] = await Promise.all([
  getStore().catch(() => null),
  // ... existing fetches ...
]);

<SettingsOverview
  session={session}
  storeData={storeData ?? undefined}
  storeDay={storeDay}
  ...
/>
```

```tsx
// SettingsOverview.tsx — tarjeta Tienda
<AdminSummaryCard
  title="Tienda"
  description="Datos base del negocio activo."
  items={
    storeData
      ? [
          { label: "Nombre", value: storeData.name },
          { label: "ID tienda", value: shortId(session.storeId ?? "") },
          { label: "Direccion", value: storeData.address ?? "—" },
          { label: "Telefono", value: storeData.phone ?? "—" },
        ]
      : [
          { label: "Nombre", value: session.storeName },
          { label: "ID tienda", value: shortId(session.storeId ?? "") },
        ]
  }
  action={
    session.role === "owner" && storeData
      ? <StoreEditorDialog storeData={storeData} />
      : undefined
  }
/>
```

## 5. Manejo de Errores

| Escenario | Que pasa | UX |
|-----------|----------|-----|
| Token expirado | apiRequest (client.ts:64-75) refresca automaticamente y reintenta | Transparente |
| Store no encontrada (404) | `UpdateStoreUseCase` lanza `NotFoundError` → backend retorna 404 | `toast.error("Tienda no encontrada")` |
| Usuario no owner (403) | `require_owner` (`dependencies.py:216-219`) retorna 403 | `toast.error("No tienes permisos para editar la tienda")` |
| Usuario de otra tienda | `store_id` viene del JWT, no del body — imposible modificar otra tienda | N/A — ni siquiera puede intentarlo |
| Tienda suspendida | `GetCurrentUserContextUseCase` (`get_current_user_context.py:42-43`) lanza error | `toast.error("Tu cuenta ha sido suspendida. Contacta a soporte.")` |
| Red caida | fetch timeout (20s) → ApiError con code `network_error` | catch general → `toast.error("No se pudo actualizar la tienda.")` |
| Validacion falla local | fieldErrors → FieldError en cada campo | Rojo debajo del input correspondiente |
| Nombre vacio | `validateStoreForm` retorna error | FieldError "El nombre de la tienda es requerido" |
| Nombre > 100 chars | `validateStoreForm` retorna error | FieldError "El nombre no puede exceder 100 caracteres" |
| Telefono > 20 chars | `validateStoreForm` retorna error | FieldError "El telefono no puede exceder 20 caracteres" |

## 6. Pruebas

### StoreEditorDialog.test.tsx
- Abre el dialog y muestra errores de validacion al enviar con nombre vacio
- Refresca la ruta (`router.refresh()`) despues de un update exitoso

### SettingsOverview.test.tsx (actualizado)
- Pasa `storeData` prop en tests existentes
- Testea que `storeData.name` se muestra en vez de `session.storeName`
- Testea que el boton "Editar" aparece solo para owner, no para cashier

## 7. Checklist de Implementacion

- [x] **Crear `types.ts`** — StoreResponse, StoreFormValues, StoreEditorState
- [x] **Crear `api.ts`** — funcion `getStore()` que llama a GET /store
- [x] **Crear `schemas.ts`** — `validateStoreForm()`
- [x] **Crear `actions.ts`** — `updateStoreAction()` server action con validacion + PATCH /store + actualizacion de cookie de sesion
- [x] **Crear `components/StoreEditorDialog.tsx`** — dialog modal con formulario, sigue patron ProductStockDialog
- [x] **Crear `components/StoreEditorDialog.test.tsx`** — tests del dialog
- [x] **Modificar `SettingsOverview.tsx`** — aceptar `storeData` prop, renderizar StoreEditorDialog en slot `action` de tarjeta Tienda (solo owner)
- [x] **Modificar `SettingsOverview.test.tsx`** — mock StoreEditorDialog, testear storeData y visibilidad por rol
- [x] **Modificar `page.tsx`** — fetch `getStore()` y pasar a SettingsOverview
- [x] **Verificar** — `pnpm typecheck`, `pnpm vitest run`

## 8. Consideraciones Adicionales

### Sincronizacion de cookie de sesion con el header
El `AppHeader` lee `session.storeName` desde la cookie `inventory_session` (base64url de `AuthUser` JSON), no desde una llamada API en vivo. Al editar el nombre de la tienda, el server action (`actions.ts:47-63`) decodifica la cookie actual, actualiza `store_name`, la re-serializa y la setea de nuevo. Cuando el cliente ejecuta `router.refresh()`, el layout re-ejecuta `requireSession()`, lee la cookie actualizada, y el header refleja el nuevo nombre inmediatamente sin necesidad de reloguearse.

### Phone validation mejorada (opcional)
Actualmente el backend solo valida `max_length=20`. Se podria agregar una regex basica en `schemas.ts`:
```typescript
if (values.phone && !/^[\d\s\-\+\(\)]{7,20}$/.test(values.phone)) {
  errors.phone = "Formato de telefono invalido";
}
```
Pero esto es opcional — mejor mantenerlo simple por ahora.

### No necesita migracion
Todos los campos (`name`, `address`, `phone`) ya existen en la tabla `stores` desde la migracion inicial 001.

### Seguridad (multitenant)

Ver seccion 2 — Analisis de Seguridad Multitenant. Resumen:

- **`PATCH /store`** ya tiene `require_owner` en backend (solo owner, no cashier)
- **`store_id`** se extrae del JWT autenticado, **no del body de la request**. El `StoreUpdateDTO` ni siquiera tiene campo `store_id` — es imposible modificar los datos de otra tienda incluso manipulando la request manualmente con Postman.
- **`GetCurrentUserContextUseCase`** verifica que la tienda existe y esta activa antes de permitir cualquier operacion.
- Frontend condiciona la edicion a `session.role === "owner"`, y el server action envia el token JWT que el backend valida. Un cashier ve solo lectura aunque manipule el DOM.

### Toast pattern consistente
Se usa `sonner` siguiendo el patron establecido en `StoreDayStatusPanel`, `VoidSaleDialog`, `ProductStockDialog`, y `ProductCategorySettings`:
- Exito: `toast.success("Tienda actualizada correctamente")`
- Error: `toast.error(message)` con mensaje del server action o fallback
