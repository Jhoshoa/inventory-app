# Analisis de concurrencia en ventas y stock

## Contexto

El flujo POS confirma ventas contra `POST /api/v1/sales`. En la web, el carrito valida cantidades antes de enviar la venta, pero esa validacion es solo una ayuda de UX. La autoridad final debe ser el backend, porque el stock puede cambiar entre el momento en que el cajero agrega un producto y el momento en que confirma la venta.

Hoy el frontend envia al backend solamente:

- `product_id`
- `quantity`
- `payment_method`
- `device_id`
- `customer_name`

No envia precio, subtotal ni total. Esto es correcto: evita que un cliente manipule el total desde el navegador.

## Validaciones actuales

El backend ya cubre las reglas principales:

- La venta debe tener al menos un item.
- `quantity` debe ser mayor a cero.
- `payment_method` debe pertenecer a los valores permitidos.
- No se permiten productos duplicados en la misma venta.
- El producto se busca por `store_id` y `product_id`, evitando ventas cruzadas entre tiendas.
- El producto debe existir, estar activo y tener stock suficiente.
- El total se calcula en backend usando el precio actual del producto en BD.
- El descuento de stock vuelve a validar que el stock no quede negativo.

En terminos de integridad basica, esto significa que el endpoint no confia en el total ni en el precio que pudiera traer el cliente.

## Riesgo pendiente: concurrencia

El riesgo aparece cuando dos dispositivos o cajeros intentan vender el mismo producto al mismo tiempo.

Ejemplo:

1. El producto tiene stock `5`.
2. Cajero A arma una venta por `4`.
3. Cajero B arma otra venta por `4`.
4. Ambos ven stock disponible antes de confirmar.
5. Ambos presionan confirmar casi al mismo tiempo.

Si la validacion y el descuento de stock se hacen como operaciones separadas sin bloqueo o update atomico, ambos requests pueden competir por el mismo stock. El sistema actual valida antes de crear la venta y valida de nuevo al descontar, lo cual reduce el riesgo, pero no es la forma mas fuerte de protegerse contra carreras bajo alta concurrencia.

## Como se maneja generalmente

La UI no suele saber que una fila esta bloqueada en la base de datos. El usuario solo ve que la venta esta en estado de carga.

Flujo normal:

1. Cajero A presiona `Confirmar venta`.
2. Backend procesa la venta dentro de una transaccion.
3. Cajero B presiona `Confirmar venta` casi al mismo tiempo.
4. Si hay bloqueo de fila, el request B espera.
5. Cuando A termina, B continua con el stock ya actualizado.
6. Si no alcanza stock, backend responde error.
7. La UI muestra un mensaje claro y refresca productos/carrito.

Mensaje recomendado:

```text
Stock insuficiente para Aceite 1L. Disponible: 1, solicitado: 4.
```

No conviene mostrar "producto bloqueado" al usuario para esperas normales de milisegundos. Solo seria util si hubiera timeouts o esperas largas, y aun asi el mensaje deberia ser operacional: "No se pudo confirmar la venta porque el stock cambio. Revisa el carrito."

## Recomendacion para este punto del proyecto

Para el estado actual, conviene priorizar robustez simple sin meter infraestructura en tiempo real todavia.

### 1. Mantener validacion fuerte en backend

La UI puede prevenir errores comunes, pero el backend debe seguir siendo la fuente de verdad. Esto ya esta bien encaminado.

### 2. Mejorar el error de stock

Actualmente el backend puede responder stock insuficiente, pero seria mejor devolver un mensaje con datos accionables:

- producto
- stock disponible
- cantidad solicitada

Esto permite que el POS muestre una alerta clara y el cajero corrija rapido.

### 3. Refrescar datos despues de fallo por stock

Cuando `POST /sales` falle por stock insuficiente, la web deberia:

- mostrar alerta/toast visible;
- refrescar busqueda de productos o stock del carrito;
- mantener el carrito para que el usuario ajuste cantidad;
- opcionalmente limitar la cantidad del item al stock disponible si el backend devuelve ese dato.

El carrito no debe borrarse despues de un fallo por stock. En una venta real puede haber muchos items y obligar al cajero a cargarlos de nuevo seria una mala experiencia operativa.

Comportamiento recomendado:

1. Backend rechaza la venta indicando que producto fallo, stock disponible y cantidad solicitada.
2. Web mantiene todos los items del carrito.
3. Web refresca el stock de todos los productos presentes en el carrito.
4. Web marca los items donde `cantidad > stock_actual`.
5. Web muestra un mensaje claro con el cambio detectado.
6. El cajero decide ajustar o remover el item conflictivo.

Ejemplo:

```text
No se pudo confirmar la venta porque el stock cambio.
Aceite 1L: solicitaste 10, disponible 9.
```

Decision de UX:

- No reducir cantidades automaticamente sin avisar.
- No borrar items del carrito.
- No ocultar el error detras de un mensaje generico.
- Si se ofrece un boton "Ajustar al stock disponible", debe ser una accion explicita del cajero.

Esto evita inconsistencias con el cliente final. Si el sistema cambia de `10` a `9` automaticamente, el cajero podria cobrar una venta distinta a la conversada sin darse cuenta.

### 4. Hacer el descuento de stock atomico en backend

La mejora tecnica mas importante es cambiar el descuento de stock para que la base de datos garantice la condicion en una sola operacion.

Opcion recomendada:

```sql
UPDATE products
SET stock = stock - :quantity,
    version = version + 1,
    updated_at = now()
WHERE id = :product_id
  AND store_id = :store_id
  AND deleted_at IS NULL
  AND is_active = true
  AND stock >= :quantity
RETURNING stock;
```

Si no retorna fila, no habia stock suficiente o el producto no estaba disponible. Esta opcion evita vender de mas incluso con varios cajeros confirmando al mismo tiempo.

## Alternativa: SELECT FOR UPDATE

Otra opcion es bloquear la fila del producto durante la transaccion:

```sql
SELECT *
FROM products
WHERE id = :product_id
  AND store_id = :store_id
FOR UPDATE;
```

Luego se valida stock y se descuenta. Esto tambien es robusto, pero hace que otros requests esperen el lock. Es facil de razonar y funciona bien si el volumen no es alto.

Para este caso, el update condicional atomico es preferible porque expresa directamente la regla de negocio: "descuenta solo si hay stock suficiente".

## Mejoras posteriores

### Corto plazo

- Agregar tests de integracion para `POST /sales` que validen:
  - `quantity = 0` devuelve error.
  - cantidad mayor a stock devuelve error.
  - el total ignora cualquier total manipulado por cliente.
  - venta con producto de otra tienda no procede.
- Mejorar contrato de error de stock insuficiente.
- En frontend, mostrar un feedback especifico cuando backend rechaza la venta por stock.
- Mantener el carrito despues del error y marcar items conflictivos.
- Refrescar stock de los productos del carrito despues del rechazo.
- Agregar una accion explicita para ajustar un item conflictivo al stock disponible.

### Mediano plazo

- Implementar descuento atomico de stock en el repositorio.
- Envolver creacion de venta, items, stock movements y descuento de stock en una transaccion explicita.
- Refrescar el POS despues de una venta exitosa o fallida por stock.
- Agregar auditoria mas detallada en `stock_movements` para errores o intentos rechazados si el negocio lo necesita.

### Largo plazo

- Agregar polling corto del stock visible en POS si hay multiples cajas.
- Evaluar Supabase Realtime para actualizar stock en vivo desde `products` o `stock_movements`.
- Para offline-first, resolver stock por movimientos/deltas y no por sobrescritura de stock absoluto.
- Definir estrategia de conflicto cuando dos dispositivos venden offline el mismo stock y sincronizan despues.

## Decision sugerida

Para avanzar ahora:

1. No agregar WebSockets todavia.
2. Mejorar mensajes de error de stock y refresco del POS.
3. Planificar el update atomico de stock como hardening backend.

Esto mantiene el MVP simple, pero cierra el camino correcto para operar con mas de un cajero sin redisenar el POS.
