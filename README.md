# Sistema de asignación de clases

Proyecto Next.js + Supabase para coordinación académica: grupos, materias, docentes, horarios, validaciones, RLS y auditoría.

## Datos detectados

`datos/DB_Coordinacion_Academica.xlsx` contiene:

- `base_clases`: `carrera`, `cuatrimestre`, `materia`, `perfil_requerido`, `COORDINADOR`.
- `base_docentes`: `nombre`, `perfiles_aptos`, `link_expediente`, `EMAIL_DOCENTE`, `coordinador`, `horas_maximas`.

`assets` contiene las plantillas visuales de horario y un workbook de aulas. Las imágenes se copiaron a `public/schedule-assets`.

## Instalación local

```bash
npm install
copy .env.local.example .env.local
supabase start
supabase db reset
```

Copia las llaves que muestra `supabase status` en `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Importa los datos:

```bash
npm run import:datos
```

Ejecuta la app:

```bash
npm run dev
```

Credenciales demo locales:

- `admin@local.test` / `Admin123!`
- `coordinador@local.test` / `Coord123!`

## Comandos

```bash
npm run dev
npm run build
npm run typecheck
npm run test
npm run import:datos
npm run supabase:types
```

## Alcance funcional

- Login con Supabase Auth.
- Roles `admin` y `coordinator`.
- Dashboard administrativo.
- Gestión visible de docentes, materias, carreras, coordinadores y grupos.
- Creación de grupos por ciclo, carrera, cuatrimestre, modalidad y turno.
- Materias del grupo con opción de incluir otros cuatrimestres.
- Asignación de docentes a materias y bloques.
- Plantillas separadas para escolarizado, modular, virtual modular y maestrías.
- RLS y triggers para permisos, perfiles, horas máximas y choques de horario.
- Auditoría en cambios importantes.

## Reglas de base de datos

La migración en `supabase/migrations/202606050001_initial_schema.sql` implementa:

- Primary keys, foreign keys, índices y constraints.
- RLS por rol, carrera y docente.
- Validación de modalidad/turno.
- Validación de perfil requerido.
- Validación de horas máximas.
- Validación de choque de horario por docente.
- Auditoría en `audit_logs`.

## Despliegue

Consulta [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para Supabase Cloud y Vercel.
