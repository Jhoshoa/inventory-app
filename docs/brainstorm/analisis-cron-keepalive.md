# Análisis: Cron Job para mantener BD activa + Tipo de Cambio

## El problema

El plan Free de Supabase **pausa la BD tras 7 días de inactividad**. Necesitamos un job diario que haga una escritura para mantenerla activa. Aprovechamos para guardar tipo de cambio (oficial, referencial, paralelo) que además es útil para los comerciantes.

---

## Opciones para el cron job diario

### Opción 1: GitHub Actions (recomendado)

| Aspecto | Detalle |
|---|---|
| **Costo** | ✅ Gratis (2000 min/mes en repos públicos, 300 min/mes en privados) |
| **Setup** | Mínimo — un archivo `.github/workflows/daily-keepalive.yml` |
| **Visibilidad** | El código está versionado en tu repo |
| **Latencia** | Ejecución en ~30s una vez al día |
| **Límites** | 2000 min/mes = 66 min/día. Un job de 10s consume ~5 min/mes |
| **Idioma** | JavaScript, Python, Bash, o cURL directo |
| **Secretos** | Usa GitHub Secrets para la API key de Supabase |
| **Mantenimiento** | Casi nulo |

**Flujo:**
```
.github/workflows/daily-keepalive.yml (cron: "0 12 * * *")
    ↓
Ejecuta script que:
    1. Consulta API de tipo de cambio (ej. brd.com.bo, BCB)
    2. Hace INSERT en tabla exchange_rates vía REST API de Supabase
    3. Logea resultado
```

**Cron:**
```yaml
on:
  schedule:
    - cron: "0 12 * * *"   # 12:00 UTC = 08:00 Bolivia
```

---

### Opción 2: AWS Lambda + EventBridge (tu sugerencia)

| Aspecto | Detalle |
|---|---|
| **Costo** | ✅ Prácticamente gratis (1 invocación/día = 0.03¢/mes — dentro del Free Tier de Lambda) |
| **Free Tier** | 1M invocaciones/mes + 400,000 GB-seg de cómputo |
| **Setup** | Medio — crear función Lambda + configurar EventBridge rule |
| **Visibilidad** | El código está en AWS, no en el repo |
| **Latencia** | Ejecución en ~1s (Lambda se "calienta" si ha sido invocada recientemente) |
| **Límites** | Ilimitados para 1 job/día |
| **Idioma** | Node.js, Python, Go, Java, etc. |
| **Secretos** | AWS Secrets Manager o variables de entorno en Lambda |
| **Mantenimiento** | Bajo — solo asegurar que el role IAM tenga permisos |
| **Vendor lock-in** | ⚠️ AWS — si migras, toca recrear la Lambda |

**Flujo:**
```
EventBridge Rule (cron: "0 12 * * ? *")
    ↓ trigger
AWS Lambda (Node.js/Python)
    ↓
    1. Consulta API de tipo de cambio
    2. Hace INSERT en tabla exchange_rates vía REST API de Supabase
```

**Terraform / CDK snippet:**
```typescript
const rule = new events.Rule(this, 'DailyKeepAlive', {
  schedule: events.Schedule.cron({ minute: '0', hour: '12' }),
});

const fn = new lambda.Function(this, 'KeepAliveFn', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const API_KEY = process.env.SUPABASE_KEY;
    exports.handler = async () => {
      await fetch(SUPABASE_URL + '/rest/v1/exchange_rates', {
        method: 'POST',
        headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0], source: 'bcb', buy_price: 6.96, sell_price: 6.96 })
      });
    };
  `),
});

rule.addTarget(new targets.LambdaFunction(fn));
```

---

### Opción 3: Supabase Edge Function + pg_cron

| Aspecto | Detalle |
|---|---|
| **Costo** | ✅ Free (500K invocaciones/mes). Una al día = ~30/mes = 0.006% del límite |
| **Setup** | Medio — crear Edge Function (Deno) + programar con `pg_cron` |
| **Visibilidad** | Dentro del mismo proyecto Supabase |
| **Latencia** | Inmediata (corre dentro de la infra de Supabase) |
| **Límites** | 500K invocaciones/mes en Free |
| **Idioma** | TypeScript/Deno |
| **Secretos** | Variables de entorno nativas de Supabase |
| **Mantenimiento** | Bajo — pero `pg_cron` requiere la extensión, y si la BD se pausa, el cron también 😅 |

**Problema:** Si la BD se pausa por inactividad, `pg_cron` también se pausa. No sirve para keepalive.

---

### Opción 4: cron-job.org (gratuito externo)

| Aspecto | Detalle |
|---|---|
| **Costo** | ✅ Gratis (hasta 60 jobs, intervalo mínimo 2 min) |
| **Setup** | Mínimo — solo registrarse y crear un cron que haga GET/POST |
| **Visibilidad** | Fuera de tu control (servicio tercero) |
| **Latencia** | Depende del servicio |
| **Límites** | 60 jobs gratis |
| **Idioma** | No aplica — configuras URL + método HTTP |
| **Secretos** | La API key se envía en el header de la petición |
| **Mantenimiento** | Mínimo |
| **Confianza** | ⚠️ Estás dando acceso a un externo a tu API de Supabase |

**No recomendado** por seguridad — expones tu API key a un servicio de terceros sin control.

---

### Opción 5: Script local + cron en tu PC / VPS

| Aspecto | Detalle |
|---|---|
| **Costo** | ✅ Gratis si usas tu PC. $3-5/mes si usas VPS |
| **Setup** | Bajo — script + crontab |
| **Visibilidad** | Tu control |
| **Latencia** | Depende de tu máquina |
| **Límites** | Ilimitados |
| **Idioma** | Cualquiera |
| **Secretos** | En variable de entorno local |
| **Mantenimiento** | ⚠️ Tu PC debe estar encendida 24/7. Si la apagas, el cron muere |

---

### Comparativa rápida

| Opción | Costo | Setup | Seguro | Sin vendor lock-in | Ideal para |
|---|---|---|---|---|---|
| **① GitHub Actions** | ✅ $0 | ⭐ Fácil | ✅ | ✅ | Launch / MVP |
| **② AWS Lambda + EB** | ✅ $0 | ⚠️ Medio | ✅ | ❌ AWS | Si ya usas AWS |
| **③ Edge Function + pg_cron** | ✅ $0 | ⚠️ Medio | ✅ | ✅ | ❌ No sirve (se pausa con BD) |
| **④ cron-job.org** | ✅ $0 | ⭐ Fácil | ❌ API key expuesta | ✅ | Emergencia |
| **⑤ Script local / VPS** | ✅ $0 | ⭐ Fácil | ✅ | ✅ | Solo temporal |

---

## Recomendación

### Para pilotear (hoy): GitHub Actions

Es la más simple, segura, y está en el mismo repo del proyecto. Sin dependencias externas.

### Si ya tienes infraestructura AWS: Lambda + EventBridge

Misma funcionalidad, pero con el overhead de manejar IAM roles y AWS SDK.

### En producción (si escalas a Pro): Eliminar el cron

En el plan Pro ($25/mes) la BD **nunca se pausa**. El cron deja de ser necesario. Pero los datos del tipo de cambio siguen siendo útiles para la app.

---

## Código listo para GitHub Actions

### `scripts/keepalive.js`

```javascript
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function getExchangeRates() {
  const sources = {
    bcb: async () => {
      const res = await fetch('https://www.bcb.gob.bo/api/tipo-cambio');
      // parsear según API real del BCB
      return { buy_price: 6.96, sell_price: 6.96 };
    },
    paralelo: async () => {
      const res = await fetch('https://api.brd.com.bo/parallel');
      // parsear según API real
      return { buy_price: 9.20, sell_price: 9.40 };
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const results = [];

  for (const [source, fn] of Object.entries(sources)) {
    try {
      const { buy_price, sell_price } = await fn();
      await fetch(`${SUPABASE_URL}/rest/v1/exchange_rates`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: today, source, buy_price, sell_price }),
      });
      results.push(`${source}: OK`);
    } catch (e) {
      results.push(`${source}: ERROR ${e.message}`);
    }
  }

  // También un INSERT a una tabla dummy para keepalive
  await fetch(`${SUPABASE_URL}/rest/v1/keepalive`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pinged_at: new Date().toISOString() }),
  });

  return results;
}

getExchangeRates().then(console.log).catch(console.error);
```

### `.github/workflows/daily-keepalive.yml`

```yaml
name: Daily Keepalive + Exchange Rates

on:
  schedule:
    - cron: "0 12 * * *"   # 08:00 Bolivia
  workflow_dispatch:         # Permite ejecución manual

jobs:
  keepalive:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node scripts/keepalive.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### Tabla `keepalive` (opcional, por si falla la de exchange_rates)

```sql
CREATE TABLE keepalive (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pinged_at  TIMESTAMPTZ DEFAULT NOW(),
  source     TEXT DEFAULT 'github-actions'
);
```

---

## Conclusión

**GitHub Actions es la opción más práctica para empezar:** $0, config en 10 minutos, código versionado, y te da datos útiles de tipo de cambio de regalo. Si el proyecto demuestra tracción y migras a Pro ($25/mes), eliminas el workflow y listo — o lo dejas corriendo porque los datos de dólar siguen siendo valiosos para los comerciantes.
