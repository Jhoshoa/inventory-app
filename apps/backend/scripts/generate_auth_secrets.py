"""Genera los secretos de Postgres y de Supabase Auth para un servidor nuevo.

    python3 apps/backend/scripts/generate_auth_secrets.py

Imprime las lineas para pegar en las variables de Dokploy (o en .env). Solo usa la
libreria estandar: corre en el VPS sin instalar nada. Cada vez genera valores
nuevos; con --jwt-secret reusa uno existente y solo vuelve a firmar las claves.

Cambiar JWT_SECRET cierra todas las sesiones y obliga a regenerar las dos claves.
"""

import argparse
import base64
import hashlib
import hmac
import json
import secrets
import time

TEN_YEARS = 10 * 365 * 24 * 60 * 60


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def sign_role_key(role: str, jwt_secret: str, *, issued_at: int | None = None) -> str:
    """La clave que Supabase llama anon o service_role: un JWT HS256 firmado con JWT_SECRET."""
    now = int(time.time()) if issued_at is None else issued_at
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64(json.dumps({"role": role, "iss": "supabase", "iat": now, "exp": now + TEN_YEARS}, separators=(",", ":")).encode())
    signature = hmac.new(jwt_secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64(signature)}"


def generate(jwt_secret: str | None = None) -> dict[str, str]:
    secret = jwt_secret or secrets.token_hex(40)
    return {
        # Solo letras y numeros: va dentro de DATABASE_URL sin escapar nada.
        "POSTGRES_PASSWORD": secrets.token_hex(24),
        "JWT_SECRET": secret,
        "SUPABASE_ANON_KEY": sign_role_key("anon", secret),
        "SUPABASE_SERVICE_ROLE_KEY": sign_role_key("service_role", secret),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--jwt-secret", help="reusar este JWT_SECRET en vez de crear uno")
    args = parser.parse_args()
    values = generate(args.jwt_secret)
    if args.jwt_secret:
        values.pop("POSTGRES_PASSWORD")
    print("# Guardalos solo en Dokploy (o en .env). No los subas al repositorio.")
    for name, value in values.items():
        print(f"{name}={value}")


if __name__ == "__main__":
    main()
