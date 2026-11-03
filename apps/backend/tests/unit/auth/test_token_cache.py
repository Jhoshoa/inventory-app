import base64
import json

from src.infrastructure.auth.jwt_utils import unverified_claims
from src.infrastructure.auth.token_cache import TokenCache


def jwt_with(claims: dict) -> str:
    body = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    return f"cabecera.{body}.firma"


class FakeClock:
    def __init__(self, now: float = 1_000_000.0):
        self.now = now

    def __call__(self) -> float:
        return self.now


def make_cache(clock: FakeClock, **kwargs) -> TokenCache:
    return TokenCache(clock=clock, wall_clock=clock, **kwargs)


def test_unverified_claims_reads_the_payload():
    assert unverified_claims(jwt_with({"exp": 10, "iat": 5})) == {"exp": 10, "iat": 5}


def test_unverified_claims_returns_none_for_malformed_tokens():
    assert unverified_claims("no-es-un-jwt") is None
    assert unverified_claims("a.%%%.c") is None
    assert unverified_claims(f"a.{base64.urlsafe_b64encode(b'[1,2]').decode()}.c") is None


def test_cached_payload_is_returned_until_the_ttl_expires():
    clock = FakeClock()
    cache = make_cache(clock, ttl_seconds=60)
    token = jwt_with({"exp": clock.now + 3600})
    cache.set(token, {"id": "u1"})

    assert cache.get(token) == {"id": "u1"}
    clock.now += 59
    assert cache.get(token) == {"id": "u1"}
    clock.now += 2
    assert cache.get(token) is None


def test_ttl_never_outlives_the_token_itself():
    clock = FakeClock()
    cache = make_cache(clock, ttl_seconds=60)
    token = jwt_with({"exp": clock.now + 10})
    cache.set(token, {"id": "u1"})

    clock.now += 11

    assert cache.get(token) is None


def test_an_already_expired_token_is_not_cached_at_all():
    clock = FakeClock()
    cache = make_cache(clock)
    token = jwt_with({"exp": clock.now - 1})

    cache.set(token, {"id": "u1"})

    assert cache.get(token) is None


def test_tokens_without_exp_get_a_short_fallback_ttl():
    clock = FakeClock()
    cache = make_cache(clock, ttl_seconds=60)
    cache.set("opaco", {"id": "u1"})

    clock.now += 29
    assert cache.get("opaco") == {"id": "u1"}
    clock.now += 2
    assert cache.get("opaco") is None


def test_invalidate_removes_the_token_immediately():
    clock = FakeClock()
    cache = make_cache(clock)
    token = jwt_with({"exp": clock.now + 3600})
    cache.set(token, {"id": "u1"})

    cache.invalidate(token)

    assert cache.get(token) is None


def test_callers_cannot_mutate_the_cached_payload():
    clock = FakeClock()
    cache = make_cache(clock)
    token = jwt_with({"exp": clock.now + 3600})
    cache.set(token, {"id": "u1"})

    cache.get(token)["id"] = "otro"

    assert cache.get(token) == {"id": "u1"}


def test_oldest_entries_are_evicted_when_full():
    clock = FakeClock()
    cache = make_cache(clock, max_entries=2)
    tokens = [jwt_with({"exp": clock.now + 3600, "n": n}) for n in range(3)]
    for index, token in enumerate(tokens):
        cache.set(token, {"id": index})

    assert cache.get(tokens[0]) is None
    assert cache.get(tokens[1]) == {"id": 1}
    assert cache.get(tokens[2]) == {"id": 2}
