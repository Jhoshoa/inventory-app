-- Solo para docker-compose.local.yml. La imagen supabase/postgres crea los roles
-- internos sin contrasena; Supabase Auth se conecta como supabase_auth_admin.
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
