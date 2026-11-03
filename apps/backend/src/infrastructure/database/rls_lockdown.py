from sqlalchemy import text

# En Supabase, toda tabla de `public` queda expuesta por su API REST publica
# (PostgREST) a quien tenga la clave `anon`, que esta pensada para ser publica:
# se podia leer (y escribir) usuarios, ventas y productos de todas las tiendas.
# Este backend nunca usa esa API: se conecta como `postgres` (que ignora RLS), asi
# que se cierra todo. Se ejecuta al final de CADA `alembic upgrade` (ver
# alembic/env.py), para que las tablas de migraciones futuras queden protegidas
# sin tener que acordarse de hacerlo en cada una. Es idempotente.
LOCK_DOWN_PUBLIC_SCHEMA_SQL = """
DO $$
DECLARE
    t record;
    r text;
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tableowner = current_user AND NOT rowsecurity
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;

    FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
            EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
        END IF;
    END LOOP;
END $$;
"""


def lock_down_public_schema(connection) -> None:
    """Activa RLS en las tablas de `public` y le quita sus permisos a anon/authenticated.

    Solo aplica a PostgreSQL; en SQLite (tests, desarrollo local) no hace nada.
    """
    if connection.dialect.name == "postgresql":
        connection.execute(text(LOCK_DOWN_PUBLIC_SCHEMA_SQL))
