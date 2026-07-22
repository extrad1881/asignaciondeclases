# Decisiones de la auditoría

## Riesgos aceptados por operación

La empresa decidió conservar expresamente estos comportamientos:

- Es posible reducir las horas planeadas de una materia por debajo de las horas que ya tiene asignadas.
- El borrado físico de grupos continúa disponible para los roles que ya tienen permiso sobre el grupo.

Estas excepciones no deben eliminarse en refactorizaciones posteriores sin una nueva decisión de negocio. RLS, alcance por carrera, auditoría y las demás validaciones siguen aplicándose normalmente.

## Controles corregidos

- El registro público está cerrado y los metadatos de Auth no pueden elegir roles.
- Las cuentas nuevas nacen inactivas hasta que un administrador las aprovisiona.
- Las RPC `SECURITY DEFINER` críticas validan sesión y alcance.
- La creación de grupos con materias ya no contiene referencias SQL ambiguas.
- Los reemplazos de perfiles, requisitos y carreras son transaccionales.
- Las escrituras con service role conservan al administrador responsable en auditoría.
- Crear cohortes está limitado a carreras accesibles; completar y archivar son operaciones administrativas.
