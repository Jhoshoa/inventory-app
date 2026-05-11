from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Price:
    value: Decimal
    currency: str = "Bs"

    def __post_init__(self):
        if self.value < 0:
            raise ValueError("El precio no puede ser negativo")

    def __mul__(self, quantity: int) -> "Price":
        return Price(self.value * quantity, self.currency)

    def __add__(self, other: "Price") -> "Price":
        if self.currency != other.currency:
            raise ValueError("Monedas diferentes")
        return Price(self.value + other.value, self.currency)
