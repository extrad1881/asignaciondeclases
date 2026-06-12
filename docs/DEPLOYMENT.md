# Despliegue

## Supabase Cloud

1. Crea un proyecto en Supabase Cloud.
2. Copia `Project URL`, `anon key` y `service_role key`.
3. Vincula el proyecto local:

```bash
supabase link --project-ref TU_PROJECT_REF
```

4. Aplica migraciones:

```bash
supabase db push
```

5. Genera tipos:

```bash
npm run supabase:types
```

6. Importa datos con service role:

```bash
npm run import:datos
```

7. En Authentication, valida que Email Auth esté activo y que RLS permanezca habilitado en las tablas públicas.

## Vercel

1. Conecta el repositorio a Vercel.
2. Configura variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` solo debe existir en entornos seguros de servidor. No la expongas en componentes cliente.

3. Build command:

```bash
npm run build
```

4. Start command:

```bash
npm run start
```

5. Agrega la URL de Vercel a los redirect URLs permitidos de Supabase Auth.

## Checklist

- RLS activo en todas las tablas de negocio.
- Migraciones aplicadas sin errores.
- Tipos generados después de cada cambio de base.
- Variables de entorno separadas por ambiente.
- `SUPABASE_SERVICE_ROLE_KEY` usada solo en scripts o server runtime.
