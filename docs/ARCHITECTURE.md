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
- `schedule_templates`, `schedule_blocks`, `assignments`
- `classrooms`, `audit_logs`
