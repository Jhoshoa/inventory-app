# Sprint 2: Etiquetas Imprimibles y Operacion de Categorias

Fecha: 2026-05-22

## Objetivo

Completar el flujo operativo posterior al Sprint 1:

```text
crear producto -> generar SKU/codigo -> seleccionar productos -> imprimir etiquetas -> escanear en POS
```

Sprint 1 dejo listo el ciclo basico de SKU, codigo escaneable, QR preview, descarga SVG y lookup exacto en POS. Sprint 2 debe convertir eso en una herramienta practica para tienda: imprimir etiquetas en lote y mejorar la operacion diaria alrededor de categorias.

La prioridad no es camara web todavia. Antes de agregar scanner con permisos de navegador y librerias pesadas, conviene cerrar bien la experiencia de impresion y seleccion de productos, porque eso permite probar el MVP con lector USB/Bluetooth o ingreso manual.

## Skills Aplicados

- `next-best-practices`: mantener rutas de dashboard como Server Components cuando sea posible, aislar interactividad en componentes cliente pequenos y evitar dependencias pesadas en el bundle inicial.
- `vercel-react-best-practices`: construir una pantalla de etiquetas responsiva, con estado local minimo, sin re-render innecesario de tablas grandes.
- `supabase-postgres-best-practices`: reutilizar busquedas e indices existentes por `store_id`, `category_id`, `sku` y `qr_code`; evitar migraciones si el valor puede resolverse desde el modelo actual.
- `fastapi-templates`: mantener backend en use cases/repositorios existentes y no crear rutas duplicadas si las listas actuales ya cubren la necesidad.

## Estado Actual Verificado

### Backend

Ya existe:

- `products.sku`
- `products.qr_code`
- `products.category`
- `products.category_id`
- `product_categories`
- generacion backend de SKU por categoria
- endpoint POS de lookup exacto:

```http
GET /api/v1/products/qr/{codigo}
```

- listado de productos:

```http
GET /api/v1/products
```

- export CSV de productos:

```text
apps/backend/src/application/use_cases/exports/export_products_csv.py
```

Pendiente relevante:

- El filtro backend de productos todavia filtra por `category` texto, no por `category_id`.
- Export CSV todavia expone `category`, `sku`, `qr_code`, pero no `category_id` ni `category_sku_prefix`.
- No existe endpoint especifico de etiquetas. Para MVP probablemente no hace falta si el frontend puede usar el listado actual.

### Web

Ya existe:

- `ProductForm` con dropdown de categoria.
- `Codigo escaneable`.
- `QrPreviewDialog`.
- descarga SVG individual.
- `PosProductSearch` con `autoFocus`, Enter lookup y re-enfoque.
- `ProductBrowser` con busqueda, filtros de stock, orden y paginacion.
- `ProductFilters` sin filtro por categoria.

Pendiente relevante:

- No existe pantalla para imprimir etiquetas en lote.
- No existe seleccion multiple de productos para etiquetas.
- No existe layout `@media print`.
- No existe filtro visual por categoria en inventario.
- No hay componente reutilizable para renderizar una etiqueta QR imprimible.

## Decision Principal Sprint 2

Implementar primero etiquetas imprimibles desde la web, usando los datos actuales de producto.

Ruta recomendada:

```text
/dashboard/products/labels
```

La pantalla debe permitir:

- buscar productos;
- filtrar por categoria y stock;
- seleccionar productos;
- definir cantidad de etiquetas por producto;
- previsualizar una hoja imprimible;
- imprimir usando `window.print()`;
- generar cada QR bajo demanda en cliente.

No guardar imagenes QR en BD.

No crear PDF server-side en Sprint 2.

No agregar camara web todavia.

## Alcance Sprint 2

### 1. Pantalla de etiquetas

Crear una pantalla nueva:

```text
apps/web/app/(app)/dashboard/products/labels/page.tsx
```

Comportamiento:

- Solo usuarios con permisos de administrar productos deberian acceder.
- Cashier no deberia ver acciones administrativas de impresion masiva si el modelo de permisos actual lo restringe para productos.
- Cargar productos iniciales desde server si encaja con el patron actual.
- Delegar seleccion, cantidades y preview a un componente cliente.

Componentes probables:

```text
apps/web/src/features/products/components/ProductLabelPage.tsx
apps/web/src/features/products/components/ProductLabelSelector.tsx
apps/web/src/features/products/components/ProductLabelPreview.tsx
apps/web/src/features/products/components/ProductLabelCard.tsx
apps/web/src/features/products/components/ProductLabelToolbar.tsx
```

### 2. Seleccion de productos

Requisitos:

- Buscar por nombre, SKU o codigo escaneable si el backend ya lo permite.
- Mostrar al menos:
  - nombre;
  - SKU;
  - codigo escaneable;
  - categoria;
  - precio;
  - stock.
- Permitir seleccionar/desseleccionar productos.
- Permitir cantidad de etiquetas por producto.
- Default recomendado: `1`.
- Limite recomendado para MVP: maximo `100` etiquetas por impresion para evitar bloquear el navegador.

UX esperada:

```text
[Buscar producto...] [Categoria] [Stock]

[ ] COM000001 Cafe molido       Codigo: COM000001       Cantidad [ 1 ]
[ ] COM000002 Azucar 1kg        Codigo: COM000002       Cantidad [ 1 ]

[Vista previa] [Imprimir]
```

Reglas:

- Si un producto no tiene `qr_code`, no debe poder imprimirse como QR.
- Mostrar estado claro: `Sin codigo escaneable`.
- Si el usuario quiere imprimirlo, debe editar el producto primero.

### 3. Filtro por categoria en productos

Completar la operacion de categorias agregando filtro visual por categoria en inventario y en la pantalla de etiquetas.

Opcion MVP recomendada:

- Frontend carga categorias activas.
- `ProductFilters` recibe categorias.
- El filtro envia `category` con el nombre actual mientras backend mantenga ese contrato.

Opcion mas correcta si se decide tocar backend:

- Agregar `category_id` como query param opcional en `GET /products`.
- Mantener `category` texto por compatibilidad.
- Repositorio filtra por `ProductModel.category_id == category_id`.

Recomendacion:

- Para Sprint 2, si se toca backend, hacerlo bien con `category_id`.
- Si se quiere minimizar riesgo, usar `category` texto en frontend y dejar `category_id` para Sprint 3.

Decision sugerida:

```text
Implementar category_id en backend para filtros nuevos.
Mantener category texto para compatibilidad.
```

Razon:

- Ya existe `category_id`.
- Evita depender de nombres de categoria que pueden cambiar.
- Reduce bugs si dos categorias historicas tienen nombres parecidos.

### 4. Etiqueta imprimible

Contenido minimo de cada etiqueta:

```text
[ QR ]
Nombre corto del producto
Codigo: COM000001
SKU: COM000001
Precio: 12.50
```

Reglas:

- QR negro sobre blanco.
- Codigo legible debajo o al lado.
- Nombre con maximo 2 lineas.
- Precio opcional con toggle.
- SKU opcional si es igual al codigo escaneable para evitar repeticion visual.

Tamanos MVP:

- `50mm x 30mm`
- `60mm x 40mm`
- `A4 grid automatico`

Para reducir complejidad, empezar con:

```text
Etiqueta 50mm x 30mm en hoja A4
```

Luego agregar selector de tamano si el CSS queda limpio.

### 5. Impresion

Usar CSS print, no PDF server-side.

Archivos probables:

```text
apps/web/app/globals.css
apps/web/src/features/products/components/ProductLabelPreview.tsx
```

Requisitos:

- Boton `Imprimir` llama `window.print()`.
- En pantalla normal se ve toolbar, filtros y preview.
- En modo print se oculta todo excepto la hoja de etiquetas.
- Usar unidades fisicas (`mm`) para etiquetas.
- Evitar cards flotantes dentro de cards; la preview puede ser una hoja visual, pero el modo print debe ser limpio.

CSS esperado:

```css
@media print {
  .print-hidden {
    display: none !important;
  }

  .print-label-sheet {
    display: grid;
  }
}
```

### 6. Generacion QR para etiquetas

Reutilizar la estrategia de Sprint 1:

- dependencia `qrcode` ya existe;
- generar QR en cliente;
- cargar bajo demanda;
- no guardar imagen en DB.

Recomendacion tecnica:

- Extraer helper local para generar SVG QR y evitar duplicar logica entre modal individual y etiquetas.

Archivo probable:

```text
apps/web/src/features/products/qr.ts
```

API sugerida:

```ts
export async function generateQrSvg(value: string, size?: number): Promise<string>
export function svgToDataUri(svg: string): string
```

Actualizar:

```text
QrPreviewDialog.tsx
ProductLabelCard.tsx
```

### 7. Navegacion

Agregar acceso desde inventario:

- Boton `Imprimir etiquetas` en `/dashboard/products`.
- Puede ir junto a `Nuevo producto` o como accion secundaria.

No convertir inventario en landing page. Debe seguir siendo herramienta operativa.

### 8. Backend opcional recomendado

Si se implementa filtro por `category_id`, tocar:

```text
apps/backend/src/application/dto/product_dto.py
apps/backend/src/application/use_cases/products/search_products.py
apps/backend/src/domain/repositories/product_repository.py
apps/backend/src/infrastructure/database/repositories/product_repository.py
apps/backend/src/presentation/api/v1/products.py
```

Contrato:

```http
GET /api/v1/products?category_id=<uuid>
```

Validaciones:

- `category_id` debe aplicarse siempre con `store_id` autenticado.
- No aceptar `store_id` desde cliente.
- Si categoria no existe en la tienda, puede devolver lista vacia; no es necesario revelar existencia.

Indice:

```text
products(store_id, category_id)
```

Revisar si la migracion `014_create_product_categories.py` ya agrego indice suficiente. Si no existe, agregar migracion pequena.

## Fuera de Alcance

- Scanner con camara web.
- `BarcodeDetector`.
- `html5-qrcode`, `qr-scanner` o `@zxing/browser`.
- Captura global de teclado.
- PDF server-side.
- Plantillas complejas de etiquetas.
- Editor visual de etiquetas.
- Codigos de barra Code128/EAN/UPC generados.
- Renombrar `qr_code` a `scan_code`.
- Guardar imagenes QR en base de datos.
- Impresion directa a impresoras termicas via WebUSB/WebSerial.
- App mobile con `expo-camera`.

## Backend Scope

Requerido solo si se agrega filtro por `category_id`.

Cambios probables:

```text
apps/backend/src/application/dto/product_dto.py
apps/backend/src/application/use_cases/products/search_products.py
apps/backend/src/domain/repositories/product_repository.py
apps/backend/src/infrastructure/database/repositories/product_repository.py
apps/backend/src/presentation/api/v1/products.py
apps/backend/tests/integration/test_products_operations.py
```

Migracion probable si falta indice:

```text
apps/backend/src/infrastructure/database/alembic/versions/<next>_add_products_store_category_id_index.py
```

No crear endpoint nuevo de etiquetas salvo que el listado actual no alcance.

## Web Scope

Nuevos archivos probables:

```text
apps/web/app/(app)/dashboard/products/labels/page.tsx
apps/web/src/features/products/components/ProductLabelPage.tsx
apps/web/src/features/products/components/ProductLabelSelector.tsx
apps/web/src/features/products/components/ProductLabelPreview.tsx
apps/web/src/features/products/components/ProductLabelCard.tsx
apps/web/src/features/products/components/ProductLabelToolbar.tsx
apps/web/src/features/products/qr.ts
```

Modificar:

```text
apps/web/app/(app)/dashboard/products/page.tsx
apps/web/src/features/products/components/ProductBrowser.tsx
apps/web/src/features/products/components/ProductFilters.tsx
apps/web/src/features/products/api.ts
apps/web/src/features/products/schemas.ts
apps/web/src/features/products/types.ts
apps/web/src/features/products/components/QrPreviewDialog.tsx
apps/web/app/globals.css
```

Posible reutilizacion:

```text
apps/web/src/features/product-categories/api.ts
apps/web/src/features/product-categories/types.ts
```

## Tests Requeridos

### Backend

Si se agrega `category_id` filter:

- `GET /products?category_id=<id>` devuelve productos de esa categoria.
- No devuelve productos de otra tienda.
- Categoria inexistente o de otra tienda no filtra datos ajenos.
- `category` texto sigue funcionando si se mantiene compatibilidad.
- Combinacion de `q`, `stock`, `category_id`, `sort` y paginacion no rompe.

### Web

Agregar o actualizar:

- `ProductFilters` renderiza dropdown de categorias cuando recibe categorias.
- Cambiar categoria dispara `onFilterChange`.
- Pantalla de etiquetas renderiza productos seleccionables.
- Producto sin `qr_code` muestra `Sin codigo escaneable` y no permite imprimir.
- Cantidad de etiquetas replica la etiqueta en preview.
- Boton imprimir esta deshabilitado si no hay etiquetas validas.
- `ProductLabelCard` muestra QR, nombre, codigo y precio.
- Helper `generateQrSvg` genera SVG desde codigo exacto.
- `QrPreviewDialog` usa helper compartido y mantiene comportamiento anterior.

### E2E / Manual

Flujo manual recomendado:

1. Crear categoria `Comida` con prefijo `COM`.
2. Crear 2 productos con codigo escaneable.
3. Entrar a inventario.
4. Filtrar por categoria `Comida`.
5. Abrir `Imprimir etiquetas`.
6. Seleccionar ambos productos.
7. Cambiar cantidad de uno a `3`.
8. Ver preview con 4 etiquetas totales.
9. Imprimir o guardar como PDF desde el navegador.
10. Escanear una etiqueta con lector tipo teclado en POS.
11. Confirmar que entra al carrito.

## Criterios de Aceptacion

Sprint 2 se considera completo cuando:

- Owner puede abrir pantalla de etiquetas desde inventario.
- Owner puede buscar y seleccionar productos para imprimir.
- Owner puede definir cantidad de etiquetas por producto.
- Productos sin codigo escaneable no generan QR imprimible.
- Preview muestra etiquetas con QR, nombre y codigo legible.
- El QR codifica exactamente `products.qr_code`.
- `window.print()` imprime solo la hoja de etiquetas.
- El layout usa medidas fisicas y no depende de screenshots.
- El inventario permite filtrar por categoria.
- Si se implementa `category_id`, el backend filtra por `store_id` autenticado.
- No se agregan librerias de scanner ni camara.
- Tests frontend cubren seleccion, preview y estado de impresion.
- Tests backend cubren filtro por categoria si se toca backend.

## Riesgos y Mitigaciones

### Riesgo: etiquetas mal alineadas al imprimir

Mitigacion:

- Usar `mm`, no `px`, para tamano de etiqueta.
- Mantener un primer formato fijo.
- Validar con print preview del navegador.
- Ocultar UI no imprimible con clases `print-hidden`.

### Riesgo: demasiados QR bloquean el navegador

Mitigacion:

- Limitar cantidad total a `100` etiquetas por impresion.
- Generar QR solo para productos seleccionados.
- Mostrar estado de generacion.

### Riesgo: dependencia duplicada de QR

Mitigacion:

- Extraer helper `features/products/qr.ts`.
- Mantener `qrcode` con `import()` dentro del helper.

### Riesgo: categoria por nombre queda inconsistente

Mitigacion:

- Preferir filtro por `category_id`.
- Mantener `products.category` solo por compatibilidad visual/export.

### Riesgo: la pantalla de etiquetas se vuelve demasiado compleja

Mitigacion:

- MVP con un solo formato.
- No agregar editor visual.
- No agregar PDF server-side.
- No agregar impresora termica directa.

## Orden Recomendado de Implementacion

1. Extraer helper QR compartido desde `QrPreviewDialog`.
2. Crear componentes de etiqueta (`ProductLabelCard`, preview y toolbar).
3. Crear ruta `/dashboard/products/labels`.
4. Implementar seleccion y cantidades en cliente.
5. Agregar CSS print en `globals.css`.
6. Agregar boton de navegacion desde inventario.
7. Agregar filtro por categoria en frontend.
8. Si se decide, agregar filtro backend por `category_id`.
9. Tests frontend de selector, preview e impresion.
10. Tests backend de `category_id` si aplica.
11. Validacion manual con print preview y escaneo real.

## Recomendacion Final

Para este MVP, Sprint 2 debe cerrar etiquetas imprimibles y filtro por categoria. Eso entrega valor directo a la operacion de tienda y aprovecha todo lo construido en Sprint 1.

Camara web debe quedar para Sprint 3 o posterior. La razon es tecnica y de producto: primero hay que validar que las etiquetas impresas y el POS con lector tipo teclado funcionan bien. Si ese flujo es estable, la camara se vuelve una mejora adicional, no una dependencia critica del MVP.
