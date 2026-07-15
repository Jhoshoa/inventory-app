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

### Frontend (falta implementar)
- `SettingsOverview.tsx` — tarjeta "Tienda" solo muestra `session.storeName` y storeId en read-only
- No hay tipos StoreResponseDTO/StoreUpdateDTO en frontend
- No hay API call para `GET /store` ni `PATCH /store`
- No hay schemas de validacion
- No hay server action
- No hay formulario de edicion

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
  ├── GET /store → StoreResponseDTO (nueva llamada API)
  └── SettingsOverview (server component)
       └── StoreEditorForm (client component)
            ├── Formulario con name, address, phone
            ├── updateStoreAction (server action)
            │    ├── Validar campos
            │    ├── getAuthToken()
            │    ├── PATCH /store { name, address, phone }
            │    └── revalidatePath("/dashboard/settings")
            └── toast.success/error (sonner)
```

### 3.2 Archivos a Crear / Modificar

| Archivo | Accion | Proposito |
|---------|--------|-----------|
| `apps/web/src/features/settings/api.ts` | **CREAR** | Funcion para fetch de store + tipos |
| `apps/web/src/features/settings/schemas.ts` | **CREAR** | Validacion de formulario |
| `apps/web/src/features/settings/types.ts` | **CREAR** | Tipos StoreDTO, StoreUpdateDTO |
| `apps/web/src/features/settings/actions.ts` | **CREAR** | Server action `updateStoreAction` |
| `apps/web/src/features/settings/components/StoreEditorForm.tsx` | **CREAR** | Componente de formulario |
| `apps/web/src/features/settings/components/StoreEditorForm.test.tsx` | **CREAR** | Tests del formulario |
| `apps/web/src/features/settings/components/SettingsOverview.tsx` | **MODIFICAR** | Integrar StoreEditorForm + pasar storeData |
| `apps/web/src/features/settings/components/SettingsOverview.test.tsx` | **MODIFICAR** | Actualizar tests con storeData prop |
| `apps/web/app/(app)/dashboard/settings/page.tsx` | **MODIFICAR** | Fetch `GET /store` y pasar a SettingsOverview |

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

export interface StoreUpdateInput {
  name?: string;
  address?: string | null;
  phone?: string | null;
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

export function formDataToStoreValues(formData: FormData, initial: StoreFormValues): StoreFormValues {
  return {
    name: (formData.get("name") as string)?.trim() || initial.name,
    address: (formData.get("address") as string)?.trim() || "",
    phone: (formData.get("phone") as string)?.trim() || "",
  };
}
```

### 4.4 Server Action (`actions.ts`)

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { formDataToStoreValues, validateStoreForm } from "./schemas";
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

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Tienda actualizada correctamente", fieldErrors: {} };
}
```

### 4.5 Componente StoreEditorForm

**Patron:** Client component con `useState` para form state + `useActionState` (React 19) para server action.

```tsx
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { FieldError } from "@/components/ui/FieldError";
import { updateStoreAction } from "../actions";
import { validateStoreForm } from "../schemas";
import type { StoreFormValues, StoreEditorState } from "../types";

// Props: initial values + session role para conditional rendering

export function StoreEditorForm({
  initial,
  isOwner,
}: {
  initial: StoreFormValues;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<StoreFormValues>(initial);

  // Solo owner puede editar
  if (!isOwner) {
    return <ReadOnlyStoreInfo values={initial} />;
  }

  const [state, formAction, isPending] = useActionState<StoreEditorState, FormData>(
    updateStoreAction,
    { ok: true, message: "", fieldErrors: {} },
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      router.refresh();
    } else if (!Object.keys(state.fieldErrors).length) {
      toast.error(state.message);
    }
  }, [state, router]);

  function handleChange(field: keyof StoreFormValues, value: string) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  const fieldErrors = state.ok ? {} :
    Object.keys(state.fieldErrors).length > 0 ? state.fieldErrors : {};

  return (
    <form action={formAction} className="space-y-4">
      {!state.ok && state.message && Object.keys(state.fieldErrors).length > 0 ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}

      <InputGroup label="Nombre de la tienda" name="name" required>
        <Input
          name="name"
          value={formValues.name}
          onChange={(e) => handleChange("name", e.target.value)}
          maxLength={100}
          required
        />
        {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
      </InputGroup>

      <InputGroup label="Direccion" name="address">
        <Input
          name="address"
          value={formValues.address}
          onChange={(e) => handleChange("address", e.target.value)}
          maxLength={255}
        />
        {fieldErrors.address ? <FieldError>{fieldErrors.address}</FieldError> : null}
      </InputGroup>

      <InputGroup label="Telefono" name="phone">
        <Input
          name="phone"
          value={formValues.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          maxLength={20}
          type="tel"
        />
        {fieldErrors.phone ? <FieldError>{fieldErrors.phone}</FieldError> : null}
      </InputGroup>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
```

**Estados del componente:**
- **Carga inicial** — no aplica (datos vienen como props server-side)
- **Renderizado** — formulario con valores iniciales precargados
- **Validacion** — errores por campo via `FieldError`
- **Envio** — boton deshabilitado con texto "Guardando..."
- **Exito** — `toast.success()` + `router.refresh()` + formulario se re-renderiza con datos actualizados
- **Error** — `toast.error()` si es error general; `FieldError` si es error de campo; `Alert` si hay errores de validacion
- **Empty state** — valores por defecto string vacio para address/phone cuando son null
- **Modo solo lectura** — si el rol no es owner, mostrar texto plano en vez de formulario

### 4.6 Integracion en SettingsOverview

```tsx
// page.tsx — nueva llamada
const [storeData] = await Promise.all([
  // ... existing fetches ...
  getStore().catch(() => null),  // fallback si falla
]);

<SettingsOverview
  session={session}
  storeData={storeData}  // nuevo prop
  storeDay={storeDay}
  ...
/>
```

```tsx
// SettingsOverview.tsx — tarjeta Tienda actualizada
<AdminSummaryCard title="Tienda" ...>
  {storeData ? (
    <StoreEditorForm
      initial={{
        name: storeData.name,
        address: storeData.address ?? "",
        phone: storeData.phone ?? "",
      }}
      isOwner={session.role === "owner"}
    />
  ) : (
    // fallback read-only con datos de session
    <InfoItem label="Nombre" value={session.storeName} />
  )}
</AdminSummaryCard>
```

## 5. Manejo de Errores

| Escenario | Que pasa | UX |
|-----------|----------|-----|
| Token expirado | apiRequest (client.ts:64-75) refresca automaticamente y reintenta | Transparente |
| Store no encontrada (404) | `UpdateStoreUseCase` lanza `NotFoundError` → backend retorna 404 | `toast.error("Tienda no encontrada")` |
| Usuario no owner (403) | `require_owner` (`dependencies.py:216-219`) retorna 403 | `toast.error("No tienes permisos para editar la tienda")` |
| Usuario de otra tienda | `store_id` viene del JWT, no del body — imposible modificar otra tienda | N/A — ni siquiera puede intentarlo |
| Tienda suspendida | `GetCurrentUserContextUseCase` (`get_current_user_context.py:42-43`) lanza error | `toast.error("Tu cuenta ha sido suspendida. Contacta a soporte.")` |
| Red caida | fetch timeout (20s) → ApiError con code `network_error` | `toast.error("Error de conexion")` |
| Validacion falla local | fieldErrors → FieldError + Alert | Rojo en campos + alerta general |
| Nombre vacio | `validateStoreForm` retorna error | FieldError "El nombre de la tienda es requerido" |
| Nombre > 100 chars | `validateStoreForm` retorna error | FieldError "El nombre no puede exceder 100 caracteres" |
| Telefono > 20 chars | `validateStoreForm` retorna error | FieldError "El telefono no puede exceder 20 caracteres" |

## 6. Pruebas

### StoreEditorForm.test.tsx
- Renderiza formulario con valores iniciales
- Muestra errores de validacion al enviar vacio
- Muestra errores de validacion al enviar datos invalidos
- Llama al server action en submit
- Owner ve formulario editor; cashier ve solo lectura
- `toast.success` se llama en exito
- `toast.error` se llama en error
- `router.refresh()` se llama en exito

### Actualizar SettingsOverview.test.tsx
- Pasar `storeData` prop en tests existentes
- Testear que storeData.name se muestra en vez de session.storeName

## 7. Checklist de Implementacion

- [ ] **Crear `types.ts`** — StoreResponse, StoreUpdateInput, StoreFormValues, StoreEditorState
- [ ] **Crear `api.ts`** — funcion `getStore()` que llama a GET /store
- [ ] **Crear `schemas.ts`** — `validateStoreForm()`, `formDataToStoreValues()`
- [ ] **Crear `actions.ts`** — `updateStoreAction()` server action con validacion + PATCH /store
- [ ] **Crear `components/StoreEditorForm.tsx`** — formulario con useActionState, validacion, toasts
- [ ] **Crear `components/StoreEditorForm.test.tsx`** — tests del formulario
- [ ] **Modificar `SettingsOverview.tsx`** — aceptar `storeData` prop, renderizar StoreEditorForm en tarjeta Tienda
- [ ] **Modificar `SettingsOverview.test.tsx`** — pasar `storeData` mock, verificar integracion
- [ ] **Modificar `page.tsx`** — fetch `getStore()` y pasar a SettingsOverview
- [ ] **Verificar** — `pnpm typecheck`, `pnpm vitest run`, `cd apps/backend && py -m pytest tests -q`

## 8. Consideraciones Adicionales

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
