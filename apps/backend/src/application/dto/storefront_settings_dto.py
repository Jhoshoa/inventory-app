import re
from typing import Literal
from urllib.parse import parse_qs, urlparse
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from src.domain.entities.store import Store

_TIME_RE = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
_INSTAGRAM_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")
_TIKTOK_RE = re.compile(r"^[A-Za-z0-9._]{2,24}$")
_FACEBOOK_RE = re.compile(r"^(?:[A-Za-z0-9.\-]{3,80}|profile\.php\?id=[0-9]{5,20})$")
# Solo links de Google Maps: el catalogo publico no debe servir de redirector
# a cualquier sitio que el dueno (o alguien con su sesion) escriba.
_MAPS_HOSTS = {"maps.app.goo.gl", "goo.gl", "maps.google.com", "www.google.com", "google.com"}

DAYS_IN_WEEK = 7
MAX_FEATURED_PRODUCTS = 10


def _blank_to_none(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None


def _social_handle(value: str, hosts: set[str]) -> tuple[str, str]:
    """Separa un link de red social de un usuario escrito a mano.

    Devuelve (handle, query) — el handle sin "@" ni barras. Acepta
    "@tienda", "tienda", "instagram.com/tienda" o el link completo.
    """
    raw = value.strip()
    candidate = raw if "://" in raw else f"https://{raw}"
    parsed = urlparse(candidate)
    host = (parsed.hostname or "").lower()
    if host in hosts:
        path = parsed.path.strip("/").split("/")[0] if parsed.path.strip("/") else ""
        return path.lstrip("@"), parsed.query
    if "/" in raw or "://" in raw:
        raise ValueError("invalid")
    return raw.lstrip("@"), ""


class StorefrontDayHoursDTO(BaseModel):
    is_open: bool = False
    opens_at: str | None = None
    closes_at: str | None = None

    @field_validator("opens_at", "closes_at")
    @classmethod
    def validate_time(cls, v: str | None) -> str | None:
        v = _blank_to_none(v)
        if v is not None and not _TIME_RE.match(v):
            raise ValueError("La hora debe tener el formato HH:MM, ej. 08:30")
        return v

    @model_validator(mode="after")
    def validate_range(self) -> "StorefrontDayHoursDTO":
        if not self.is_open:
            # Un dia cerrado no guarda horas: evita mostrar un horario viejo.
            self.opens_at = None
            self.closes_at = None
            return self
        if self.opens_at is None or self.closes_at is None:
            raise ValueError("Indica la hora de apertura y de cierre de cada dia abierto")
        if self.opens_at == self.closes_at:
            raise ValueError("La hora de apertura y de cierre no pueden ser iguales")
        return self


class StorefrontSettingsDTO(BaseModel):
    """Ajustes del catalogo publico que no necesitan columna propia.

    Todo lo de aca es publico por naturaleza (el dueno lo escribe para que lo
    vean sus clientes), asi que el catalogo lo expone tal cual.
    """

    announcement_enabled: bool = False
    announcement_text: str | None = Field(default=None, max_length=140)
    show_featured: bool = True
    show_payment: bool = True
    show_contact: bool = True
    stock_display: Literal["all", "out_of_stock"] = "all"
    hide_out_of_stock: bool = False
    default_sort: Literal["name", "price_asc", "price_desc"] = "name"
    pickup_enabled: bool = True
    delivery_enabled: bool = False
    address: str | None = Field(default=None, max_length=200)
    maps_url: str | None = Field(default=None, max_length=300)
    facebook: str | None = Field(default=None, max_length=120)
    instagram: str | None = Field(default=None, max_length=120)
    tiktok: str | None = Field(default=None, max_length=120)
    # Lunes primero. None = el dueno no cargo horario (no se muestra).
    hours: list[StorefrontDayHoursDTO] | None = None
    # Productos del carrusel, en el orden elegido. Vacio = productos en oferta.
    featured_product_ids: list[UUID] = Field(default_factory=list)

    @field_validator("announcement_text", "address", mode="before")
    @classmethod
    def strip_text(cls, v: str | None) -> str | None:
        return _blank_to_none(v) if isinstance(v, str) or v is None else v

    @field_validator("maps_url", mode="before")
    @classmethod
    def validate_maps_url(cls, v: str | None) -> str | None:
        v = _blank_to_none(v) if isinstance(v, str) or v is None else v
        if v is None:
            return None
        candidate = v if "://" in v else f"https://{v}"
        parsed = urlparse(candidate)
        host = (parsed.hostname or "").lower()
        path = parsed.path or ""
        is_maps = host in {"maps.app.goo.gl", "maps.google.com"} or (
            host in _MAPS_HOSTS and path.startswith("/maps")
        )
        if parsed.scheme not in {"http", "https"} or not is_maps:
            raise ValueError("Pega el link que te da Google Maps al tocar Compartir")
        return parsed._replace(scheme="https").geturl()

    @field_validator("instagram", mode="before")
    @classmethod
    def validate_instagram(cls, v: str | None) -> str | None:
        v = _blank_to_none(v) if isinstance(v, str) or v is None else v
        if v is None:
            return None
        try:
            handle, _ = _social_handle(v, {"instagram.com", "www.instagram.com"})
        except ValueError:
            handle = ""
        if not _INSTAGRAM_RE.match(handle):
            raise ValueError("Escribe tu usuario de Instagram, ej. @mitienda")
        return handle

    @field_validator("tiktok", mode="before")
    @classmethod
    def validate_tiktok(cls, v: str | None) -> str | None:
        v = _blank_to_none(v) if isinstance(v, str) or v is None else v
        if v is None:
            return None
        try:
            handle, _ = _social_handle(v, {"tiktok.com", "www.tiktok.com"})
        except ValueError:
            handle = ""
        if not _TIKTOK_RE.match(handle):
            raise ValueError("Escribe tu usuario de TikTok, ej. @mitienda")
        return handle

    @field_validator("facebook", mode="before")
    @classmethod
    def validate_facebook(cls, v: str | None) -> str | None:
        v = _blank_to_none(v) if isinstance(v, str) or v is None else v
        if v is None:
            return None
        try:
            handle, query = _social_handle(
                v, {"facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "web.facebook.com"}
            )
        except ValueError:
            handle, query = "", ""
        if handle == "profile.php":
            profile_id = parse_qs(query).get("id", [""])[0]
            handle = f"profile.php?id={profile_id}"
        if not _FACEBOOK_RE.match(handle):
            raise ValueError("Pega el link de tu pagina de Facebook, ej. facebook.com/mitienda")
        return handle

    @field_validator("hours")
    @classmethod
    def validate_hours(cls, v: list[StorefrontDayHoursDTO] | None) -> list[StorefrontDayHoursDTO] | None:
        if v is None:
            return None
        if len(v) != DAYS_IN_WEEK:
            raise ValueError("El horario debe tener los 7 dias de la semana")
        if not any(day.is_open for day in v):
            # Todo cerrado equivale a "sin horario": no se muestra "Cerrado" los 7 dias.
            return None
        return v

    @field_validator("featured_product_ids")
    @classmethod
    def validate_featured(cls, v: list[UUID]) -> list[UUID]:
        unique = list(dict.fromkeys(v))
        if len(unique) > MAX_FEATURED_PRODUCTS:
            raise ValueError(f"Puedes destacar hasta {MAX_FEATURED_PRODUCTS} productos")
        return unique

    @model_validator(mode="after")
    def validate_announcement(self) -> "StorefrontSettingsDTO":
        if self.announcement_enabled and not self.announcement_text:
            raise ValueError("Escribe el texto de la cinta de anuncio o desactivala")
        return self


def storefront_settings_of(store: Store) -> StorefrontSettingsDTO:
    """Ajustes guardados de la tienda, con los valores por defecto para lo que falte."""
    try:
        return StorefrontSettingsDTO.model_validate(store.storefront_settings or {})
    except ValueError:
        # Un JSON guardado que ya no valida (cambio de reglas) no debe tumbar
        # el catalogo: se usa la configuracion por defecto.
        return StorefrontSettingsDTO()
