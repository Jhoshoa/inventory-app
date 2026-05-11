from dataclasses import dataclass
import re


@dataclass(frozen=True)
class SKU:
    code: str

    def __post_init__(self):
        if not re.match(r"^[A-Z0-9\-]{4,20}$", self.code):
            raise ValueError(f"SKU inválido: {self.code}")
