"""E15: la API guardaba (commit) despues de responder.

La sesion se cierra al salir de `get_db_session` (una dependencia con `yield`). Con el
alcance por defecto ("request"), FastAPI corre esa salida despues de enviar la
respuesta, asi que una lectura hecha justo despues de escribir podia traer lo de antes.
Con `scope="function"` el commit pasa al terminar el endpoint, antes de responder.
"""

from fastapi.routing import APIRoute

from src.main import app
from src.presentation.dependencies import get_db_session


def _session_scopes(dependant, found: list[str | None]) -> list[str | None]:
    for sub in dependant.dependencies:
        if sub.call is get_db_session:
            found.append(sub.scope)
        _session_scopes(sub, found)
    return found


def test_every_route_commits_before_responding():
    checked = 0
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        scopes = _session_scopes(route.dependant, [])
        assert all(scope == "function" for scope in scopes), f"{route.path}: {scopes}"
        checked += len(scopes)
    assert checked > 0
