Mejoras.

Priorida
d

P0

P0

P0

P0

P0

P1

Problema

Solución exacta

Impacto

Login con
credenciales
precargadas

Cambiar defaultValue por
placeholder; envolver
credenciales demo con condición
process.env.NODE_ENV ===
"development" o eliminarlas por
completo.

Usuarios
inactivos
podrían pasar
validaciones
internas

En getCurrentProfile() y
requireAuthenticatedProfile
(), seleccionar también active y
exigir .eq("active", true). En
requireAdmin(), rechazar si
active !== true.

Reduce riesgo y
mejora percepción
profesional.

Evita que usuarios
desactivados sigan
operando.

Uso amplio de
service_rol
e

Crear helpers tipo
requireActiveAdminServiceCl
ient() que valide sesión activa, rol
activo y registre auditoría antes de
devolver service client.

Reduce riesgo de
escalación de
privilegios.

Sin tipos
reales de
Supabase

Ejecutar npm run
supabase:types, reemplazar
Database = any y corregir errores
resultantes.

Mejora estabilidad y
previene errores en
producción.

No hay reporte
final

Crear /reportes con exportación
PDF/CSV: por grupo, docente, aula,
carrera y ciclo.

Hace que el sistema
parezca entregable
institucional.

legacy.ts
concentra
demasiada
lógica

Mover acciones reales a
actions/usuarios.ts,
docentes.ts, materias.ts,
grupos.ts, asignaciones.ts,
horarios.ts; dejar legacy.ts
vacío o eliminarlo.

Mantenimiento más
claro y revisión más
sencilla.

P1

P1

P1

P1

P1

Grupos se
crean directo
como activos

Crear grupos como draft; agregar
botón “Enviar a revisión” y
“Finalizar”.

Falta
validación de
horas
completas

Agregar función SQL o vista que
compare
group_subjects.hours_per_we
ek contra suma de
assignments.duration_hours.

Evita cambios
accidentales en
horarios ya
aprobados.

Detecta materias
incompletas o
sobreasignadas.

Custom blocks
pueden salirse
del horario
esperado

Validar que el bloque personalizado
esté dentro del rango de su plantilla
y que no se traslape
innecesariamente con otro bloque.

Evita horarios
absurdos o
duplicados.

Tablas básicas
sin filtros

Reemplazar DataTable por
DataTableAdvanced en docentes,
materias, carreras, coordinadores,
grupos y auditoría.

Mejora usabilidad con
datos reales.

Eliminación de
grupos
sensible

Cambiar botón “Borrar grupo” por
“Archivar grupo”; pedir motivo
obligatorio.

Conserva trazabilidad
y evita pérdida
accidental.

P2

No hay CI

Agregar workflow que ejecute npm
ci, lint, typecheck, test,
build.

Entrega más
confiable.

P3

Interfaz visual
genérica

Agregar branding institucional,
mejores estados vacíos, badges de
avance y resumen visual por grupo.

Se ve más
profesional.

