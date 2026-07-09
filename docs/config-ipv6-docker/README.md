# Habilitar IPv6 en Docker para conexión a Supabase

## Problema

El backend (`api`) no puede conectarse a la base de datos de Supabase.
El error en los logs es:

```
OSError: [Errno 101] Network is unreachable
```

## Causa raíz

El hostname de la base de datos de Supabase (`db.<project>.supabase.co`) **solo
resuelve a una dirección IPv6**. No tiene un registro A (IPv4).

```
> nslookup db.oxtqlhwspibhyohecsde.supabase.co
Address:  2600:1f18:5608:e002:77a2:8df8:9753:5d1b
```

Docker, por defecto, **no tiene IPv6 habilitado** en su red bridge. Los
contenedores solo tienen conectividad IPv4. Cuando asyncpg (dentro del
contenedor) resuelve el hostname a IPv6 e intenta conectarse, el stack de red
del contenedor no puede enrutar la conexión y devuelve `Network is unreachable`.

### Diagnóstico

Desde el VPS (fuera de Docker) estos comandos funcionan correctamente:

```bash
# Prueba de conectividad IPv6 al puerto del pooler (6543)
timeout 5 bash -c 'echo > /dev/tcp/db.oxtqlhwspibhyohecsde.supabase.co/6543' \
  && echo "CONECTADO" || echo "FALLÓ"

# Prueba de conectividad al puerto directo (5432)
nc -zv db.oxtqlhwspibhyohecsde.supabase.co 5432
```

Pero dentro de un contenedor Docker fallan porque Docker no enruta IPv6.

## Solución

Se requieren **dos cambios**:
1. Habilitar IPv6 en el daemon de Docker del VPS
2. Habilitar IPv6 en la red de Docker Compose (opcional pero necesario si el
   contenedor no usa la red `docker0` por defecto)

### Paso a paso

**1. Editar (o crear) `/etc/docker/daemon.json`:**

Agregar las opciones `ipv6` y `fixed-cidr-v6` al final del JSON (importante:
la coma va en la línea anterior, antes del nuevo campo).

Ejemplo con configuración existente (como en este proyecto):

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-address-pools": [
    {"base": "172.17.0.0/12", "size": 24},
    {"base": "192.168.0.0/16", "size": 24}
  ],
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64"
}
```

`2001:db8:1::/64` es un bloque reservado para documentación (RFC 3849) y no
entrará en conflicto con redes reales.

**2. Aplicar cambios (elegir una opción):**

- **Opción A (recomendada, sin downtime):** Recargar Docker sin reiniciar
  contenedores:

  ```bash
  sudo systemctl reload docker
  ```

  Verificar que Dokploy sigue en ejecución:

  ```bash
  docker ps | grep dokploy
  ```

  Si el `reload` no es suficiente (raro en Docker moderna), usar la Opción B.

- **Opción B (con downtime breve):** Reiniciar Docker completamente:

  ```bash
  sudo systemctl restart docker
  ```

  > **Advertencia:** Esto reinicia **todos** los contenedores, incluido el
  > de Dokploy. Dokploy se recupera solo. El downtime es de segundos.

**3. Verificar que Docker tiene IPv6 habilitado:**

```bash
docker run --rm alpine ip addr show
```

Debería mostrar una interfaz con una dirección en el rango
`2001:db8:1::/64`.

**4. Habilitar IPv6 en la red de Docker Compose:**

El paso 1 activa IPv6 en la red `docker0` (usada por `docker run`). Pero
Docker Compose crea **su propia red bridge** (`<proyecto>_default`) que **no
hereda** el IPv6 del daemon automáticamente.

Para que los contenedores del `docker-compose.yml` tengan IPv6, agregar al
final del archivo:

```yaml
networks:
  default:
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.20.0.0/16
        - subnet: 2001:db8:2::/64
```

**5. Re-desplegar la aplicación con Dokploy o docker compose.**

Para que el cambio de red surta efecto, Docker Compose debe **recrear** los
contenedores (no solo reiniciarlos):

```bash
docker compose -f docker-compose.yml up -d --force-recreate
```

En Dokploy, con hacer redeploy es suficiente porque recrea los contenedores.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Downtime al reiniciar Docker | El reinicio dura segundos. Programar fuera de horario crítico |
| El rango `2001:db8:1::/64` está reservado para documentación y no colisiona con direcciones reales de Hostinger o internet | Usar este rango no causa conflictos de enrutamiento |
| Habilitar IPv6 podría tener implicaciones de seguridad si el firewall del VPS no filtra IPv6 | Verificar que `iptables`/`nftables` tenga reglas para IPv6 (ip6tables). Por defecto Docker las configura automáticamente |

## Alternativa no recomendada: `network_mode: host`

En lugar de habilitar IPv6 en Docker, se podría cambiar el servicio `api` a
`network_mode: host` en `docker-compose.yml`. Esto hace que el contenedor
comparta el stack de red del host (que sí tiene IPv6).

**No se recomienda** porque:
- El contenedor pierde aislamiento de red (acceso directo a todas las
  interfaces del host)
- No se pueden usar `ports` (se ignora el mapeo)
- La aplicación quedaría expuesta en `0.0.0.0:8001` sin la protección de
  `127.0.0.1`
- Menos portable entre entornos

## Referencias

- [Docker Docs: Enable IPv6](https://docs.docker.com/config/daemon/ipv6/)
- [Supabase: Connection Strings](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [RFC 3849 — IPv6 Address Prefix Reserved for Documentation](https://datatracker.ietf.org/doc/html/rfc3849)
