# Modelo de Suscripcion — Guia para Clientes

## 1. Free Trial (Periodo de Prueba Gratuito)

Al registrarte, tu tienda obtiene automaticamente **30 dias de prueba gratuita** sin necesidad de ingresar un metodo de pago.

| Concepto | Detalle |
|---|---|
| Duracion | 30 dias corridos desde el registro |
| Costo | $0 |
| Funcionalidades | App completa sin restricciones |
| Metodo de pago | No requerido |

### Notificaciones durante el trial

- **Dias 1-23**: Sin notificaciones. Disfruta de la app.
- **Dia 24 (faltan 7 dias)**: Aparece un aviso amigable en el panel: *"Tu periodo de prueba termina en 7 dias. Adquiere un plan para no perder acceso."*
- **Dia 29 (falta 1 dia)**: El aviso cambia a: *"Tu periodo de prueba termina mañana. Adquiere un plan para no perder acceso."*
- **Dia 30+**: El aviso se vuelve rojo: *"Tu periodo de prueba ha expirado. Adquiere un plan para continuar usando la aplicacion."*

> **Importante**: Durante los 7 dias posteriores al vencimiento del trial (dias 30-37) **aun puedes usar la app** con normalidad. Solo ves un aviso en el panel. Esto te da tiempo para adquirir un plan sin interrupcion.

---

## 2. Suscripcion Activa

Cuando adquieres un plan, tu tienda pasa a **estado Suscripto** automaticamente.

| Concepto | Detalle |
|---|---|
| Acceso | Completo, sin restricciones |
| Facturacion | Se genera una factura cada mes en la fecha de corte |
| Estado en pantalla | Badge verde "Suscripto" en el header |

### Datos de facturacion

Desde la seccion **Ajustes > Suscripcion** puedes configurar:

- **Email de facturacion** (puede ser diferente al email del owner)
- **NIT** (para facturacion con empresa)
- **Razon social**

---

## 3. Periodo de Gracia

Si falla un pago (tarjeta vencida, fondos insuficientes, etc.), entras automaticamente en **Periodo de Gracia** sin perder el acceso.

| Concepto | Detalle |
|---|---|
| Duracion | 15 dias calendario |
| Acceso | Completo durante el periodo |
| Notificaciones | Aviso visible en el panel indicando los dias de gracia restantes |
| Accion requerida | Actualizar metodo de pago |

### Timeline del periodo de gracia

```
Dia 0  ───  Pago falla → Entra a periodo de gracia (15 dias)
Dia 1  ───  Badge amarillo "Vencido" en el header
             Mensaje: "Tu suscripcion esta vencida. Quedan 14 dias de gracia."
Dia 7  ───  Mensaje: "Tu suscripcion esta vencida. Quedan 8 dias de gracia."
Dia 14 ───  Mensaje: "Tu suscripcion vence mañana. Actualiza tu metodo de pago."
Dia 15 ───  Periodo de gracia termina
             Acceso suspendido
             Badge rojo "Suspendido" en el header
```

---

## 4. Acceso Suspendido

Cuando el periodo de gracia termina sin que se regularice el pago, el acceso se suspende automaticamente.

| Concepto | Detalle |
|---|---|
| Acceso a la app | Bloqueado |
| Datos | Conservados (no se elimina nada) |
| Duracion | Indefinida hasta que se reactive |
| Reactivacion | Contactar a soporte para regularizar pago |

### Pantalla de bloqueo

Al intentar iniciar sesion o usar la app con acceso suspendido, veras:

> "Tu suscripcion ha sido suspendida por falta de pago. Contacta a soporte para reactivar."

### Que pasa con mis datos?

Tus datos, productos, ventas y configuracion **no se eliminan**. Solo el acceso queda restringido. Al reactivar la suscripcion, todo vuelve a estar disponible exactamente como lo dejaste.

---

## 5. Cancelacion de Suscripcion

Si decides cancelar tu plan:

| Situacion | Que sucede |
|---|---|
| Cancelacion inmediata | Acceso continúa hasta el final del periodo ya pagado, luego se suspende |
| Cancelacion al final del periodo | No se renová el plan, acceso se mantiene hasta la fecha de corte |

---

## Resumen Visual

```
Registro
    │
    ▼
┌─────────────────────┐
│   FREE TRIAL        │  30 dias
│   (acceso completo)  │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
Activo      No compra
    │           │
    ▼           ▼
┌────────┐  ┌────────────────┐
│ SUSCRIPTO │  │ TRIAL VENCIDO   │  Sigue usando la app
│ (paga)    │  │ (aviso en panel) │  7 dias adicionales
└────┬───┘  └────────┬───────┘
     │               │
     ▼               ▼
Pago falla      ╔═══╧════════╗
     │          ║  SUSPENDIDO ║  ← Se bloquea el acceso
     ▼          ╚════════════╝
┌────────────┐
│ GRACIA 15d  │  Acceso completo mientras regularizas
└──────┬─────┘
       │
       ▼
  ┌─────────┐
  │ SUSPENDIDO│  ← Se bloquea el acceso
  └──────────┘
       │
       ▼
  ┌─────────┐
  │ REACTIVO  │  ← Pagas y todo vuelve a la normalidad
  └──────────┘
```

---

## 6. Preguntas Frecuentes

**?Puedo usar la app despues de que termine mi trial?**
Si, por 7 dias adicionales con un aviso en pantalla. Luego el acceso se bloquea.

**?Que pasa si no pago?**
Entras en periodo de gracia de 15 dias con acceso completo. Si aun no pagas, el acceso se suspende hasta que regularices.

**?Se pierden mis datos si me suspenden?**
No. Tus datos se conservan intactos. Al reactivar, todo vuelve como estaba.

**?Como reactivo mi cuenta?**
Contacta a soporte para regularizar el pago. La reactivacion es inmediata.

**?Puedo cambiar mi NIT o email de facturacion?**
Si, desde Ajustes > Suscripcion (solo el owner puede hacerlo).
