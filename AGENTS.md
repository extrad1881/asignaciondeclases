# AGENTS.md

Next.js App Router + Supabase academic scheduling system (Coordinación Académica).
See [SKILL.md](SKILL.md) for comprehensive project guidance (domain model, validation specs, UI patterns, PR checklist, known debt).

## Quick start

```bash
npm install
supabase start
supabase db reset
# Copy keys from `supabase status` into .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...
npm run import:datos
npm run dev
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | `next build` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .` |
| `npm run test` | Vitest (assignment validation) |
| `npm run test:integration` | Vitest (all integration) |
| `npm run test:rls` | RLS-specific tests |
| `npm run test:audit` | Audit trigger tests |
| `npm run import:datos` | Seed from `datos/DB_Coordinacion_Academica.xlsx` |
| `npm run supabase:types` | Regenerate `types/supabase.ts` from local DB |

## Verification before delivery

**Minimum**: `npm run typecheck && npm run lint && npm run test && npm run build`

**Supabase changes** (migrations/triggers/RLS/seed):
`supabase db reset && npm run import:datos && npm run test:integration`

**RLS-specific**: also `npm run test:rls`
**Audit-specific**: also `npm run test:audit`

## Architecture

- **`lib/supabase/`**: `client.ts` (browser), `server.ts` (server with cookies), `admin.ts` (service role — server only, use sparingly)
- **`app/(dashboard)/actions/`**: Server Actions. `legacy.ts` re-exports all modules — **do not grow it**; put new actions in the appropriate module file.
- **`lib/validations/`**: pure validation functions (mirrored by DB triggers for critical rules)
- **`supabase/migrations/`**: create new timestamped migration files — never edit migrations already applied
- **Integration tests** create temp data with `TST_RLS_` / `TST_AUDIT_` prefixes

## Critical rules

- No `any` overrides (types/supabase.ts debt exists; generate real types instead)
- No service role client (`admin.ts` must never be imported in `"use client"` components)
- Every table needs RLS enabled with explicit policies
- Hard deletes of academic data are prohibited — prefer archiving (`active = false`)
- `SUPABASE_SERVICE_ROLE_KEY` must never reach client code, logs, or responses
- Never commit `.env`, `.env.local`, or real secrets

## Roles

- **admin**: full access
- **coordinator**: scoped to assigned careers and teachers

Every critical action must validate: session → role → active status → scope.

## Local credentials

- `admin@local.test` / `Admin123!`
- `coordinador@local.test` / `Coord123!`

## Conventions

- Path alias `@/` maps to root `./`
- Spanish UI text with proper accents (acción, página, asignación, etc.)
- Tailwind CSS, no inline styles
- Zod for Server Action input parsing
- TypeScript strict mode enabled
- ES module config files (`.mjs`)
