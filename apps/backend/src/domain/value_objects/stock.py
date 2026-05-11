from dataclasses import dataclass


@dataclass(frozen=True)
class Stock:
    quantity: int
    min_stock: int = 5

    def __post_init__(self):
        if self.quantity < 0:
            raise ValueError("El stock no puede ser negativo")
        if self.min_stock < 0:
            raise ValueError("El stock mínimo no puede ser negativo")

    def is_low(self) -> bool:
        return self.quantity <= self.min_stock

    def reduce(self, quantity: int) -> "Stock":
        new_qty = self.quantity - quantity
        if new_qty < 0:
            raise ValueError(f"Stock insuficiente: {self.quantity} < {quantity}")
        return Stock(new_qty, self.min_stock)
