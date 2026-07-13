# Inventory App — Resumen de Funcionalidades

Aplicación web profesional para administrar inventario, ventas (POS) y reportes en tiendas pequeñas y medianas. Multi-tienda, multi-usuario, con roles de dueño y cajero.

---

## Panel Principal (Dashboard)

Visión general del negocio en tiempo real: total de ventas del día/mes, productos con stock bajo, últimas ventas registradas y tipo de cambio actualizado. Cambio rápido entre vista del día y del mes.

## Punto de Venta (POS)

Interfaz rápida para registrar ventas: buscador de productos por nombre o código QR, carrito de compras con ajuste de cantidades, y checkout con 4 métodos de pago (efectivo, QR, transferencia, tarjeta). Validación automática de stock antes de confirmar.

## Productos

Gestión completa de productos: alta, edición y eliminación. Categorías con prefijo SKU (código único generado automáticamente). Fotos de producto con carga a Cloudinary. Códigos QR imprimibles. Búsqueda por texto, categoría o nivel de stock. Importación masiva vía CSV con seguimiento de errores.

## Impresión de Etiquetas

Seleccione productos, configure tamaño de etiqueta y hoja, y descargue un archivo SVG listo para imprimir. Ideal para colocar códigos QR y precios en productos físicos.

## Ventas

Historial completo con filtros por fecha y estado (completada/anulada). Vista detallada de cada venta con todos sus ítems. Anulación de ventas con devolución automática de stock.

## Reportes

- **Reporte de Ventas**: totales, desglose por método de pago (con gráfico de barras), productos más vendidos, ticket promedio.
- **Movimientos de Stock**: auditoría total de entradas y salidas filtrable por producto, tipo y fecha.
- **Movimientos de Caja**: control de ingresos/egresos, gastos, depósitos y retiros.
- **Cierres de Caja**: reportes detallados por jornada con snapshot de ventas y cortes de efectivo.

## Gestión de Jornada (Apertura/Cierre)

Abra la caja al iniciar el día con un monto inicial. Durante la jornada registre movimientos de caja. Al cerrar, concilie el efectivo contado vs. el esperado. El sistema guarda un snapshot completo de ventas y movimientos. Posibilidad de reabrir jornadas.

## Configuración

- **Información de la tienda**: nombre, dirección, teléfono.
- **Usuarios**: administre cajeros, cambie roles, active/desactive cuentas.
- **Categorías de productos**: cree y administre categorías con prefijo SKU.
- **Matriz de permisos**: visualización clara de lo que cada rol puede hacer.
- **Suscripción**: estado de prueba o suscripción activa.

## Exportaciones

Exporte sus datos a CSV: productos, ventas, movimientos de stock y movimientos de caja con filtros por fecha.

## Roles y Permisos

| Rol | Acceso |
|-----|--------|
| **Dueño** | Acceso completo: productos, POS, ventas, reportes, configuración, exportaciones, cierres de caja |
| **Cajero** | POS, ver productos, ver ventas, ver reportes (sin configuración, sin anular ventas, sin exportar) |

---

## Tecnología

Backend robusto en **Python (FastAPI)** con base de datos **PostgreSQL**, autenticación segura, panel web en **Next.js** con diseño responsivo, y despliegue en la nube. Preparado para funcionar tanto en escritorio como en tablets y móviles vía navegador.

> *Nota: La aplicación móvil nativa (Expo React Native) se encuentra en desarrollo.*

---

**¿Listo para digitalizar su tienda?** La aplicación está operativa y lista para usar desde cualquier navegador moderno.
