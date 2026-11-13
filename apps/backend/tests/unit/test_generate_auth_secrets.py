import base64
import hashlib
import hmac
import json

from scripts.generate_auth_secrets import generate, sign_role_key


def _decode(part: str) -> dict:
    return json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))


def test_role_keys_are_hs256_jwts_signed_with_the_secret():
    token = sign_role_key("service_role", "s3cret", issued_at=1_700_000_000)
    header, payload, signature = token.split(".")
    assert _decode(header) == {"alg": "HS256", "typ": "JWT"}
    claims = _decode(payload)
    assert claims["role"] == "service_role"
    assert claims["iss"] == "supabase"
    assert claims["exp"] - claims["iat"] >= 9 * 365 * 24 * 3600
    expected = hmac.new(b"s3cret", f"{header}.{payload}".encode(), hashlib.sha256).digest()
    assert base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4)) == expected


def test_generate_makes_strong_url_safe_values_and_matching_keys():
    values = generate()
    assert len(values["POSTGRES_PASSWORD"]) == 48 and values["POSTGRES_PASSWORD"].isalnum()
    assert len(values["JWT_SECRET"]) == 80
    assert _decode(values["SUPABASE_ANON_KEY"].split(".")[1])["role"] == "anon"
    assert _decode(values["SUPABASE_SERVICE_ROLE_KEY"].split(".")[1])["role"] == "service_role"
    assert generate()["JWT_SECRET"] != values["JWT_SECRET"]


def test_reusing_a_secret_keeps_it():
    assert generate("existing-secret")["JWT_SECRET"] == "existing-secret"
