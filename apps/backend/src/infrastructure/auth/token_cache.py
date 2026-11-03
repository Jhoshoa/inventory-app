import hashlib
import time
from collections import OrderedDict
from collections.abc import Callable
from threading import Lock

from src.infrastructure.auth.jwt_utils import unverified_claims

DEFAULT_TTL_SECONDS = 60.0
FALLBACK_TTL_SECONDS = 30.0


class TokenCache:
    """Cache en memoria (por proceso) de tokens ya validados contra Supabase.

    Validar un access token implica una llamada de red a Supabase Auth en cada
    request. Cachear el resultado unos segundos evita esa latencia sin cambiar
    el modelo de seguridad: el usuario y la tienda se siguen consultando en la
    base de datos en cada request. Lo unico que se retrasa es la revocacion de
    un token (logout, cambio de contrasena): como maximo `ttl_seconds` en los
    otros workers; en el worker que atiende el logout se invalida al instante.
    """

    def __init__(
        self,
        *,
        ttl_seconds: float = DEFAULT_TTL_SECONDS,
        max_entries: int = 2048,
        clock: Callable[[], float] = time.monotonic,
        wall_clock: Callable[[], float] = time.time,
    ):
        self._ttl_seconds = ttl_seconds
        self._max_entries = max_entries
        self._clock = clock
        self._wall_clock = wall_clock
        self._entries: OrderedDict[str, tuple[float, dict]] = OrderedDict()
        self._lock = Lock()

    @staticmethod
    def _key(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def get(self, token: str) -> dict | None:
        key = self._key(token)
        now = self._clock()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            expires_at, payload = entry
            if now >= expires_at:
                del self._entries[key]
                return None
            return dict(payload)

    def set(self, token: str, payload: dict) -> None:
        ttl = self._ttl_for(token)
        if ttl <= 0:
            return
        key = self._key(token)
        now = self._clock()
        with self._lock:
            self._entries[key] = (now + ttl, dict(payload))
            self._entries.move_to_end(key)
            while len(self._entries) > self._max_entries:
                self._entries.popitem(last=False)

    def invalidate(self, token: str) -> None:
        with self._lock:
            self._entries.pop(self._key(token), None)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def _ttl_for(self, token: str) -> float:
        claims = unverified_claims(token)
        exp = claims.get("exp") if claims else None
        if not isinstance(exp, (int, float)):
            return min(self._ttl_seconds, FALLBACK_TTL_SECONDS)
        return min(self._ttl_seconds, exp - self._wall_clock())


access_token_cache = TokenCache()
