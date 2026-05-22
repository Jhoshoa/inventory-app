# Propuesta SKU, codigo escaneable y QR imprimible

## Objetivo

Mejorar la experiencia de productos para que una tienda pueda:

- definir un SKU interno legible por humanos;
- definir o generar un codigo escaneable;
- usar el SKU como codigo escaneable cuando convenga;
- previsualizar el QR del producto;
- descargar una imagen para imprimir etiquetas.

La meta es evitar confundir **SKU** con **QR**. El QR no es realmente un dato distinto en base de datos; es una representacion visual de un texto. Ese texto hoy vive en `products.qr_code`.

## Conceptos

### SKU

El SKU es un identificador interno de negocio.

Ejemplos:

```text
ACE-001
ARROZ-1KG
CAF-MOL-250
```

Uso:

- lectura humana;
- organizacion interna;
- busqueda administrativa;
- integraciones futuras;
- etiquetas impresas.

El SKU debe poder escribirse manualmente o generarse.

### Codigo escaneable

El codigo escaneable es el valor que lee el POS.

Puede ser:

- igual al SKU;
- un codigo generado por el sistema;
- un codigo comercial del producto;
- un codigo ingresado desde un lector.

Ejemplos:

```text
ACE-001
P-8F3A2B
7791234567890
```

Uso:

- lookup exacto en POS;
- generacion de QR;
- impresion de etiqueta;
- lectura desde lector USB/Bluetooth/camara.

## Decision de modelo

Mantener SKU y codigo escaneable separados.

Razon:

- Hay productos que ya traen codigo comercial.
- Hay productos que tendran SKU humano pero QR interno diferente.
- Hay tiendas que prefieren escanear el SKU directamente.
- Separarlos evita migraciones dolorosas si luego soportamos Code128/EAN/UPC.

Estado actual:

```text
products.sku
products.qr_code
```

Recomendacion conceptual:

- En UI, mostrar `qr_code` como **Codigo escaneable**.
- En backend, se puede mantener el nombre `qr_code` por compatibilidad.
- A futuro, evaluar renombrar o agregar `scan_code` y `scan_code_type`.

## UX propuesta

Formulario de producto:

```text
SKU
[ ACE-001                         ] [Generar]

Codigo escaneable
[ ACE-001                         ] [Generar] [Usar SKU] [Ver QR]
```

En UI final, los botones pueden ser compactos:

- `Generar`: icono `RefreshCw` o `Sparkles`.
- `Usar SKU`: texto corto `SKU` o boton `Usar SKU`.
- `Ver QR`: icono `Eye` o `QrCode`.

Para claridad operativa, no conviene que todos los botones sean solo iconos. `Usar SKU` deberia quedar legible porque expresa una accion de negocio.

## Comportamiento de campos

### SKU / Generar

Accion:

1. Genera un SKU humano.
2. Reemplaza el valor actual del campo `sku`.
3. No modifica automaticamente el codigo escaneable si ya tiene valor.
4. Si el codigo escaneable esta vacio, se puede ofrecer copiar el SKU generado.

Ejemplos de generacion:

```text
ACE-001
PROD-8F3A
CAF-250G-001
```

Para MVP, generar algo simple y unico:

```text
SKU-8F3A2B
```

Mas adelante se puede generar a partir del nombre/categoria.

### Codigo escaneable / Generar

Accion:

1. Limpia o reemplaza el valor actual.
2. Genera un codigo interno unico.
3. Llena `qr_code`.
4. No toca el SKU.

Ejemplo:

```text
P-8F3A2B
```

El backend ya genera `qr_code` si no se envia uno. El boton frontend sirve para que el usuario vea/controlle el valor antes de guardar.

### Codigo escaneable / Usar SKU

Accion:

1. Copia el SKU actual al codigo escaneable.
2. Si SKU esta vacio, mostrar error corto o deshabilitar el boton.
3. Si el codigo escaneable tenia valor, reemplazarlo solo por accion explicita del usuario.

Esto permite el flujo:

```text
SKU = ACE-001
Codigo escaneable = ACE-001
```

### Codigo escaneable / Ver QR

Accion:

1. Si el campo esta vacio, boton deshabilitado.
2. Si tiene valor, abre modal.
3. El modal genera QR desde el texto actual del campo.
4. Permite descargar la imagen.

El QR debe representar el valor exacto del input. Si el input dice `ACE-001`, el QR codifica `ACE-001`.

## Modal de QR

Contenido recomendado:

```text
QR del producto

[ QR grande ]

Producto: Aceite 1L
Codigo: ACE-001

[Descargar PNG] [Descargar SVG] [Cerrar]
```

Requisitos:

- QR en alto contraste, negro sobre blanco.
- Tamano visible suficiente para testear con celular.
- Mostrar el codigo como texto legible.
- No guardar imagen en BD para el MVP; generar bajo demanda.

Opciones posteriores:

- Boton `Imprimir etiqueta`.
- Selector de tamano de etiqueta.
- Incluir precio.
- Incluir nombre corto del producto.

## Descarga de imagen

Formatos:

- **SVG:** recomendado para impresion porque escala sin perder calidad.
- **PNG:** conveniente para compartir o imprimir rapido.

Implementacion recomendada:

- Usar libreria `qrcode`.
- Cargarla dinamicamente solo cuando se abre el modal o se descarga.
- Generar SVG para vista previa/descarga.
- Generar PNG mediante canvas cuando el usuario lo pida.

No conviene incluir la libreria en el bundle principal del formulario si se puede cargar bajo demanda.

## Validaciones

### Frontend

- SKU opcional, max length segun backend.
- Codigo escaneable opcional, max length segun backend.
- Si el usuario pulsa `Ver QR` con campo vacio, no abrir modal.
- Si pulsa `Usar SKU` sin SKU, mostrar mensaje o deshabilitar.
- Normalizar espacios: trim.
- No forzar uppercase automaticamente sin definir regla de negocio; puede romper codigos comerciales.

### Backend

Ya existe validacion de duplicados para `qr_code`.

Se recomienda:

- Mantener `qr_code` unico.
- Mantener `sku` como campo no necesariamente unico global.
- Si se requiere, hacer SKU unico por tienda a futuro, no global.
- Devolver errores claros para colisiones:

```text
El codigo escaneable ya esta en uso por otro producto.
```

## POS y busqueda

El POS debe usar el codigo escaneable para lookup exacto:

```text
GET /api/v1/products/qr/{codigo}
```

Flujo recomendado:

1. Usuario escribe o lector inyecta codigo en input.
2. Al presionar Enter, buscar por codigo exacto.
3. Si existe, agregar producto al carrito.
4. Si no existe, mantener busqueda por nombre.

Esto permite:

- lector USB/Bluetooth tipo teclado;
- ingreso manual;
- uso del mismo valor generado en etiqueta QR.

### Un solo input para nombre y codigo

La recomendacion es usar un solo input principal en POS:

```text
[ Buscar por nombre o escanear codigo                  ] [Scan/Camara]
```

Comportamiento:

- Escritura normal: busqueda por nombre con debounce usando `/products/pos?q=...`.
- Tecla `Enter`: intento de lookup exacto por codigo usando `/products/qr/{codigo}`.
- Si el codigo existe: agregar producto al carrito y limpiar input.
- Si el codigo no existe: mostrar error claro y mantener la busqueda por nombre disponible.

El frontend no necesita adivinar siempre si el texto es nombre o codigo. La senal es el evento:

- `typing` normal => nombre.
- `Enter` => codigo exacto.

Esto es comun en POS web porque muchos scanners USB/Bluetooth funcionan como teclado: escriben el codigo en el input y suelen enviar `Enter` al final.

### Problema del foco con scanners tipo teclado

Un scanner tipo teclado solo funciona bien si el foco esta donde corresponde. Si el cursor esta en otro input o no hay foco, el scanner puede escribir en el lugar equivocado o perder el codigo.

Solucion recomendada para ahora:

1. El input de busqueda del POS debe tener `autoFocus`.
2. Mantener una referencia (`ref`) al input.
3. Re-enfocar el input despues de:
   - agregar producto al carrito;
   - limpiar busqueda;
   - error de codigo no encontrado;
   - cierre de modal de camara/QR si aplica.
4. Procesar `Enter` dentro del input para lookup exacto por codigo.

Esto cubre el caso principal sin introducir captura global que pueda interferir con otros campos.

Solucion futura:

- Agregar un listener global de teclado en la pantalla POS para detectar escaneos aunque el input no tenga foco.
- Detectar rafagas rapidas de caracteres terminadas en `Enter`.
- Ignorar captura global si el foco esta en:
  - input de cantidad;
  - campo cliente;
  - select de metodo de pago;
  - textarea;
  - cualquier elemento editable.

La captura global es util, pero debe implementarse con cuidado porque puede generar bugs si intercepta escritura normal del cajero.

## Fases de implementacion

### Fase 1: UX de formulario sin dependencias pesadas

Cambios:

- Renombrar label actual `QR / Codigo unico` a `Codigo escaneable`.
- Agregar boton `Generar` junto a SKU.
- Agregar botones `Generar`, `Usar SKU`, `Ver QR` junto a codigo escaneable.
- Implementar generadores simples en frontend.
- Mantener validacion backend existente.

Riesgo bajo. Se puede hacer en una sola iteracion.

### Fase 2: Modal QR y descarga

Cambios:

- Agregar `qrcode` como dependencia web.
- Crear componente `QrPreviewDialog`.
- Cargar generacion de QR bajo demanda.
- Permitir descarga SVG/PNG.
- Agregar tests de UI para:
  - boton deshabilitado si no hay codigo;
  - modal muestra codigo correcto;
  - accion de descarga invoca generacion.

Se puede hacer junto con Fase 1 si se quiere cerrar la experiencia completa, pero conviene mantenerlo separado si queremos reducir riesgo.

### Fase 3: POS lookup por codigo exacto

Cambios:

- Cambiar placeholder POS a `Buscar por nombre o escanear codigo`.
- Mantener un solo input para nombre y codigo.
- Agregar `autoFocus` y re-enfoque del input despues de agregar producto o mostrar error.
- Al presionar `Enter` en el input, llamar endpoint `/products/qr/{codigo}`.
- Si encuentra producto, agregar al carrito y limpiar input.
- Si no encuentra, mostrar error claro o continuar busqueda por nombre.
- Agregar tests de:
  - escaneo con Enter agrega producto;
  - codigo inexistente muestra error;
  - busqueda por nombre sigue funcionando.

Esta fase es muy importante para que los QR generados tengan utilidad real.

Queda fuera de esta fase:

- Captura global de scanner cuando el input no tiene foco.
- Boton de camara con `getUserMedia`.
- Modal de scanner web.

Eso debe ir en fases posteriores despues de validar el flujo con lector tipo teclado.

### Fase 4: Etiquetas imprimibles

Cambios:

- Crear pagina de etiquetas de productos.
- Seleccionar productos y cantidad de etiquetas.
- Generar layout imprimible con CSS `@media print`.
- Usar medidas en mm para etiquetas.

Esto ya es una herramienta operativa de inventario, no solo formulario.

### Fase 5: Scanner avanzado en POS

Cambios futuros:

- Agregar boton de camara/scan al lado del input.
- Abrir modal de camara para QR/codigo de barras.
- Intentar `BarcodeDetector` si esta disponible.
- Cargar libreria de scanner con `dynamic import()` si hace falta.
- Evaluar `qr-scanner`, `html5-qrcode` o `@zxing/browser` segun formatos requeridos.
- Agregar captura global opcional para lectores tipo teclado cuando el input no tiene foco.

Esta fase no es necesaria para que lectores USB/Bluetooth funcionen si implementamos bien el input principal con `Enter`.

## Implementacion en una sola entrega vs fases

Se puede hacer todo junto, pero no lo recomiendo si queremos minimizar riesgo.

Mejor entrega incremental:

1. **Entrega A:** campos + botones `Generar`/`Usar SKU`.
2. **Entrega B:** modal `Ver QR` + descarga.
3. **Entrega C:** POS lookup por Enter/codigo exacto con input auto-enfocado.
4. **Entrega D:** pagina de impresion masiva de etiquetas.
5. **Entrega E:** scanner avanzado con camara o captura global.

Si el objetivo inmediato es probar escaneo real, la prioridad debe ser:

1. POS lookup por codigo exacto.
2. Codigo escaneable claro en producto.
3. Ver QR/descargar.

## Recomendacion final

Implementar primero:

- SKU con boton `Generar`.
- Codigo escaneable editable.
- Boton `Generar` para codigo escaneable.
- Boton `Usar SKU`.
- Boton `Ver QR` con modal basico.

Luego conectar POS:

- Un solo input en POS para nombre y codigo.
- Busqueda por nombre mientras se escribe.
- Enter en input del POS intenta lookup por codigo exacto.
- Re-enfocar el input despues de agregar producto o fallar lookup.

Esto crea un ciclo completo:

```text
crear producto -> generar codigo -> ver/descargar QR -> pegar etiqueta -> escanear en POS -> agregar al carrito
```

Ese ciclo es mas valioso que agregar camara web de inmediato, porque tambien funciona con lectores USB/Bluetooth tipo teclado y con la futura app mobile.
