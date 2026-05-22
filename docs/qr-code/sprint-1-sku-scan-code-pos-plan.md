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
- `product_categories`: catalogo por tienda usado para organizar productos y generar SKUs con prefijo.
- `qr_code`: valor escaneable guardado hoy en backend.
- QR visual: representacion grafica del valor de `qr_code`, generado bajo demanda.

Para Sprint 1 mantenemos `products.qr_code` en backend por compatibilidad, pero en UI se debe llamar **Codigo escaneable**.
Tambien introducimos categorias configurables por tienda para dejar de depender de texto libre en `products.category` y generar SKUs consistentes como `COM000001`.

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
  - `category`
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
- `products.category` es texto libre; no hay tabla de categorias ni prefijo SKU por categoria.
- `products.sku` tiene indice por tienda, pero no hay una regla fuerte de generacion por categoria.
- El POS muestra `Buscar por nombre o QR`, pero no ejecuta lookup exacto por codigo al presionar Enter.
- La unicidad actual de `qr_code` parece global; para Sprint 1 se mantiene por compatibilidad. A futuro se puede evaluar unicidad por tienda.

### Web

Ya existe:

- Formulario de producto con `sku` y `qr_code`.
- Categoria como input de texto libre.
- Label actual:
  - `SKU / Codigo`
  - `QR / Codigo unico`
- POS con un solo input de busqueda.
- POS busca por nombre con debounce usando `/api/products/pos`.
- `PosProduct` ya incluye `qr_code`.

Limitaciones actuales:

- La UI mezcla SKU con codigo.
- La categoria se escribe manualmente, lo que permite duplicados por typo y no ayuda a generar SKUs.
- No hay boton `Generar SKU`.
- No hay boton `Generar codigo escaneable`.
- No hay accion `Usar SKU`.
- No hay preview QR ni descarga.
- El input POS no tiene flujo de Enter para codigo exacto.
- El input POS no garantiza foco despues de agregar producto o fallar una busqueda exacta.

## Decision Principal Sprint 1

Implementar primero soporte para lector USB/Bluetooth tipo teclado y QR generado bajo demanda.

Agregar categorias configurables por tienda con prefijo SKU y contador ascendente.

Decision de MVP:

```text
product_categories = configuracion simple por tienda
products.sku = SKU humano generado por backend desde categoria
products.qr_code = codigo escaneable flexible, por defecto puede usar el SKU
```

No mantener la categoria como solo texto libre para nuevos productos.

Razon:

- Un dropdown evita categorias duplicadas por errores de escritura.
- El prefijo de categoria produce SKUs utiles para operacion: `COM000001`, `ABAR000001`.
- El backend puede garantizar unicidad y evitar carreras de concurrencia.
- La UI sigue simple: elegir categoria y dejar que el sistema proponga o genere el SKU.

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

No agregar categorias jerarquicas ni reglas comerciales avanzadas.

Razon:

- Para MVP basta con `nombre`, `prefijo SKU`, `activo/inactivo` y `contador`.
- Impuestos, margenes, imagenes, familias/subfamilias y reglas por categoria quedan fuera.

## Alcance Sprint 1

### 1. Categorias de producto

Cambios requeridos:

- Crear tabla `product_categories`.
- Agregar CRUD simple owner-only en Ajustes.
- Cada categoria pertenece a una tienda.
- Campos:
  - `name`
  - `sku_prefix`
  - `next_sku_number`
  - `is_active`
- Validar `name` unico por tienda.
- Validar `sku_prefix` unico por tienda.
- Normalizar `sku_prefix` a uppercase y permitir solo letras/numeros.
- No permitir borrar categorias con productos asociados; usar `is_active=false`.

Modelo recomendado:

```text
product_categories
  id uuid primary key
  store_id uuid not null references stores(id)
  name varchar(80) not null
  sku_prefix varchar(8) not null
  next_sku_number integer not null default 1
  is_active boolean not null default true
  created_at timestamptz not null
  updated_at timestamptz not null

unique(store_id, name)
unique(store_id, sku_prefix)
index(store_id, is_active, name)
```

Cambios en `products`:

```text
category_id uuid null references product_categories(id)
```

Compatibilidad:

- Mantener `products.category` temporalmente para no romper listados, imports y exports existentes.
- Para productos nuevos con `category_id`, guardar tambien `products.category = category.name` como denormalizacion temporal.
- En un sprint posterior se puede migrar completamente a `category_id`.

### 2. Generacion de SKU

Reglas:

- El SKU debe ser unico por tienda.
- Agregar restriccion recomendada:

```text
unique(store_id, sku)
```

- Si el usuario crea producto con categoria y deja `sku` vacio, backend genera:

```text
{sku_prefix}{next_sku_number padded a 6 digitos}
```

Ejemplo:

```text
COM000001
COM000002
ABAR000001
```

- Backend incrementa `product_categories.next_sku_number` en la misma transaccion de creacion.
- Si el usuario escribe SKU manualmente, backend lo acepta si no esta duplicado en la tienda.
- Si el producto cambia de categoria despues, conservar el SKU existente. No regenerar automaticamente.
- El frontend puede tener boton `Generar SKU`, pero la autoridad final es backend.

Decision:

- Para MVP preferimos SKUs ascendentes por categoria (`COM000001`) sobre codigos random (`P-8F3A2B`) para el campo `sku`.
- `P-8F3A2B` puede seguir usandose como fallback para `qr_code` cuando no se quiere usar el SKU como codigo escaneable.

### 3. Formulario de producto

Cambios requeridos:

- Cambiar `Categoria` de input texto a dropdown de categorias activas.
- Cambiar label `SKU / Codigo` a `SKU`.
- Cambiar label `QR / Codigo unico` a `Codigo escaneable`.
- Agregar boton compacto `Generar` junto a SKU.
- Agregar botones junto a Codigo escaneable:
  - `Generar`
  - `Usar SKU`
  - `Ver QR`
- Trimear valores antes de enviar, manteniendo el comportamiento actual de schemas/actions.
- No forzar uppercase automaticamente en `sku` ni `qr_code`; solo el `sku_prefix` de categoria se normaliza a uppercase.

Reglas UX:

- Si hay categoria seleccionada, `Generar SKU` pide o previsualiza el siguiente SKU de categoria:

```text
COM000001
```

- Si no hay categoria seleccionada, `Generar SKU` queda deshabilitado o muestra: `Selecciona una categoria para generar SKU`.
- Al guardar producto con SKU vacio y categoria seleccionada, backend genera el SKU aunque el usuario no haya pulsado `Generar`.
- `Generar codigo escaneable` produce algo como:

```text
P-8F3A2B
```

- `Usar SKU` copia el SKU actual al campo de codigo escaneable.
- Si SKU esta vacio, `Usar SKU` debe estar deshabilitado o mostrar error corto.
- `Ver QR` queda deshabilitado si el codigo escaneable esta vacio.

### 4. Modal QR y descarga

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

### 5. POS lookup por codigo exacto

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

### 6. Ajustes: administracion de categorias

Agregar seccion en Ajustes owner-only:

- Listar categorias activas e inactivas.
- Crear categoria con:
  - Nombre.
  - Prefijo SKU.
- Editar nombre si no genera conflicto.
- Editar prefijo solo si la categoria no tiene productos asociados; si ya se uso, desactivar y crear una categoria nueva.
- Desactivar categoria.
- Mostrar `next_sku_number` como dato de lectura o texto de ayuda, no como campo editable en MVP.

No agregar:

- Categorias hijas.
- Impuestos por categoria.
- Margenes por categoria.
- Imagenes.
- Reglas de precio.

### 7. Copy y consistencia visual

Actualizar textos:

- Producto:
  - `Categoria`
  - `SKU`
  - `Codigo escaneable`
- Ajustes:
  - `Categorias de productos`
  - `Prefijo SKU`
  - `Siguiente SKU`
- POS:
  - `Buscar por nombre o escanear codigo`
- Mensajes:
  - `Ya existe una categoria con ese nombre.`
  - `Ya existe una categoria con ese prefijo SKU.`
  - `El SKU ya esta en uso por otro producto.`
  - `El codigo escaneable ya esta en uso por otro producto.`
  - `No se encontro producto para ese codigo.`

## Backend Scope

Se espera migracion de base de datos.

Nuevos archivos probables:

```text
apps/backend/src/domain/entities/product_category.py
apps/backend/src/domain/repositories/product_category_repository.py
apps/backend/src/application/dto/product_category_dto.py
apps/backend/src/application/use_cases/product_categories/create_product_category.py
apps/backend/src/application/use_cases/product_categories/list_product_categories.py
apps/backend/src/application/use_cases/product_categories/update_product_category.py
apps/backend/src/application/use_cases/product_categories/deactivate_product_category.py
apps/backend/src/infrastructure/database/models/product_category_model.py
apps/backend/src/infrastructure/database/repositories/product_category_repository.py
apps/backend/src/presentation/api/v1/product_categories.py
apps/backend/src/infrastructure/database/alembic/versions/<next>_create_product_categories.py
```

Modificar:

```text
apps/backend/src/domain/entities/product.py
apps/backend/src/domain/repositories/product_repository.py
apps/backend/src/application/dto/product_dto.py
apps/backend/src/application/use_cases/products/create_product.py
apps/backend/src/application/use_cases/products/update_product.py
apps/backend/src/application/use_cases/products/get_product_by_qr.py
apps/backend/src/infrastructure/database/models/product_model.py
apps/backend/src/infrastructure/database/repositories/product_repository.py
apps/backend/src/presentation/api/v1/products.py
apps/backend/src/presentation/api/v1/router.py
```

Revisar o ajustar:

```text
apps/backend/src/application/use_cases/inventory_imports/confirm_import.py
apps/backend/src/application/use_cases/exports/export_products_csv.py
apps/backend/src/application/dto/inventory_import_dto.py
```

Validaciones esperadas:

- Categoria pertenece al `store_id` autenticado.
- Solo owner crea/edita/desactiva categorias.
- `sku_prefix` unico por tienda.
- `category.name` unico por tienda.
- `sku` unico por tienda.
- Si `category_id` viene en create y `sku` esta vacio, backend genera `sku`.
- La generacion de SKU incrementa `next_sku_number` de forma transaccional.
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
- Toda lectura/escritura de categorias usa `user.store_id`.

## Web Scope

Archivos probables:

```text
apps/web/src/features/products/components/ProductForm.tsx
apps/web/src/features/products/components/QrPreviewDialog.tsx
apps/web/src/features/products/components/ProductCodeFields.tsx
apps/web/src/features/products/components/ProductCategorySelect.tsx
apps/web/src/features/products/schemas.ts
apps/web/src/features/product-categories/types.ts
apps/web/src/features/product-categories/schemas.ts
apps/web/src/features/product-categories/api.ts
apps/web/src/features/product-categories/actions.ts
apps/web/src/features/product-categories/components/ProductCategorySettings.tsx
apps/web/src/features/pos/components/PosProductSearch.tsx
apps/web/src/features/pos/components/PosWorkspace.tsx
apps/web/src/features/pos/actions.ts
apps/web/src/features/pos/types.ts
apps/web/src/features/settings/components/SettingsOverview.tsx
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
- Cargar categorias en Server Component y pasarlas como props serializables al formulario.
- Mantener componentes cliente pequenos:
  - `ProductCodeFields` para botones y estado local.
  - `QrPreviewDialog` para modal y descarga.
  - `ProductCategorySettings` para formularios de categorias en Ajustes.
- No convertir toda la pagina de producto en cliente si no es necesario; el formulario ya es cliente.

## Tests Requeridos

### Backend

Agregar o actualizar tests:

- Owner crea categoria con nombre y prefijo SKU.
- Cashier no puede crear/editar/desactivar categorias.
- No se permiten dos categorias con el mismo nombre en una tienda.
- No se permiten dos categorias con el mismo `sku_prefix` en una tienda.
- Otra tienda puede usar el mismo nombre o prefijo.
- Crear producto con `category_id` y sin `sku` genera `COM000001`.
- Crear segundo producto de la misma categoria genera `COM000002`.
- Crear producto con SKU manual duplicado en la misma tienda falla.
- Crear producto con categoria de otra tienda falla.
- Cambiar categoria de un producto no regenera SKU automaticamente.
- Crear producto sin `qr_code` genera codigo.
- Crear producto con `qr_code` permite lookup exacto.
- Lookup por codigo no filtra productos de otra tienda.
- Codigo duplicado devuelve error claro.
- Cashier puede consultar `/products/qr/{codigo}`.
- Cashier no puede crear/editar producto.

### Web

Agregar o actualizar tests:

- Ajustes renderiza seccion `Categorias de productos` para owner.
- Cashier no ve administracion de categorias.
- Formulario de categoria valida nombre y prefijo.
- Product form renderiza categoria como dropdown.
- Product form renderiza `SKU` y `Codigo escaneable`.
- `Generar SKU` requiere categoria seleccionada.
- `Generar SKU` llena el campo SKU con prefijo de categoria.
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

1. Entrar como owner a Ajustes.
2. Crear categoria `Comida` con prefijo `COM`.
3. Crear producto nuevo.
4. Seleccionar categoria `Comida`.
5. Dejar SKU vacio o pulsar `Generar SKU`.
6. Usar SKU como codigo escaneable.
7. Abrir QR preview.
8. Descargar SVG.
9. Guardar producto.
10. Confirmar que el SKU queda como `COM000001`.
11. Crear segundo producto de `Comida` y confirmar `COM000002`.
12. Abrir POS.
13. Escribir o escanear el codigo y presionar Enter.
14. Confirmar que producto entra al carrito.
15. Probar codigo inexistente.
16. Confirmar que busqueda por nombre sigue funcionando.

## Criterios de Aceptacion

Sprint 1 se considera completo cuando:

- Owner puede crear, editar y desactivar categorias simples.
- Categoria tiene nombre, prefijo SKU, estado activo y contador interno.
- El formulario de producto usa dropdown de categorias activas.
- Backend genera SKU ascendente por categoria cuando el SKU viene vacio.
- SKU es unico por tienda.
- Prefijo SKU es unico por tienda.
- El formulario separa visualmente SKU y Codigo escaneable.
- Owner puede generar o previsualizar SKU desde UI basado en categoria.
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
- No se agregan categorias jerarquicas ni reglas avanzadas por categoria.
- Tests backend y frontend cubren los flujos principales.

## Fuera de Alcance

- Categorias jerarquicas.
- Impuestos por categoria.
- Margenes por categoria.
- Imagenes por categoria.
- Reglas de precio por categoria.
- Edicion manual de `next_sku_number` desde UI.
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
- Documentar que `SKU` es interno y `Codigo escaneable` es lo que lee el POS.

### Riesgo: colisiones de SKU o prefijo

Mitigacion:

- `unique(store_id, sku)` en productos.
- `unique(store_id, sku_prefix)` en categorias.
- Generacion de SKU en backend dentro de la transaccion de creacion.
- Tests de duplicado y multi-store.

### Riesgo: contador de SKU en concurrencia

Mitigacion:

- No calcular el siguiente SKU solo desde frontend.
- Backend incrementa `next_sku_number` al crear el producto.
- Si una insercion colisiona por `unique(store_id, sku)`, responder error claro y no crear producto duplicado.

### Riesgo: migracion desde categoria texto libre

Mitigacion:

- Mantener `products.category` temporalmente.
- Nuevos productos usan `category_id`.
- Imports/exports pueden seguir exponiendo `category` mientras se migra.

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

1. Migracion y backend de `product_categories`.
2. Repositorio/use cases/endpoints owner-only de categorias.
3. Agregar `category_id` y unicidad `unique(store_id, sku)` en productos.
4. Generacion backend de SKU por categoria con `next_sku_number`.
5. Tests backend de categorias, SKU, duplicados y multi-store.
6. Ajustes UI para administrar categorias.
7. Product form: dropdown de categoria, labels y campos de codigo.
8. `Generar SKU` basado en categoria y `Usar SKU`.
9. Modal QR con SVG y descarga.
10. POS Enter lookup por `/products/qr/{codigo}`.
11. Re-enfoque del input POS.
12. Tests frontend de categorias, formulario y POS.
13. Validacion manual con categoria, SKU generado y lector tipo teclado.

Este orden evita tocar POS antes de tener una manera clara de crear/ver el codigo, pero no retrasa el valor principal: poder escanear o escribir un codigo y vender.

## Siguiente Sprint Recomendado

Sprint 2 deberia enfocarse en etiquetas imprimibles y completar la migracion operativa de categorias:

- pagina `/dashboard/products/labels`;
- seleccion de productos;
- cantidad de etiquetas;
- layout imprimible con CSS `@media print`;
- QR + nombre + codigo + precio opcional.
- filtro por categoria en productos si no queda incluido en Sprint 1.

Camara web deberia ir despues de validar el flujo con lector tipo teclado, porque implica permisos, compatibilidad de navegadores y dependencias mas pesadas.
