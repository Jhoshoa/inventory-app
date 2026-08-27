import time
from collections import deque
from threading import Lock

from src.config.settings import settings

# Rate limiter simple en memoria, por proceso. Suficiente mientras el backend
# corre en una sola instancia. Si se escala a multiples instancias/replicas,
# reemplazar por un backend compartido (Redis) sin cambiar la firma publica
# de `is_allowed`.


class InMemoryRateLimiter:
    def __init__(self, *, max_requests: int, window_seconds: float):
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def is_allowed(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self._window_seconds:
                hits.popleft()
            if len(hits) >= self._max_requests:
                return False
            hits.append(now)
            return True

    def reset(self) -> None:
        """Limpia todo el estado acumulado. Uso exclusivo de tests."""
        with self._lock:
            self._hits.clear()


# 3 solicitudes cada 10 minutos por IP: suficiente para un formulario de
# contacto legitimo (incluyendo reintentos) y disuade a bots simples.
lead_rate_limiter = InMemoryRateLimiter(max_requests=3, window_seconds=600)

# 10 intentos cada 10 minutos por IP: el endpoint publico de aceptar
# invitacion recibe un token en texto plano, asi que se limita para
# dificultar intentos de fuerza bruta sobre tokens invalidos/expirados.
invitation_accept_rate_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=600)

# Login/registro por IP: limite bajo porque son los endpoints tipicos de
# fuerza bruta de credenciales. Configurable via RATE_LIMIT_LOGIN_*.
login_rate_limiter = InMemoryRateLimiter(
    max_requests=settings.RATE_LIMIT_LOGIN_MAX,
    window_seconds=settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
)

# Catalogo publico por tienda (storefront): dos limites independientes.
# Por IP, para frenar un scraper/bot puntual; por slug, para que ninguna
# tienda pueda consumir la cuota de las demas ni ser tumbada por trafico
# dirigido solo a ella. Generosos porque es trafico de navegacion legitima
# de clientes finales, no un formulario ocasional.
storefront_ip_rate_limiter = InMemoryRateLimiter(max_requests=60, window_seconds=60)
storefront_slug_rate_limiter = InMemoryRateLimiter(max_requests=300, window_seconds=60)

# Solicitudes de contacto ("Solicitar" en el catalogo publico): igual criterio
# que el formulario de leads, un cliente legitimo no manda mas de un par por
# minuto ni aunque reintente.
storefront_request_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=600)

# Red de seguridad generosa para el resto de la API autenticada, por IP: no
# busca limitar uso normal, solo frenar un cliente (o bot) que tumbe el
# servicio para todos. Configurable via RATE_LIMIT_GLOBAL_*.
global_rate_limiter = InMemoryRateLimiter(
    max_requests=settings.RATE_LIMIT_GLOBAL_MAX,
    window_seconds=settings.RATE_LIMIT_GLOBAL_WINDOW_SECONDS,
)
