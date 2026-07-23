# Arquitectura

## Análisis de datos

La carpeta `datos` contiene:

- `DB_Coordinacion_Academica.xlsx`
  - `base_clases`: 1200 filas.
  - Columnas: `carrera`, `cuatrimestre`, `materia`, `perfil_requerido`, `COORDINADOR`.
  - Conversión: `careers`, `coordinators`, `coordinator_careers`, `subjects`, `teacher_profiles`, `class_requirements`.
- `base_docentes`: 154 filas.
  - Columnas: `nombre`, `perfiles_aptos`, `link_expediente`, `EMAIL_DOCENTE`, `coordinador`, `horas_maximas`.
  - Conversión: `teachers`, `teacher_available_profiles`, `coordinator_teachers`.
  - En los datos actuales `coordinador`, `EMAIL_DOCENTE` y `horas_maximas` vienen vacíos; el importador usa 20 horas por defecto.

La carpeta `assets` contiene las imágenes base de horarios:

- `CUADRO ESCOLARIZADO.png`
- `CUADRO ESCOLARIZADO VESPERTINO.png`
- `CUADRO MODULAR.png`
- `CUADRO MODULAR VESPERTINO.png`
- `CUADRO MODULAR VIRTUAL.png`
- `CUADRO MAESTRIAS.png`
- `ASIGNACIÓN DE AULAS ACADEMIA .xlsx`

Las imágenes se sirven desde `public/schedule-assets` y las estructuras editables se modelan en `schedule_templates` y `schedule_blocks`.

### Catálogo operativo de horarios

Los bloques base activos se limitan a tres franjas por jornada:

- Escolarizado matutino: `08:00-09:30`, `10:00-11:30`, `11:30-13:00`.
- Escolarizado vespertino: `15:00-16:30`, `17:00-18:30`, `18:30-20:00`.
- Modular matutino, sabatino matutino y virtual: `08:00-09:30`, `10:00-11:30`, `11:30-13:00`.
- Modular y sabatino vespertino: `14:00-15:30`, `16:00-17:30`, `17:30-19:00`.

Sabatino y virtual usan una sola fila por franja, sin duplicados M1/M2. Maestrías conserva su catálogo independiente. La migración de reconciliación desactiva bloques base anteriores en vez de borrarlos, para conservar referencias históricas.

## Capas

- `app`: rutas App Router, autenticación, dashboard y vistas administrativas.
- `components`: UI reutilizable, formularios, grupos y horarios.
- `lib/supabase`: clientes de navegador, servidor y service role.
- `lib/validations`: validaciones compartidas para formularios y pruebas.
- `lib/schedule`: definición de plantillas de horario por modalidad/turno.
- `scripts/import-datos.ts`: importación desde Excel/CSV hacia Supabase local o Cloud.
- `supabase/migrations`: esquema PostgreSQL, constraints, triggers, RLS y auditoría.

## Seguridad

El frontend filtra datos para una experiencia cómoda, pero las restricciones importantes están en PostgreSQL:

- RLS por rol, carrera y docente asignado.
- Triggers para validar choques de horario.
- Triggers para validar horas máximas.
- Triggers para validar compatibilidad de perfiles.
- Triggers para impedir que coordinadores modifiquen perfiles requeridos de clases.
- Auditoría automática en grupos, asignaciones, perfiles, docentes y asignaciones de coordinadores.

## Tablas principales

- `users_profile`, `roles`, `coordinators`
- `careers`, `coordinator_careers`
- `teachers`, `coordinator_teachers`, `teacher_profiles`, `teacher_available_profiles`
- `subjects`, `class_requirements`
- `academic_cycles`, `groups`, `group_subjects`
- `cohort_groups`, `cohort_subject_history`
- `schedule_templates`, `schedule_blocks`, `assignments`
- `classrooms`, `audit_logs`

## Ciclos y cohortes

Una cohorte representa al grupo padre que avanza por el plan de estudios. Su primer grupo se captura y vincula manualmente. Al activar cada ciclo posterior, `activate_academic_cycle_and_advance_cohorts` crea en una sola transacción el grupo del siguiente cuatrimestre y sus materias; los reintentos son idempotentes y no generan duplicados.

Los coordinadores pueden crear y recuperar cohortes únicamente en carreras asignadas. Completar y archivar cohortes sigue siendo una operación exclusiva de administrador.

## Catálogo de aulas

La ruta administrativa `/aulas` permite crear, editar, desactivar y reactivar espacios. La desactivación los retira de grupos y asignaciones nuevas sin eliminar referencias existentes. RLS limita las escrituras a administradores activos y el trigger `audit_classrooms` registra sus cambios en `audit_logs`.

## Aprovisionamiento y auditoría administrativa

El trigger de nuevas cuentas ignora cualquier rol recibido en `user_metadata` y crea un perfil `coordinator` inactivo. Solo una acción administrativa validada puede activar el perfil o asignarle el rol `admin` mediante `configure_managed_user`.

Las escrituras realizadas con service role incluyen el encabezado interno `x-audit-user-id`, agregado exclusivamente después de validar sesión, rol y estado del administrador. El trigger de auditoría usa ese valor para conservar al actor humano en `audit_logs`; el encabezado nunca se acepta desde clientes públicos.
