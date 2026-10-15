# M.O.T.H.E.R AV_2663 — arquitectura con adapter

1. Crear proyecto Supabase y ejecutar `supabase/schema.sql` UNA SOLA VEZ en un proyecto nuevo.
2. Activar Email signup y Confirm email; configurar URL / Redirect URLs y SMTP para correos reales.
3. Publicar la carpeta COMPLETA (index.html, js/ y supabase/ opcional) en un servidor HTTPS como GitHub Pages. No abrir solo index.html separado de la carpeta `js/`.
4. En el login seleccionar CONFIGURAR SUPABASE, introducir Project URL y publishable/anon key. NUNCA service_role.
5. Registrar y confirmar la cuenta administradora inicial; aprobar otros correos desde whitelist.

`js/supabase-adapter.js`: auth, perfiles, CRUD, adjuntos y whitelist.
`js/app.js`: experiencia visual y eventos del terminal.
La seguridad real está en las políticas RLS de `supabase/schema.sql`; un adapter JavaScript no sustituye RLS.

IMPORTANTE: código refactorizado y validado sintácticamente; no ha sido probado contra un proyecto Supabase real.
