-- Se ejecuta una sola vez, al crear el volumen de datos. La imagen supabase/postgres
-- trae los roles internos de Supabase sin contrasena; Supabase Auth (GoTrue) se
-- conecta como supabase_auth_admin y crea su esquema `auth` al arrancar.
-- La API se conecta como postgres. Ningun otro rol queda con contrasena, asi que
-- no pueden entrar por la red.
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
