# Postgres de la app y de Supabase Auth. Es la imagen de Supabase porque ya trae el
# rol y las extensiones que Auth necesita (la misma version que en su nube).
FROM supabase/postgres:17.6.1.136
COPY roles.sql /docker-entrypoint-initdb.d/init-scripts/99-roles.sql
