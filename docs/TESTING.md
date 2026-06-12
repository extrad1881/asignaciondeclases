# Pruebas y backups locales

## Levantar Supabase local

1. Instala dependencias:

```bash
npm install
```

2. Inicia Supabase local:

```bash
supabase start
```

3. Aplica migraciones y semilla:

```bash
supabase db reset
```

4. Revisa las llaves locales:

```bash
supabase status
```

El archivo `.env.local` debe incluir:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key de supabase status>
SUPABASE_SERVICE_ROLE_KEY=<secret key de supabase status>
```

Los tests de integracion intentan leer `.env.local`. Si la publishable key no esta configurada, intentan resolverla desde `supabase status`.

## Comandos de prueba

```bash
npm run test
npm run test:integration
npm run test:rls
npm run test:audit
npm run typecheck
npm run lint
```

`test:integration` crea datos temporales con prefijos `TST_RLS_` y `TST_AUDIT_`, valida RLS, auditoria y reglas criticas de asignacion, y luego limpia los registros principales.

## Backup local

Ejecuta:

```bash
npm run backup:db
```

El comando crea una carpeta en:

```text
backups/supabase/YYYYMMDD-HHMMSS
```

Tambien genera un ZIP junto a la carpeta. El backup incluye:

- `schema.sql`
- `data.sql`
- `roles.sql`
- `supabase/seed.sql`
- `supabase/config.toml`
- `supabase/migrations/`
- `README.txt` con fecha, comandos y advertencias

No copia `.env`, claves secretas ni archivos temporales. Aun asi, `data.sql` puede contener datos sensibles; no lo compartas sin revisarlo.
