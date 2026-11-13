# Expone Supabase Auth en /auth/v1 (la ruta que usa el SDK de Supabase) y sirve las
# plantillas de correo a Auth. Se construye desde la raiz del repo (ver .dockerignore).
FROM nginx:1.29-alpine
COPY docker/auth-gateway/nginx.conf /etc/nginx/conf.d/default.conf
COPY supabase/email-templates/ /usr/share/nginx/email-templates/
