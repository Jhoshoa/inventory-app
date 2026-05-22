# Analisis QR / codigo de barras para POS web y mobile

## Objetivo

Definir una estrategia solida para:

- buscar productos por codigo en el POS;
- soportar lectores USB/Bluetooth tipo teclado;
- escanear con camara desde la web;
- preparar una futura app mobile con camara nativa;
- generar codigos para imprimir y pegar en productos.

Este analisis separa dos problemas distintos:

1. **Identificacion del producto:** que valor codificamos y guardamos en `products.qr_code`.
2. **Captura del codigo:** como el POS obtiene ese valor: teclado, lector USB, camara web o camara mobile.

## Estado actual del proyecto

Hoy existe soporte parcial:

- La tabla `products` tiene `qr_code`.
- Backend tiene endpoint exacto: `GET /api/v1/products/qr/{qr_code}`.
- Al crear producto, si no se envia `qr_code`, backend genera uno.
- El POS muestra un input con placeholder `Buscar por nombre o QR`.

Pero hay una brecha importante:

- El input del POS llama `GET /products/pos?q=...`.
- La busqueda por `q` actualmente filtra por nombre, no por `qr_code`.
- Por eso el texto "Buscar por nombre o QR" es enganoso en este momento.

Decision inmediata sugerida: hasta implementar lookup real por QR en POS, cambiar el placeholder a "Buscar por nombre" o implementar el flujo QR exacto.

## Tipos de captura

### 1. Lector USB/Bluetooth tipo teclado

Es la opcion mas practica para POS web en tienda.

Muchos lectores de codigo de barras/QR funcionan como un teclado:

1. El cajero enfoca un input.
2. Escanea el codigo.
3. El lector escribe el texto decodificado.
4. Normalmente envia `Enter` al final.
5. La app toma ese valor y busca el producto.

Ventajas:

- No requiere libreria de camara.
- No requiere permisos del navegador.
- Funciona en web, desktop, tablets y muchos celulares con teclado/OTG.
- Es rapido y confiable para operacion diaria.
- Carga cero en bundle.

Desventajas:

- Requiere comprar/configurar el lector.
- La UX depende de mantener el foco en el input correcto.
- Hay que manejar `Enter` y limpiar el input despues de agregar.

Recomendacion: implementar esto primero.

Flujo recomendado:

```text
Input POS enfocado
  -> lector escribe codigo
  -> lector envia Enter
  -> web llama GET /products/qr/{codigo}
  -> si existe: agrega producto al carrito
  -> si no existe: muestra "Producto no encontrado para codigo X"
```

Este mismo flujo sirve con una camara USB si esa camara viene dentro de un equipo lector que emula teclado. Si es una camara USB normal conectada al celular, entonces no emula teclado: se necesita acceso a camara y deteccion por software.

### 2. Camara web desde navegador

Para usar una camara normal, la app necesita:

- pedir permiso con `navigator.mediaDevices.getUserMedia`;
- mostrar el stream de video;
- procesar frames;
- detectar QR/codigo de barras;
- devolver el texto detectado.

Notas tecnicas:

- `getUserMedia` requiere contexto seguro: HTTPS o `localhost`.
- En un celular con camara USB, el navegador debe exponer esa camara como dispositivo disponible. No siempre ocurre igual en todos los Android/browser.
- En desktop suele funcionar bien con camaras USB.
- En mobile web, iOS y Android pueden comportarse distinto con permisos, seleccion de camara, foco y rendimiento.

### 3. Mobile nativo futuro

Cuando exista app mobile con Expo/React Native, conviene usar `expo-camera` para escaneo. Expo Camera ya expone eventos de barcode scanning y permisos de camara. Esto evita gran parte de las limitaciones del navegador.

Para una app mobile operativa, la camara nativa suele ser mejor que escaneo QR web:

- mejor control de permisos;
- mejor seleccion de camara trasera;
- mejor UX full-screen;
- menos problemas con HTTPS/browser;
- integracion natural con vibracion/sonido al escanear.

## Librerias de escaneo para web

### Opcion A: Web BarcodeDetector API

API nativa del navegador para detectar codigos 1D y 2D en imagenes/video.

Ventajas:

- No agrega dependencia pesada.
- Puede ser muy eficiente cuando esta disponible.
- Sirve como primer intento/fallback progresivo.

Desventajas:

- Compatibilidad incompleta entre navegadores.
- No se puede depender solo de ella para una app POS web multi-dispositivo.
- Hay que implementar captura de video y loop de frames.

Uso sugerido:

- Detectar si existe `window.BarcodeDetector`.
- Si existe y soporta `qr_code`, `ean_13`, `code_128`, usarlo.
- Si no existe, cargar libreria por `dynamic import`.

### Opcion B: `qr-scanner`

Libreria enfocada en QR, relativamente simple y ligera comparada con suites completas.

Ventajas:

- Buena opcion si el proyecto solo necesita QR.
- API sencilla.
- Usa worker para procesar sin bloquear tanto la UI.
- Permite listar camaras.

Desventajas:

- Enfocada en QR; no cubre todos los codigos de barras de tienda.
- Si luego queremos EAN/UPC/Code128, habria que agregar otra libreria o cambiar.

Uso recomendado si decidimos que nuestros productos usan solamente QR interno.

### Opcion C: `html5-qrcode`

Libreria web madura para QR y varios formatos de codigo de barras. Incluye UI lista o API de bajo nivel.

Ventajas:

- Soporta QR y muchos formatos 1D/2D.
- Tiene UI integrada para prototipar rapido.
- Soporta camara y archivo local.
- Buena para validar rapido con una camara USB.

Desventajas:

- Mas pesada: el paquete reporta unpacked size alrededor de 2.63 MB y el build minificado disponible por CDN ronda cientos de KB.
- Ultima publicacion npm no es reciente.
- La UI integrada puede no calzar con nuestro sistema visual; conviene usar API low-level si se adopta.

Uso recomendado:

- Prueba rapida de camara web/USB.
- Si necesitamos barcode 1D ademas de QR sin invertir mucho en integracion.
- Cargar con `next/dynamic` o `import()` solo cuando el usuario abre el scanner.

### Opcion D: `@zxing/browser`

Wrapper moderno de ZXing para navegador.

Ventajas:

- ZXing es un ecosistema muy usado para barcodes.
- Soporta varios formatos.
- Mas flexible para construir nuestra UI.

Desventajas:

- Integracion algo mas manual.
- Puede ser mas pesada que una libreria QR-only.
- Requiere pruebas reales por dispositivo/camara.

Uso recomendado:

- Si queremos soporte serio para codigos comerciales tipo EAN-13, UPC, Code128, ademas de QR.

## Librerias de generacion de QR

### Opcion recomendada web/backend: `qrcode`

Paquete npm popular para generar QR en:

- SVG;
- Canvas;
- Data URL;
- PNG.

Ventajas:

- Sirve para generar etiquetas imprimibles desde web.
- Puede usarse server-side o client-side.
- SVG es ideal para impresion porque escala bien.

Desventajas:

- Hay que disenar layout de etiquetas, no solo generar el QR.
- Hay que estandarizar tamano fisico, margen, texto visible y formato de impresion.

Uso recomendado:

- Generar QR como SVG en una pagina de impresion.
- Mostrar tambien nombre del producto y codigo legible por humano.

### Alternativa: generacion backend

El backend podria generar PNG/SVG para cada producto.

Ventajas:

- Centraliza formato.
- Permite endpoint como `GET /products/{id}/label.svg`.
- Facilita exportar un PDF o ZIP de etiquetas.

Desventajas:

- Agrega dependencia/backend rendering.
- Para MVP, una pagina web imprimible suele ser mas rapida.

## QR vs codigo de barras tradicional

### QR interno

Ejemplo de valor:

```text
P-20260521-8F3A2B
```

Ventajas:

- Facil de generar.
- Menos riesgo de colision.
- Puede codificar un valor interno estable.
- Se lee bien con camara.

Desventajas:

- No todos los lectores POS antiguos leen QR; algunos solo leen 1D.
- La etiqueta puede ocupar mas espacio que un EAN/Code128 simple.

### Code128 interno

Ventajas:

- Muy compatible con lectores POS.
- Compacto y rapido de leer.
- Ideal para etiquetas de productos internos.

Desventajas:

- Camara web puede requerir mejor libreria/condiciones.
- Generacion e impresion debe cuidar ancho, contraste y resolucion.

### EAN/UPC real

Usar EAN/UPC solo si el producto ya trae codigo comercial del fabricante.

No conviene inventar EAN/UPC si no se tiene autoridad/rango asignado. Para codigos internos es mejor QR o Code128.

## Modelo de datos recomendado

Actualmente `products.qr_code` funciona como codigo unico. A mediano plazo conviene renombrar conceptualmente a "codigo escaneable" o agregar campos:

```text
products.scan_code        -- valor escaneado principal
products.scan_code_type   -- qr | code128 | ean13 | upc | manual
products.qr_code          -- mantener por compatibilidad o migrar
```

Para MVP podemos mantener `qr_code`, pero en UI llamarlo "Codigo" o "Codigo escaneable", no solo QR.

## Flujo recomendado para este proyecto

### Fase 1: POS web con lector tipo teclado

Implementar ya:

- Cambiar input a "Buscar por nombre o escanear codigo".
- Al presionar Enter:
  - si el texto parece codigo exacto, llamar `/products/qr/{code}`;
  - si encuentra producto, agregar al carrito y limpiar input;
  - si no encuentra, mostrar error y permitir busqueda por nombre.
- Mantener busqueda por nombre con debounce para texto normal.

Esto habilita lectores USB/Bluetooth sin agregar librerias pesadas.

### Fase 2: Boton de camara en web

Agregar un boton con icono de scan/camara al lado del input:

- Abre modal full-screen o panel lateral.
- Pide permiso de camara.
- Lista camaras disponibles si hay mas de una.
- Intenta `BarcodeDetector` primero.
- Si no esta disponible, carga libreria dinamicamente.

Recomendacion de libreria:

- Si solo vamos a usar QR interno: `qr-scanner`.
- Si queremos QR + EAN/UPC/Code128: `html5-qrcode` para MVP rapido o `@zxing/browser` para mas control.

Por peso, no debe importarse en el bundle principal del POS. Debe cargarse solo cuando el usuario pulsa el boton de camara.

### Fase 3: Etiquetas imprimibles

Implementar pantalla:

```text
/dashboard/products/labels
```

Funciones:

- Seleccionar productos.
- Elegir cantidad de etiquetas por producto.
- Elegir formato: QR interno o Code128.
- Vista previa imprimible.
- Boton imprimir.

Contenido minimo por etiqueta:

- Codigo visual QR/Code128.
- Nombre corto del producto.
- Precio opcional.
- Codigo legible por humano.

Recomendacion:

- Generar QR en SVG con `qrcode`.
- CSS `@media print`.
- Usar tamanos fijos en mm, no px, para impresion.

### Fase 4: Mobile nativo

Cuando se construya la app Expo:

- usar `expo-camera` para scanner;
- usar camara trasera por defecto;
- soportar `qr`, `ean13`, `code128` si el caso de negocio lo requiere;
- vibrar/sonar al detectar;
- resolver producto contra API/local DB;
- en offline-first, resolver contra SQLite/local store.

## Riesgos y mitigaciones

### Peso del bundle

Riesgo: cargar scanner en el POS inicial puede inflar el JS.

Mitigacion:

- No importar scanner al cargar POS.
- Usar `dynamic import()` cuando se abre el modal de camara.
- Preferir lector tipo teclado para MVP.

### Compatibilidad de camara

Riesgo: camara USB conectada a celular puede no aparecer en el navegador.

Mitigacion:

- Probar en Chrome Android con HTTPS/local tunnel.
- Mostrar selector de camara cuando `enumerateDevices` devuelve varias.
- Permitir fallback por input manual/lector.

### Codigos duplicados

Riesgo: dos productos con mismo codigo.

Mitigacion:

- Mantener constraint unico.
- Validar en backend al crear/editar.
- En UI mostrar error claro.

### Etiquetas ilegibles

Riesgo: QR muy pequeno, bajo contraste, impresion mala.

Mitigacion:

- QR con margen suficiente.
- Negro sobre blanco.
- Tamano minimo recomendado: 20-25 mm para QR pequenos internos.
- Probar con camara y lector antes de imprimir masivamente.

## Decision recomendada

Para el punto actual del proyecto:

1. Corregir POS para que el input use lookup exacto por QR/codigo al presionar Enter.
2. Cambiar copy a "Buscar por nombre o escanear codigo".
3. Agregar boton de camara visible, pero implementarlo en una fase separada.
4. Para web scanner, empezar con `html5-qrcode` si queremos validar rapido con camara USB; cargarlo por `import()` en modal.
5. Para produccion con solo QR interno, evaluar `qr-scanner` por menor alcance/peso.
6. Para generacion, usar `qrcode` y crear pagina imprimible de etiquetas.
7. Para mobile futuro, usar `expo-camera`.

Esta ruta permite avanzar sin sobrecargar el POS y deja una arquitectura limpia para scanner web, lector fisico y app mobile.

## Fuentes revisadas

- `html5-qrcode`: soporte web de QR/barcodes, camara y archivo; paquete npm con unpacked size reportado alrededor de 2.63 MB.
- `qr-scanner`: libreria enfocada en QR con soporte de camaras.
- `@zxing/browser`: lector browser basado en ZXing para varios formatos.
- `qrcode`: generacion QR para SVG/Canvas/DataURL/PNG.
- MDN `BarcodeDetector`: API nativa para detectar barcodes 1D/2D cuando el navegador la soporta.
- MDN `getUserMedia`: acceso a camara requiere contexto seguro.
- Expo Camera: soporte de camara y eventos de barcode scanning para app mobile.
