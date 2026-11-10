from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, computed_field

from src.application.dto.storefront_settings_dto import StorefrontSettingsDTO
from src.domain.entities.product import Product, product_discount_per_unit


class PublicStorefrontDTO(BaseModel):
    """Datos publicos de una tienda para su catalogo (Nivel 1/2).

    Nunca incluye datos internos (billing, telefono de contacto interno,
    direccion exacta) — solo lo que un cliente final necesita ver.
    """

    name: str
    tier: str
    logo_url: str | None = None
    banner_url: str | None = None
    color_primary: str | None = None
    color_secondary: str | None = None
    description: str | None = None
    whatsapp: str | None = None
    payment_qr_url: str | None = None
    payment_instructions: str | None = None
    # Zona horaria de la tienda: con ella el catalogo dice "Abierto ahora".
    timezone: str = "America/La_Paz"
    settings: StorefrontSettingsDTO = Field(default_factory=StorefrontSettingsDTO)


class PublicStorefrontProductDTO(BaseModel):
    """Producto expuesto publicamente: nunca incluye costo, SKU interno ni
    stock exacto — solo disponibilidad, para no revelar inventario a la
    competencia (ver docs/mejoras/06-storefront-publico-por-tienda.md)."""

    id: UUID
    name: str
    price: Decimal
    unit: str
    photo_url: str | None
    available: bool
    low_stock: bool
    category: str | None = None
    category_id: UUID | None = None
    discount_type: str | None = None
    discount_value: Decimal = Decimal(0)
    discount_ends_at: datetime | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def effective_price(self) -> Decimal:
        return self.price - product_discount_per_unit(
            self.price, self.discount_type, self.discount_value, self.discount_ends_at
        )

    @staticmethod
    def from_product(product: Product, *, show_low_stock: bool = True) -> "PublicStorefrontProductDTO":
        # "Pocas unidades" es un umbral fijo, no el stock real — el objetivo
        # es dar una senal de urgencia sin revelar cantidades exactas a la
        # competencia (ver docs/mejoras/06-storefront-publico-por-tienda.md).
        LOW_STOCK_THRESHOLD = 3
        return PublicStorefrontProductDTO(
            id=product.id,
            name=product.name,
            price=product.price,
            unit=product.unit,
            photo_url=product.photo_url,
            available=product.stock > 0,
            # La tienda puede elegir no mostrar "Ultimas unidades": ni se envia.
            low_stock=show_low_stock and 0 < product.stock <= LOW_STOCK_THRESHOLD,
            category=product.category,
            category_id=product.category_id,
            discount_type=product.discount_type if product.is_discount_active else None,
            discount_value=product.discount_value if product.is_discount_active else Decimal(0),
            discount_ends_at=product.discount_ends_at,
        )


class PublicStorefrontProductListDTO(BaseModel):
    items: list[PublicStorefrontProductDTO]
    total: int
    limit: int
    offset: int


class PublicStorefrontFeaturedDTO(BaseModel):
    items: list[PublicStorefrontProductDTO]
    source: str


class PublicStorefrontCategoryDTO(BaseModel):
    id: UUID
    name: str
    product_count: int
