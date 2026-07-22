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

4. Configura las llaves locales sin imprimir secretos:

```bash
npm run env:local
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
npm run test:security
npm run test:e2e
npm run typecheck
npm run lint
```

`test:integration` crea datos temporales con prefijos `TST_RLS_`, `TST_AUDIT_`, `TST_COHORT_` y `TST_SECURITY_`. Valida RLS, auditoría, automatización de cohortes, registro cerrado, aprovisionamiento seguro y reglas críticas de asignación; después limpia los registros temporales.

Las pruebas E2E usan Playwright con Chromium contra la aplicación y Supabase locales. Instala el navegador una vez y mantén Supabase iniciado:

```bash
npx playwright install chromium
supabase start
npm run test:e2e
```

La suite comprueba redirección de rutas protegidas, errores de acceso, permisos del coordinador, creación real de ciclos/cohortes y procesamiento de imágenes con Next.js. Los registros E2E llevan nombres únicos y se eliminan al terminar.

La activación real de ciclos se omite por defecto para no avanzar cohortes existentes. Ejecútala solo después de `supabase db reset` o en una base desechable:

```powershell
$env:PLAYWRIGHT_CYCLE_AUTOMATION="true"
npm run test:e2e
```

Antes de entregar cambios de base de datos ejecuta también:

```bash
supabase db lint --level error
npm run validate:migrations
```

El workflow de CI repite validaciones estáticas, build, reinicio local de Supabase, lint de PostgreSQL, pruebas de integración y la suite E2E en Chromium.

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
