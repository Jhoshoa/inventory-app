import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Phone:
    number: str

    def __post_init__(self):
        cleaned = re.sub(r"[\s\+\-\(\)]", "", self.number)
        if not re.match(r"^\d{7,15}$", cleaned):
            raise ValueError(f"Teléfono inválido: {self.number}")
