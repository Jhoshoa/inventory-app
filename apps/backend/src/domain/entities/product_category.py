from dataclasses import dataclass
from uuid import UUID, uuid4


@dataclass
class ProductCategory:
    id: UUID
    store_id: UUID
    name: str
    sku_prefix: str
    next_sku_number: int = 1
    is_active: bool = True

    def __post_init__(self) -> None:
        self.name = self.name.strip()
        self.sku_prefix = self.sku_prefix.strip().upper()
        if not self.name:
            raise ValueError("El nombre de la categoria es requerido")
        if not self.sku_prefix:
            raise ValueError("El prefijo SKU es requerido")
        if not self.sku_prefix.isalnum():
            raise ValueError("El prefijo SKU solo puede tener letras y numeros")
        if self.next_sku_number < 1:
            raise ValueError("El contador SKU debe ser mayor a cero")

    @staticmethod
    def create(*, store_id: UUID, name: str, sku_prefix: str) -> "ProductCategory":
        return ProductCategory(
            id=uuid4(),
            store_id=store_id,
            name=name,
            sku_prefix=sku_prefix,
        )

    def update(self, *, name: str | None = None, sku_prefix: str | None = None) -> None:
        if name is not None:
            self.name = name.strip()
        if sku_prefix is not None:
            self.sku_prefix = sku_prefix.strip().upper()
        self.__post_init__()

    def deactivate(self) -> None:
        self.is_active = False

    def format_next_sku(self) -> str:
        return f"{self.sku_prefix}{self.next_sku_number:06d}"
