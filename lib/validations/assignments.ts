export type AssignmentDraft = {
  teacherId?: string | null;
  teacherProfiles: string[];
  requiredProfiles: string[];
  teacherAssignedHours: number;
  teacherMaxHours: number;
  blockHours: number;
  hasTeacherCollision: boolean;
  hasSubjectBlockTeacher: boolean;
  teacherAllowed: boolean;
  blockAllowed: boolean;
};

export function validateAssignmentDraft(draft: AssignmentDraft): string[] {
  const errors: string[] = [];

  if (!draft.teacherId) errors.push("Selecciona un docente.");
  if (!draft.teacherAllowed) errors.push("No tienes permiso para asignar este docente.");
  if (!draft.blockAllowed) errors.push("El horario elegido no existe en el cuadro correspondiente.");
  if (draft.hasTeacherCollision) errors.push("El docente ya tiene una clase asignada en este horario.");
  if (draft.hasSubjectBlockTeacher) errors.push("La materia ya tiene otro docente asignado en este bloque.");

  const required = new Set(draft.requiredProfiles.map((profile) => profile.toUpperCase()));
  const capable = new Set(draft.teacherProfiles.map((profile) => profile.toUpperCase()));
  const hasRequiredProfile =
    required.size === 0 || Array.from(required).some((profile) => capable.has(profile));

  if (!hasRequiredProfile) {
    errors.push("El docente no cumple con el perfil requerido para esta materia.");
  }

  if (draft.teacherAssignedHours + draft.blockHours > draft.teacherMaxHours) {
    errors.push("El docente excede su límite de horas.");
  }

  return errors;
}
