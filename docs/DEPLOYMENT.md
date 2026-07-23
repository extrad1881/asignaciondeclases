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

7. En Authentication:

   - Mantén Email Auth activo para permitir el inicio de sesión.
   - Desactiva **Allow new users to sign up**. Los usuarios se aprovisionan únicamente desde el panel administrativo de la aplicación.
   - Configura una longitud mínima de 8 caracteres y exige mayúsculas, minúsculas y números.
   - Conserva RLS habilitado en todas las tablas públicas.

La configuración local equivalente está en `supabase/config.toml`. Esa configuración no modifica automáticamente un proyecto de Supabase Cloud: hay que replicarla en el Dashboard del ambiente desplegado.

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

6. Configura las funciones de Vercel en una región cercana a la región del proyecto de Supabase. La distancia entre ambos servicios se suma a cada consulta autenticada.

## Sesiones caducadas o revocadas

El proxy verifica la identidad con `getClaims()` y elimina automáticamente las cookies de Supabase cuando Auth devuelve `refresh_token_not_found` u otro error equivalente de rotación. El usuario vuelve a `/login` y puede iniciar sesión de nuevo sin quedar atrapado en una sesión inválida.

Este caso puede aparecer después de cerrar sesión en otro dispositivo, revocar sesiones, restaurar o cambiar el proyecto de Supabase, o conservar cookies de un despliegue anterior. Si ocurre antes de desplegar esta protección, elimina las cookies del sitio o prueba en una ventana privada.

La pantalla `/datos-incompletos` ejecuta la auditoría completa bajo demanda. El dashboard inicial no debe invocarla porque descarga catálogos y asignaciones completos; mantener esa separación evita tiempos de respuesta altos y timeouts en funciones serverless.

## Checklist

- RLS activo en todas las tablas de negocio.
- Migraciones aplicadas sin errores.
- Tipos generados después de cada cambio de base.
- Variables de entorno separadas por ambiente.
- `SUPABASE_SERVICE_ROLE_KEY` usada solo en scripts o server runtime.
- Registro público deshabilitado y Email Auth habilitado para usuarios existentes.
- No hay perfiles activos inesperados ni cuentas administrativas fuera del inventario autorizado.
- `supabase db lint --level error` termina sin hallazgos.
- `npm audit` reporta cero vulnerabilidades conocidas.
