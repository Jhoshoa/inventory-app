from types import SimpleNamespace

from src.infrastructure.database.rls_lockdown import (
    LOCK_DOWN_PUBLIC_SCHEMA_SQL,
    lock_down_public_schema,
)


class FakeConnection:
    def __init__(self, dialect_name: str):
        self.dialect = SimpleNamespace(name=dialect_name)
        self.executed: list[str] = []

    def execute(self, statement):
        self.executed.append(str(statement))


def test_postgres_gets_rls_enabled_and_public_roles_revoked():
    connection = FakeConnection("postgresql")

    lock_down_public_schema(connection)

    assert len(connection.executed) == 1
    sql = connection.executed[0]
    assert "ENABLE ROW LEVEL SECURITY" in sql
    assert "REVOKE ALL ON ALL TABLES IN SCHEMA public" in sql


def test_it_covers_the_two_roles_supabase_exposes_through_its_rest_api():
    assert "'anon'" in LOCK_DOWN_PUBLIC_SCHEMA_SQL
    assert "'authenticated'" in LOCK_DOWN_PUBLIC_SCHEMA_SQL


def test_it_only_touches_tables_that_still_need_it():
    # Idempotente: no vuelve a tocar tablas que ya tienen RLS ni tablas ajenas.
    assert "NOT rowsecurity" in LOCK_DOWN_PUBLIC_SCHEMA_SQL
    assert "tableowner = current_user" in LOCK_DOWN_PUBLIC_SCHEMA_SQL


def test_sqlite_is_left_alone():
    connection = FakeConnection("sqlite")

    lock_down_public_schema(connection)

    assert connection.executed == []
