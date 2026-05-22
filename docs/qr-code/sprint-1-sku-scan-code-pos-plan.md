# Sprint 1: SKU, Codigo Escaneable y POS con Lookup Exacto

Fecha: 2026-05-22

## Objetivo

Cerrar el primer ciclo operativo de codigos escaneables sin introducir camara ni dependencias pesadas de scanner:

```text
crear producto -> definir/generar codigo -> ver QR -> escanear/escribir codigo en POS -> agregar al carrito
```

Este sprint se basa en `docs/qr-code/propuesta-sku-codigo-escaneable.md` y `docs/qr-code/analisis-qr-pos-web-mobile.md`.

La meta principal es eliminar la confusion entre SKU, QR y codigo escaneable.

- `sku`: identificador interno legible por humanos.
- `qr_code`: valor escaneable guardado hoy en backend.
- QR visual: representacion grafica del valor de `qr_code`, generado bajo demanda.

Para Sprint 1 mantenemos `products.qr_code` en backend por compatibilidad, pero en UI se debe llamar **Codigo escaneable**.

## Skills Aplicados

- `fastapi-templates`: mantener el backend en Clean Architecture y usar los use cases/repositorios existentes en vez de crear rutas duplicadas.
- `next-best-practices`: mantener paginas como Server Components cuando corresponda, mutaciones via Server Actions y carga dinamica solo para QR preview.
- `vercel-react-best-practices`: evitar inflar el bundle del POS; cargar generacion QR bajo demanda y mantener componentes cliente pequenos.
- `supabase-postgres-best-practices`: aprovechar indices existentes por `store_id`, `sku` y `qr_code`; mantener busquedas scoped por tienda autenticada.

## Estado Actual Verificado

### Backend

Ya existe:

- Tabla `products` con:
  - `sku`
  - `qr_code`
- Migracion inicial con `products.qr_code` unico.
- Indices operativos:
  - `ix_products_store_sku`
  - `ix_products_store_qr_code`
- DTOs de producto aceptan `sku` y `qr_code`.
- `CreateProductUseCase` genera `qr_code` cuando no se envia uno.
- Validacion de duplicado para `qr_code`.
- Endpoint exacto:

```http
GET /api/v1/products/qr/{qr_code}
```

- Endpoint POS:

```http
GET /api/v1/products/pos?q=...
```

Limitaciones actuales:

- `products/pos?q=...` busca por nombre, no por codigo exacto.
- El POS muestra `Buscar por nombre o QR`, pero no ejecuta lookup exacto por codigo al presionar Enter.
- No hay endpoint nuevo requerido para Sprint 1, pero si hay que confirmar respuestas 404 y store scope en tests.
- La unicidad actual de `qr_code` parece global; para Sprint 1 se mantiene por compatibilidad. A futuro se puede evaluar unicidad por tienda.

### Web

Ya existe:

- Formulario de producto con `sku` y `qr_code`.
- Label actual:
  - `SKU / Codigo`
  - `QR / Codigo unico`
- POS con un solo input de busqueda.
- POS busca por nombre con debounce usando `/api/products/pos`.
- `PosProduct` ya incluye `qr_code`.

Limitaciones actuales:

- La UI mezcla SKU con codigo.
- No hay boton `Generar SKU`.
- No hay boton `Generar codigo escaneable`.
- No hay accion `Usar SKU`.
- No hay preview QR ni descarga.
- El input POS no tiene flujo de Enter para codigo exacto.
- El input POS no garantiza foco despues de agregar producto o fallar una busqueda exacta.

## Decision Principal Sprint 1

Implementar primero soporte para lector USB/Bluetooth tipo teclado y QR generado bajo demanda.

No implementar camara web en Sprint 1.

Razon:

- Muchos lectores funcionan como teclado y envian Enter.
- No requiere permisos de navegador.
- No agrega librerias pesadas al POS.
- Funciona en web desktop/tablet y prepara el flujo para mobile.
- Es el camino mas corto para validar la operacion real en tienda.

No renombrar `qr_code` en base de datos en Sprint 1.

Razon:

- Ya existe backend, DTOs, export y tests alrededor de `qr_code`.
- Cambiar el nombre fisico ahora agrega riesgo innecesario.
- La mejora conceptual se hace en UI: `qr_code` se muestra como `Codigo escaneable`.

## Alcance Sprint 1

### 1. Formulario de producto

Cambios requeridos:

- Cambiar label `SKU / Codigo` a `SKU`.
- Cambiar label `QR / Codigo unico` a `Codigo escaneable`.
- Agregar boton compacto `Generar` junto a SKU.
- Agregar botones junto a Codigo escaneable:
  - `Generar`
  - `Usar SKU`
  - `Ver QR`
- Trimear valores antes de enviar, manteniendo el comportamiento actual de schemas/actions.
- No forzar uppercase automaticamente.

Reglas UX:

- `Generar SKU` produce algo como:

```text
SKU-8F3A2B
```

- `Generar codigo escaneable` produce algo como:

```text
P-8F3A2B
```

- `Usar SKU` copia el SKU actual al campo de codigo escaneable.
- Si SKU esta vacio, `Usar SKU` debe estar deshabilitado o mostrar error corto.
- `Ver QR` queda deshabilitado si el codigo escaneable esta vacio.

### 2. Modal QR y descarga

Agregar componente:

```text
apps/web/src/features/products/components/QrPreviewDialog.tsx
```

Requisitos:

- Mostrar QR grande, negro sobre blanco.
- Mostrar producto y codigo legible.
- El QR debe codificar exactamente el valor actual del input `Codigo escaneable`.
- Descargar SVG.
- Descargar PNG si se puede hacer sin complejidad excesiva.
- No guardar imagen QR en base de datos.

Implementacion recomendada:

- Agregar dependencia web `qrcode`.
- Cargar `qrcode` con `import()` solo cuando se abre el modal o se descarga.
- Mantener fuera del bundle inicial del formulario cuando sea posible.

### 3. POS lookup por codigo exacto

Cambios en `PosProductSearch`:

- Cambiar placeholder a:

```text
Buscar por nombre o escanear codigo
```

- Agregar `autoFocus`.
- Mantener `ref` al input.
- Al presionar Enter:
  - obtener `query.trim()`.
  - si esta vacio, no hacer nada.
  - llamar endpoint exacto:

```http
GET /api/products/qr/{codigo}
```

  - si encuentra producto:
    - llamar `onAdd(product)`.
    - limpiar input.
    - limpiar resultados.
    - re-enfocar input.
  - si no encuentra:
    - mostrar error claro: `No se encontro producto para ese codigo.`
    - mantener la busqueda por nombre disponible.
    - re-enfocar input.

Notas:

- Escritura normal sigue usando debounce por nombre.
- Enter es la senal de lookup exacto.
- No implementar captura global de teclado en Sprint 1.

### 4. Copy y consistencia visual

Actualizar textos:

- Producto:
  - `SKU`
  - `Codigo escaneable`
- POS:
  - `Buscar por nombre o escanear codigo`
- Mensajes:
  - `El codigo escaneable ya esta en uso por otro producto.`
  - `No se encontro producto para ese codigo.`

## Backend Scope

No se espera migracion de base de datos.

Revisar o ajustar si los tests muestran brechas:

```text
apps/backend/src/application/use_cases/products/create_product.py
apps/backend/src/application/use_cases/products/update_product.py
apps/backend/src/application/use_cases/products/get_product_by_qr.py
apps/backend/src/infrastructure/database/repositories/product_repository.py
apps/backend/src/presentation/api/v1/products.py
```

Validaciones esperadas:

- `qr_code` opcional.
- Si no se envia, backend genera uno.
- Si se envia, se guarda tal cual despues del trim frontend.
- `qr_code` duplicado devuelve error claro.
- `GET /products/qr/{codigo}` filtra por `store_id` autenticado.
- Cashier puede usar POS y lookup por codigo.
- Owner puede crear/editar producto.
- Cashier no puede crear/editar producto.

Decision de seguridad:

- No aceptar `store_id` desde cliente.
- Toda lectura por codigo usa `user.store_id`.

## Web Scope

Archivos probables:

```text
apps/web/src/features/products/components/ProductForm.tsx
apps/web/src/features/products/components/QrPreviewDialog.tsx
apps/web/src/features/products/components/ProductCodeFields.tsx
apps/web/src/features/products/schemas.ts
apps/web/src/features/pos/components/PosProductSearch.tsx
apps/web/src/features/pos/components/PosWorkspace.tsx
apps/web/src/features/pos/actions.ts
apps/web/src/features/pos/types.ts
```

Dependencia probable:

```text
apps/web/package.json
qrcode
@types/qrcode
```

Notas de implementacion:

- Si `qrcode` no tiene tipos suficientes, encapsularlo en helper local.
- No importar `qrcode` en top-level del formulario.
- Mantener componentes cliente pequenos:
  - `ProductCodeFields` para botones y estado local.
  - `QrPreviewDialog` para modal y descarga.
- No convertir toda la pagina de producto en cliente si no es necesario; el formulario ya es cliente.

## Tests Requeridos

### Backend

Agregar o actualizar tests:

- Crear producto sin `qr_code` genera codigo.
- Crear producto con `qr_code` permite lookup exacto.
- Lookup por codigo no filtra productos de otra tienda.
- Codigo duplicado devuelve error claro.
- Cashier puede consultar `/products/qr/{codigo}`.
- Cashier no puede crear/editar producto.

### Web

Agregar o actualizar tests:

- Product form renderiza `SKU` y `Codigo escaneable`.
- `Generar SKU` llena el campo SKU.
- `Generar codigo escaneable` llena el campo de codigo.
- `Usar SKU` copia SKU a codigo.
- `Ver QR` esta deshabilitado si no hay codigo.
- Modal QR muestra producto y codigo correcto.
- Descargar SVG invoca generacion.
- POS input tiene placeholder correcto y `autoFocus`.
- Enter con codigo encontrado agrega producto al carrito.
- Enter con codigo inexistente muestra error.
- Busqueda por nombre con debounce sigue funcionando.
- Despues de agregar por codigo, el input queda limpio y enfocado.

### E2E / Manual

Validacion manual recomendada:

1. Crear producto nuevo.
2. Generar SKU.
3. Usar SKU como codigo escaneable.
4. Abrir QR preview.
5. Descargar SVG.
6. Guardar producto.
7. Abrir POS.
8. Escribir o escanear el codigo y presionar Enter.
9. Confirmar que producto entra al carrito.
10. Probar codigo inexistente.
11. Confirmar que busqueda por nombre sigue funcionando.

## Criterios de Aceptacion

Sprint 1 se considera completo cuando:

- El formulario separa visualmente SKU y Codigo escaneable.
- Owner puede generar SKU desde UI.
- Owner puede generar Codigo escaneable desde UI.
- Owner puede copiar SKU a Codigo escaneable.
- Owner puede ver QR del codigo actual antes de guardar.
- Owner puede descargar al menos SVG del QR.
- El backend sigue siendo la fuente de verdad para unicidad de `qr_code`.
- POS permite buscar por nombre como antes.
- POS permite agregar producto por codigo exacto al presionar Enter.
- POS mantiene foco en el input despues de agregar producto por codigo.
- Lookup por codigo esta scoped por tienda.
- No se agrega scanner de camara ni captura global.
- Tests backend y frontend cubren los flujos principales.

## Fuera de Alcance

- Camara web con `getUserMedia`.
- `BarcodeDetector`.
- `html5-qrcode`, `qr-scanner` o `@zxing/browser`.
- Captura global de teclado.
- Code128/EAN/UPC generados internamente.
- Renombrar columna `qr_code` a `scan_code`.
- `scan_code_type`.
- Pagina masiva de etiquetas.
- PDF de etiquetas.
- Impresion por lotes.
- App mobile con `expo-camera`.

## Riesgos y Mitigaciones

### Riesgo: bundle web mas pesado

Mitigacion:

- Cargar `qrcode` bajo demanda con `import()`.
- No importar librerias de scanner en Sprint 1.

### Riesgo: confusion SKU vs codigo escaneable

Mitigacion:

- Labels separados.
- Boton explicito `Usar SKU`.
- Modal muestra `Codigo: ...`.

### Riesgo: lectores tipo teclado escriben en otro campo

Mitigacion:

- `autoFocus` en POS.
- Re-enfocar despues de agregar o fallar lookup.
- No usar captura global todavia.

### Riesgo: codigos duplicados

Mitigacion:

- Backend mantiene validacion.
- UI muestra error claro.
- Tests de duplicado.

### Riesgo: QR ilegible

Mitigacion:

- Alto contraste.
- Tamano visible suficiente.
- Descargar SVG para impresion.
- Mostrar codigo legible debajo del QR.

## Recomendacion de Implementacion

Orden recomendado:

1. Tests backend de lookup/duplicado/store scope si faltan.
2. Ajustes copy backend si el mensaje de duplicado no es claro.
3. Product form: labels y campos de codigo.
4. Generadores frontend `SKU-*` y `P-*`.
5. `Usar SKU`.
6. Modal QR con SVG y descarga.
7. POS Enter lookup por `/products/qr/{codigo}`.
8. Re-enfoque del input POS.
9. Tests frontend de formulario y POS.
10. Validacion manual con codigo copiado o lector tipo teclado.

Este orden evita tocar POS antes de tener una manera clara de crear/ver el codigo, pero no retrasa el valor principal: poder escanear o escribir un codigo y vender.

## Siguiente Sprint Recomendado

Sprint 2 deberia enfocarse en etiquetas imprimibles:

- pagina `/dashboard/products/labels`;
- seleccion de productos;
- cantidad de etiquetas;
- layout imprimible con CSS `@media print`;
- QR + nombre + codigo + precio opcional.

Camara web deberia ir despues de validar el flujo con lector tipo teclado, porque implica permisos, compatibilidad de navegadores y dependencias mas pesadas.
