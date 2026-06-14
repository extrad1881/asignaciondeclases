# SKILL.md — Agente de código para Sistema de Asignación de Clases

## Propósito de esta skill

Esta skill guía a cualquier agente de código que trabaje en este proyecto. Antes de modificar archivos, el agente debe entender que este sistema no es una app genérica: es una plataforma administrativa para Coordinación Académica, con reglas de negocio sensibles sobre docentes, carreras, materias, grupos, aulas, horarios, perfiles requeridos, permisos y auditoría.

El objetivo del agente no es solo “hacer que compile”, sino conservar la integridad académica, la seguridad de Supabase, las restricciones por rol y la trazabilidad de cambios.

---

## Resumen del proyecto

Sistema web de asignación de clases para Coordinación Académica.

Stack principal:

- Next.js App Router.
- React.
- TypeScript.
- Supabase Auth.
- Supabase Postgres.
- Supabase RLS.
- Triggers SQL para validaciones críticas.
- Tailwind CSS.
- Vitest.
- Scripts con `tsx`.
- Importación de datos desde Excel.
- Despliegue previsto en Supabase Cloud + Vercel.

Funcionalidades existentes:

- Login con Supabase Auth.
- Roles `admin` y `coordinator`.
- Dashboard administrativo.
- Gestión de docentes, materias, carreras, coordinadores y grupos.
- Creación de grupos por ciclo, carrera, cuatrimestre, modalidad y turno.
- Materias de grupo con opción de incluir materias externas u otros cuatrimestres.
- Asignación de docentes a materias y bloques.
- Plantillas de horario por modalidad y turno.
- Dashboard de datos incompletos.
- RLS por rol, carrera y docente.
- Triggers para choques de horario, perfiles, horas máximas y auditoría.
- Pruebas unitarias e integración.
- Script de importación de datos.
- Script de respaldo de base de datos.

---

## Reglas de oro para cualquier agente

1. No modifiques reglas críticas solo en frontend.
   - Las restricciones de seguridad y negocio deben vivir también en PostgreSQL, RLS, constraints, funciones o triggers.
   - El frontend puede prevenir errores, pero la base de datos debe impedirlos.

2. No uses `SUPABASE_SERVICE_ROLE_KEY` en cliente.
   - Solo puede usarse en código servidor.
   - Nunca debe llegar a componentes `"use client"`, navegador, logs públicos ni respuestas al usuario.

3. No confíes solo en visibilidad de UI.
   - Ocultar botones no es seguridad.
   - Toda acción sensible debe validar sesión, rol, usuario activo y alcance de datos.

4. No agregues cambios que rompan RLS.
   - Si agregas tablas nuevas, habilita RLS.
   - Si agregas acciones nuevas, crea políticas o funciones seguras.
   - Si agregas RPC, valida permisos dentro de SQL o desde una función segura.

5. No elimines datos académicos importantes sin trazabilidad.
   - Preferir `status = archived` o `active = false` sobre deletes duros.
   - Si el delete es necesario, debe quedar auditado.

6. No trabajes sobre `repomix-output.xml`.
   - Ese archivo solo representa el repositorio combinado.
   - Los cambios deben hacerse en los archivos reales del proyecto.

7. No entregues cambios sin pruebas.
   - Mínimo ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y, si afecta Supabase, pruebas de integración.

8. No agregues `any` por comodidad.
   - El proyecto tiene deuda técnica con tipos de Supabase.
   - La dirección correcta es generar tipos reales, no aumentar `as any`.

9. No mezcles responsabilidades.
   - UI en `components`.
   - Rutas en `app`.
   - Validaciones compartidas en `lib/validations`.
   - Queries reutilizables en `lib/supabase`.
   - Reglas fuertes en `supabase/migrations`.

10. Todo cambio administrativo sensible debe tener confirmación y auditoría.
    - Ejemplos: eliminar/archivar grupos, desactivar docentes, cambiar perfiles, cambiar coordinadores, modificar permisos, mover asignaciones finalizadas.

---

## Estructura principal del repositorio

```text
app/
  (auth)/
    login/
      login-form.tsx
      page.tsx
  (dashboard)/
    actions/
      legacy.ts
      usuarios.ts
      docentes.ts
      materias.ts
      coordinadores.ts
      grupos.ts
      asignaciones.ts
      horarios.ts
      schemas.ts
      utils.ts
    admin/
    carreras/
    coordinador/
    coordinadores/
    dashboard/
    datos-incompletos/
    docentes/
    grupos/
    horarios/
    materias/
    layout.tsx
components/
  forms/
  groups/
  schedule/
  ui/
lib/
  actions/
  permissions/
  schedule/
  supabase/
  validations/
scripts/
  import-datos.ts
  backup-db.ts
supabase/
  migrations/
  seed.sql
tests/
  integration/
  assignment-validation.test.ts
types/
  supabase.ts
docs/
  ARCHITECTURE.md
  DEPLOYMENT.md
  TESTING.md
datos/
assets/
public/
```

---

## Mapa de responsabilidades

### `app/`

Contiene rutas y páginas del App Router.

Reglas:

- Las páginas server pueden consultar Supabase con `createClient()` de `lib/supabase/server`.
- Las páginas no deben contener lógica de negocio compleja.
- Si una página crece demasiado, mover lógica a:
  - `lib/supabase/queries.ts`
  - `lib/validations/*`
  - componentes específicos en `components/*`.

### `app/(dashboard)/actions/`

Contiene Server Actions.

Estado actual:

- Los archivos `usuarios.ts`, `docentes.ts`, `materias.ts`, `coordinadores.ts`, `grupos.ts`, `asignaciones.ts` y `horarios.ts` reexportan desde `legacy.ts`.
- Esto es deuda técnica.
- Cuando se trabaje en acciones, priorizar separación real por módulo.

Regla para nuevos cambios:

- No seguir creciendo `legacy.ts`.
- Si se toca una acción, considerar moverla a su archivo correspondiente.
- Cada acción debe:
  - validar sesión;
  - validar rol;
  - validar usuario activo;
  - validar input con Zod;
  - limitar alcance según rol;
  - registrar auditoría si cambia datos sensibles;
  - devolver `ActionState` consistente.

### `components/`

Contiene UI reutilizable.

Reglas:

- Componentes visuales genéricos en `components/ui`.
- Formularios de dominio en `components/forms`.
- Componentes de grupos en `components/groups`.
- Componentes de horarios en `components/schedule`.
- Evitar queries directas en componentes cliente.
- Evitar componentes cliente si no hay interacción real.

### `lib/supabase/`

Contiene clientes, queries, auditoría y utilidades de Supabase.

Archivos clave:

- `client.ts`: cliente para navegador.
- `server.ts`: cliente servidor con cookies.
- `admin.ts`: cliente con service role. Usar con extremo cuidado.
- `queries.ts`: consultas reutilizables.
- `audit.ts`: lectura/formato de auditoría.
- `incomplete-data.ts`: detección de datos incompletos.

Reglas:

- `admin.ts` nunca debe ser importado desde componentes cliente.
- Cualquier uso de service role debe estar precedido por validación fuerte de sesión, rol y usuario activo.
- Las queries compartidas deben tiparse correctamente.

### `lib/validations/`

Contiene validaciones reutilizables.

Archivos existentes:

- `assignments.ts`
- `groups.ts`

Reglas:

- Toda validación usada en formularios debe tener espejo o respaldo en base de datos cuando afecte integridad crítica.
- Las validaciones de UI ayudan al usuario; las validaciones de base protegen el sistema.
- Agregar pruebas cuando se agregue una nueva validación.

### `lib/permissions/`

Contiene utilidades de permisos como `isAdmin`.

Reglas:

- No inventar roles sueltos en componentes.
- Si se agrega un rol nuevo, actualizar permisos, RLS, navegación, docs y pruebas.

### `lib/schedule/`

Contiene plantillas de horario.

Reglas:

- No duplicar plantillas en componentes.
- Toda nueva modalidad/turno debe reflejarse en:
  - constantes;
  - validaciones;
  - seed/migraciones;
  - UI;
  - pruebas;
  - documentación.

### `supabase/migrations/`

Contiene esquema, constraints, RLS, triggers y funciones.

Reglas:

- No editar migraciones ya aplicadas en producción; crear una nueva migración.
- Mantener nombres con timestamp.
- Toda tabla nueva debe considerar:
  - primary key;
  - foreign keys;
  - índices;
  - constraints;
  - RLS;
  - auditoría si contiene datos sensibles;
  - seed si aplica.

### `scripts/`

Contiene automatizaciones.

Reglas:

- Scripts deben fallar explícitamente con mensajes claros.
- No deben imprimir secretos.
- Si importan datos, deben reportar filas procesadas, ignoradas y errores.

### `tests/`

Contiene pruebas unitarias e integración.

Reglas:

- Si se cambia una regla de asignación, actualizar `assignment-validation.test.ts`.
- Si se cambia RLS, actualizar `tests/integration/supabase-rls.test.ts`.
- Si se cambia auditoría o triggers, actualizar `tests/integration/audit-triggers.test.ts`.

---

## Modelo de dominio

Entidades principales:

- `users_profile`
- `roles`
- `coordinators`
- `careers`
- `coordinator_careers`
- `teachers`
- `coordinator_teachers`
- `teacher_profiles`
- `teacher_available_profiles`
- `subjects`
- `class_requirements`
- `academic_cycles`
- `groups`
- `group_subjects`
- `schedule_templates`
- `schedule_blocks`
- `assignments`
- `classrooms`
- `audit_logs`

Relación conceptual:

```text
Carrera -> Materias
Materia -> Perfiles requeridos
Docente -> Perfiles aptos
Coordinador -> Carreras permitidas
Coordinador -> Docentes asignados
Grupo -> Carrera + Ciclo + Cuatrimestre + Modalidad + Turno
Grupo -> Materias del grupo
Grupo -> Asignaciones
Asignación -> Materia del grupo + Docente + Bloque + Aula
Bloque -> Plantilla de horario
Auditoría -> Cambios sensibles
```

---

## Roles y permisos

Roles actuales:

- `admin`
- `coordinator`

Reglas esperadas:

### Admin

Puede administrar catálogos, usuarios, coordinadores, docentes, materias, carreras, grupos, horarios y asignaciones.

Debe poder:

- crear usuarios;
- editar usuarios;
- asignar coordinadores;
- gestionar perfiles docentes;
- gestionar materias;
- gestionar grupos;
- crear/editar/eliminar asignaciones;
- consultar auditoría;
- ver datos incompletos.

### Coordinator

Debe operar solo dentro de su alcance.

Puede:

- ver carreras asignadas;
- ver docentes asignados;
- crear o gestionar grupos permitidos según reglas del sistema;
- crear asignaciones dentro de su alcance;
- crear bloques personalizados si está permitido.

No debe poder:

- modificar perfiles requeridos globales sin autorización;
- acceder a carreras ajenas;
- modificar docentes ajenos;
- saltarse validaciones de perfil;
- saltarse horas máximas;
- ver o alterar datos administrativos globales.

### Reglas para rol nuevo

Si se agrega `viewer`, `director`, `auditor` u otro rol:

1. Agregar en `roles`.
2. Actualizar `lib/permissions`.
3. Actualizar navegación en `components/app-shell.tsx`.
4. Actualizar RLS.
5. Actualizar Server Actions.
6. Actualizar pruebas RLS.
7. Documentar matriz de permisos.

---

## Reglas de seguridad obligatorias

### Autenticación

- Toda ruta de dashboard debe exigir sesión.
- El `proxy.ts` protege rutas principales, pero eso no sustituye validaciones en servidor.
- Las Server Actions deben validar de nuevo.

### Usuario activo

Toda función que identifique al usuario actual debe validar que el perfil esté activo.

Patrón recomendado:

```ts
const profile = await requireAuthenticatedProfile();

if (!profile.active) {
  throw new Error("Usuario inactivo.");
}
```

Si `requireAuthenticatedProfile()` todavía no devuelve `active`, debe actualizarse.

### Admin seguro

Patrón recomendado:

```ts
const profile = await requireAuthenticatedProfile();

if (profile.role_code !== "admin" || !profile.active) {
  throw new Error("No autorizado.");
}
```

No usar únicamente:

```ts
isAdmin(profile?.role_code)
```

para acciones críticas si no se valida también `active`.

### Service role

Permitido solo cuando sea estrictamente necesario:

- crear usuarios desde Supabase Auth Admin;
- operaciones administrativas que no pueden hacerse con RLS;
- scripts de importación;
- pruebas de integración;
- backups o tareas internas.

Prohibido:

- importar `createServiceClient` en componentes cliente;
- exponer `SUPABASE_SERVICE_ROLE_KEY`;
- usar service role para evitar diseñar RLS;
- usarlo sin validar primero sesión y rol.

### RLS

Si se crea una tabla nueva:

```sql
alter table public.nombre_tabla enable row level security;
```

Agregar policies explícitas para:

- lectura admin;
- lectura coordinador dentro de alcance;
- escritura admin;
- escritura coordinador si aplica.

### Auditoría

Debe existir auditoría para:

- asignaciones;
- grupos;
- docentes;
- perfiles docentes;
- materias/perfiles requeridos;
- coordinadores;
- usuarios/permisos;
- bloques personalizados;
- cambios de estado.

---

## Reglas de asignación académica

Una asignación válida debe cumplir:

1. El docente existe y está activo.
2. La materia existe y está activa.
3. El grupo existe y está activo o en estado editable.
4. El bloque existe y está activo.
5. El aula existe y está activa si aplica.
6. El docente cumple el perfil requerido.
7. El docente no excede horas máximas.
8. El docente no tiene choque en el mismo bloque.
9. El grupo no tiene choque en el mismo bloque.
10. El aula no tiene choque en el mismo bloque.
11. El bloque pertenece a la modalidad y turno del grupo.
12. La materia no excede su carga horaria.
13. El coordinador solo asigna dentro de su alcance.
14. Si el grupo está finalizado, no se puede modificar sin permiso especial.

---

## Modalidades y turnos

Modalidades conocidas:

- `escolarizado`
- `modular`
- `virtual_modular`
- `maestrias`

Turnos conocidos:

- `matutino`
- `vespertino`

Reglas horarias base documentadas:

- Matutino escolarizado, modular y virtual: 08:00 a 13:00.
- Vespertino escolarizado: 15:00 a 20:00.
- Vespertino modular: 14:00 a 19:00.
- Maestrías: 14:30 a 19:00.

Al agregar modalidad o turno:

- actualizar `lib/validations/groups.ts`;
- actualizar `lib/schedule/templates.ts`;
- actualizar seed/migraciones;
- actualizar UI de formularios;
- actualizar pruebas;
- actualizar documentación.

---

## Validaciones mínimas para formularios

### Usuarios

Validar:

- email requerido;
- formato de email;
- dominio institucional si aplica;
- nombre visible requerido;
- rol válido;
- estado activo/inactivo;
- contraseña temporal segura si se crea usuario;
- no duplicar correo.

### Docentes

Validar:

- nombre requerido;
- perfiles aptos válidos;
- horas máximas positivas;
- email válido si se usa;
- link de expediente válido si se usa;
- no desactivar sin advertir si tiene asignaciones activas.

### Materias

Validar:

- nombre requerido;
- carrera requerida;
- cuatrimestre 1–12;
- horas por semana positivas;
- perfil requerido válido;
- no duplicar materia dentro de la misma carrera/cuatrimestre sin intención.

### Coordinadores

Validar:

- nombre requerido;
- usuario asociado;
- carreras asignadas;
- docentes asignados;
- no eliminar coordinador con grupos/asignaciones activas sin advertencia.

### Grupos

Validar:

- ciclo requerido;
- carrera requerida;
- cuatrimestre válido;
- modalidad válida;
- turno permitido para modalidad;
- nombre requerido;
- aula válida si se asigna;
- no crear duplicados obvios para mismo ciclo/carrera/cuatrimestre/turno/modalidad.

### Asignaciones

Validar:

- grupo editable;
- materia de grupo válida;
- docente activo;
- bloque activo;
- aula activa;
- perfil docente compatible;
- horas máximas;
- choque de docente;
- choque de grupo;
- choque de aula;
- materia no excedida en horas.

---

## Comandos del proyecto

Instalación local:

```bash
npm install
copy .env.local.example .env.local
supabase start
supabase db reset
npm run import:datos
npm run dev
```

Comandos principales:

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run test:rls
npm run test:audit
npm run import:datos
npm run backup:db
npm run supabase:types
```

Antes de entregar un cambio, ejecutar como mínimo:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Si el cambio toca Supabase, RLS, migraciones, triggers, permisos o datos:

```bash
supabase db reset
npm run import:datos
npm run test:integration
```

Si el cambio toca RLS:

```bash
npm run test:rls
```

Si el cambio toca auditoría/triggers:

```bash
npm run test:audit
```

---

## Variables de entorno esperadas

Ejemplo local:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Reglas:

- `NEXT_PUBLIC_*` puede existir en cliente.
- `SUPABASE_SERVICE_ROLE_KEY` jamás debe exponerse al cliente.
- No imprimir valores de entorno en logs.
- No commitear `.env`, `.env.local` ni llaves reales.

---

## Flujo recomendado para cualquier tarea

Antes de editar:

1. Leer el ticket o solicitud completa.
2. Identificar si afecta:
   - UI;
   - Server Actions;
   - validaciones;
   - base de datos;
   - RLS;
   - migraciones;
   - auditoría;
   - importador;
   - pruebas;
   - documentación.
3. Revisar archivos relacionados.
4. Proponer plan breve.
5. Hacer cambios pequeños y verificables.

Durante la edición:

1. Mantener cambios acotados.
2. No mezclar refactor grande con feature urgente.
3. No romper rutas existentes.
4. No eliminar validaciones sin reemplazo.
5. No reducir seguridad para “hacer que funcione”.
6. Actualizar pruebas al mismo tiempo.

Después de editar:

1. Ejecutar comandos necesarios.
2. Revisar errores.
3. Corregir sin introducir hacks.
4. Documentar cambios relevantes.
5. Reportar:
   - archivos modificados;
   - comportamiento agregado;
   - pruebas ejecutadas;
   - riesgos restantes.

---

## Patrón recomendado para Server Actions

Toda Server Action debe seguir esta estructura conceptual:

```ts
"use server";

export async function actionName(previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const profile = await requireAuthenticatedProfile();

    if (!profile.active) {
      return errorState("Usuario inactivo.");
    }

    // Validar rol
    // Validar scope
    // Parsear input con Zod
    // Ejecutar operación
    // Revalidar rutas
    // Registrar auditoría si aplica

    return successState("Cambio guardado correctamente.");
  } catch (error) {
    return errorState(getSafeErrorMessage(error));
  }
}
```

Reglas:

- No confiar en datos crudos de `FormData`.
- Usar Zod para inputs.
- Devolver mensajes entendibles.
- No filtrar errores internos sensibles.
- Revalidar rutas necesarias con `revalidatePath`.
- Si modifica datos críticos, auditar.

---

## Patrón recomendado para validaciones compartidas

Crear funciones puras en `lib/validations/*`.

Ejemplo:

```ts
export function validateAssignmentDraft(input: AssignmentDraftInput): string[] {
  const errors: string[] = [];

  if (input.hasTeacherCollision) {
    errors.push("El docente ya tiene una clase asignada en este horario.");
  }

  return errors;
}
```

Reglas:

- Funciones puras, sin Supabase.
- Fáciles de probar.
- Mensajes claros en español.
- No reemplazan triggers ni RLS.

---

## Patrón recomendado para migraciones

Crear una migración nueva:

```text
supabase/migrations/YYYYMMDDHHMM_descripcion_corta.sql
```

Debe incluir:

- cambios de esquema;
- constraints;
- índices;
- RLS;
- policies;
- triggers;
- funciones;
- comentarios si la lógica es compleja.

Nunca hacer:

- editar migraciones antiguas si ya fueron aplicadas;
- desactivar RLS para resolver errores;
- crear funciones `security definer` sin validar permisos;
- introducir tablas sin auditoría cuando almacenen datos sensibles.

---

## Estándares de UI

Usar:

- Tailwind;
- componentes existentes en `components/ui`;
- `Button`;
- `Input`;
- `Select`;
- `Badge`;
- `ActionStateForm`;
- `ActionAlert`;
- `ConfirmActionButton`;
- `DataTableAdvanced` para tablas grandes.

Evitar:

- estilos inline innecesarios;
- tablas enormes sin búsqueda;
- formularios largos incrustados sin jerarquía visual;
- acciones peligrosas sin confirmación;
- textos sin acentos;
- mensajes genéricos como “error”.

Para tablas grandes:

- búsqueda;
- filtros;
- paginación;
- estado vacío claro;
- contador de registros;
- acciones por fila claras;
- confirmación si la acción es sensible.

---

## Convenciones de texto en UI

Usar español claro y formal.

Preferir:

- “Guardar cambios”
- “Crear grupo”
- “Asignar docente”
- “Archivar grupo”
- “Desactivar docente”
- “Corregir datos”
- “No hay registros con esos filtros”
- “El docente excede su límite de horas”
- “El aula ya tiene una clase asignada en este horario”

Evitar:

- “Submit”
- “Ok”
- “Error”
- “Fallo”
- “No se pudo”
- “Tamano”
- “Pagina”
- “Accion”
- “Auditoria”

Corregir acentos:

- Página
- Tamaño
- Acción
- Auditoría
- Categoría
- Crítico
- Está
- Contraseña
- Asignación

---

## Pruebas obligatorias por tipo de cambio

### Cambio solo visual

Ejecutar:

```bash
npm run typecheck
npm run lint
```

Verificar manualmente:

- pantalla desktop;
- pantalla móvil;
- estados vacíos;
- permisos visuales por rol si aplica.

### Cambio en formularios

Ejecutar:

```bash
npm run typecheck
npm run lint
npm run test
```

Agregar prueba si la validación se reutiliza.

### Cambio en asignaciones

Ejecutar:

```bash
npm run test
npm run test:integration
npm run test:audit
```

Verificar:

- choque docente;
- choque grupo;
- choque aula;
- perfil incompatible;
- horas máximas;
- bloque no permitido;
- coordinador fuera de alcance.

### Cambio en permisos o RLS

Ejecutar:

```bash
npm run test:rls
npm run test:integration
```

Verificar con usuarios:

- admin;
- coordinator;
- usuario inactivo;
- usuario sin perfil;
- coordinador sin carrera asignada.

### Cambio en migraciones

Ejecutar:

```bash
supabase db reset
npm run import:datos
npm run test:integration
npm run supabase:types
npm run typecheck
```

### Cambio en importador

Ejecutar:

```bash
supabase db reset
npm run import:datos
npm run test:integration
```

Verificar:

- conteo de carreras;
- conteo de materias;
- perfiles;
- docentes;
- coordinadores;
- materias sin perfil;
- docentes sin perfil.

---

## Deuda técnica conocida

Priorizar estas mejoras cuando el agente tenga oportunidad:

### P0 — Crítico

1. Quitar credenciales demo precargadas del login.
   - Archivo: `app/(auth)/login/login-form.tsx`.
   - Reemplazar `defaultValue` por `placeholder` o condicionar solo a desarrollo.

2. Validar usuarios activos en permisos.
   - Revisar `getCurrentProfile`.
   - Revisar `requireAuthenticatedProfile`.
   - Revisar `requireAdmin`.
   - Exigir `active = true`.

3. Generar tipos reales de Supabase.
   - Archivo actual: `types/supabase.ts`.
   - Ejecutar `npm run supabase:types`.
   - Reducir `Database = any`.

4. Revisar uso de `service_role`.
   - Archivo: `lib/supabase/admin.ts`.
   - Server Actions administrativas.
   - Scripts.
   - Pruebas.

### P1 — Alto

1. Dividir `legacy.ts`.
   - Mover acciones reales a:
     - `usuarios.ts`
     - `docentes.ts`
     - `materias.ts`
     - `coordinadores.ts`
     - `grupos.ts`
     - `asignaciones.ts`
     - `horarios.ts`

2. Agregar flujo de estados de grupo.
   - `draft`
   - `review`
   - `final`
   - `archived`

3. Bloquear edición de grupos finalizados.

4. Agregar exportaciones:
   - PDF por grupo;
   - CSV por docente;
   - reporte de aulas;
   - reporte de datos incompletos.

5. Cambiar eliminación de grupos por archivado.

### P2 — Medio

1. Reemplazar `DataTable` por `DataTableAdvanced` en tablas grandes.
2. Humanizar auditoría.
3. Agregar panel de avance por grupo.
4. Agregar dashboard de docentes saturados.
5. Agregar vista de aulas ocupadas/libres.
6. Fijar versiones de dependencias en `package.json`.

### P3 — Bajo

1. Mejorar copy con acentos.
2. Añadir branding institucional.
3. Mejorar estados vacíos.
4. Añadir tooltips y ayudas contextuales.
5. Crear manual de usuario con capturas.

---

## Reglas para reportes y exportaciones

Cuando se agreguen reportes, deben incluir:

- nombre institucional;
- logo si existe en `public/logos`;
- ciclo académico;
- carrera;
- grupo;
- modalidad;
- turno;
- fecha de emisión;
- usuario que generó el reporte;
- tabla limpia de asignaciones;
- docente;
- materia;
- día;
- hora;
- aula;
- observaciones si aplica.

Reportes prioritarios:

1. Horario por grupo.
2. Horario por docente.
3. Uso de aulas.
4. Asignaciones por carrera/ciclo.
5. Datos incompletos.
6. Historial de cambios por grupo.

---

## Reglas de documentación

Actualizar documentación cuando se modifique:

- instalación;
- variables de entorno;
- scripts;
- despliegue;
- base de datos;
- RLS;
- roles;
- permisos;
- importador;
- backups;
- pruebas;
- reglas de asignación;
- flujo de entrega.

Documentos existentes:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/TESTING.md`

Documentos recomendados:

- `docs/USER_MANUAL.md`
- `docs/ADMIN_MANUAL.md`
- `docs/PERMISSIONS_MATRIX.md`
- `docs/DATABASE_DICTIONARY.md`
- `docs/DELIVERY_CHECKLIST.md`
- `docs/BACKUP_RESTORE.md`

---

## Criterios de aceptación antes de entregar una tarea

Una tarea se considera lista solo si:

- compila;
- no rompe login;
- no rompe navegación;
- respeta roles;
- respeta RLS;
- tiene validación de input;
- no expone secretos;
- no introduce `any` innecesario;
- no reduce auditoría;
- incluye pruebas cuando aplica;
- actualiza documentación cuando aplica;
- mantiene mensajes en español claro;
- no deja credenciales demo visibles en producción.

---

## Checklist de revisión de Pull Request

Antes de cerrar un cambio, responder:

- ¿Qué problema resuelve?
- ¿Qué archivos toca?
- ¿Toca base de datos?
- ¿Toca permisos?
- ¿Toca RLS?
- ¿Toca service role?
- ¿Toca datos académicos sensibles?
- ¿Tiene validaciones frontend?
- ¿Tiene validaciones backend/base de datos?
- ¿Tiene pruebas?
- ¿Qué comandos se ejecutaron?
- ¿Qué riesgo queda pendiente?

Formato recomendado de entrega:

```markdown
## Cambios realizados

- ...

## Archivos modificados

- ...

## Validaciones agregadas

- ...

## Pruebas ejecutadas

- `npm run typecheck`
- `npm run lint`
- `npm run test`

## Riesgos o pendientes

- ...
```

---

## Errores comunes que el agente debe evitar

- Agregar botones visibles solo para admin sin proteger la acción real.
- Usar `createServiceClient()` para operaciones que deberían pasar por RLS.
- Crear tablas sin RLS.
- Cambiar migraciones viejas en lugar de crear una nueva.
- Agregar `any` para silenciar TypeScript.
- Validar solo en cliente.
- Eliminar registros críticos sin auditoría.
- Crear asignaciones sin revisar choque de aula.
- Crear asignaciones sin revisar choque de grupo.
- Crear asignaciones sin revisar horas máximas.
- Permitir que un coordinador modifique datos fuera de su alcance.
- Meter lógica de negocio grande en componentes.
- Seguir creciendo `legacy.ts`.
- Dejar mensajes de error técnicos al usuario final.
- Commitear `.env`.
- Mostrar credenciales demo en producción.

---

## Prioridad recomendada para próximos agentes

Si un agente recibe libertad para mejorar el proyecto, debe seguir este orden:

1. Quitar credenciales precargadas del login.
2. Validar usuario activo en autenticación/permisos.
3. Generar tipos reales de Supabase.
4. Auditar uso de service role.
5. Separar `legacy.ts`.
6. Agregar exportación PDF/CSV.
7. Implementar estados de grupo y bloqueo de finalizados.
8. Reemplazar tablas grandes por `DataTableAdvanced`.
9. Humanizar auditoría.
10. Completar documentación de entrega.

---

## Contexto de entrega profesional

Este proyecto será evaluado como sistema administrativo, no como demo técnica. Por eso, cualquier mejora debe cuidar:

- confiabilidad;
- trazabilidad;
- seguridad;
- claridad visual;
- facilidad de operación;
- respaldo de datos;
- evidencia de pruebas;
- documentación;
- mantenimiento futuro.

El sistema debe transmitir que puede ser usado por personal de Coordinación Académica sin depender del desarrollador para cada operación.
