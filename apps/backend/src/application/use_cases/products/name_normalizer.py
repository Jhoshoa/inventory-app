def normalize_product_name(name: str) -> str:
    words = name.strip().split()
    normalized: list[str] = []
    for word in words:
        if any(char.isdigit() for char in word):
            normalized.append(word.lower())
        else:
            normalized.append(word.capitalize())
    return " ".join(normalized)
