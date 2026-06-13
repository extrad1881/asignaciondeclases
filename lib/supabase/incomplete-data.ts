import { canUseShift } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export type IncompleteSeverity = "critico" | "advertencia" | "informativo";
export type IncompleteCategory = "docentes" | "materias" | "grupos" | "asignaciones";

export type IncompleteIssue = {
  id: string;
  category: IncompleteCategory;
  type: string;
  severity: IncompleteSeverity;
  title: string;
  detail: string;
  entityName: string;
  href?: string;
  careerId?: string;
  careerLabel?: string;
  coordinatorId?: string;
  coordinatorLabel?: string;
  groupId?: string;
  groupLabel?: string;
  quarter?: number;
};

export type IncompleteDataResult = {
  issues: IncompleteIssue[];
  summary: Record<IncompleteCategory, number>;
};

function addIssue(issues: IncompleteIssue[], issue: IncompleteIssue) {
  issues.push(issue);
}

function requiredProfilesFromGroupSubject(groupSubject: any) {
  if (groupSubject.required_profile_code && isValidProfileCode(groupSubject.required_profile_code)) {
    return [groupSubject.required_profile_code];
  }

  return ((groupSubject.subjects?.class_requirements ?? []) as any[])
    .map((requirement) => requirement.profile_code)
    .filter(isValidProfileCode);
}

function requiredProfilesFromAssignment(assignment: any) {
  const groupSubject = assignment.group_subjects;
  if (groupSubject?.required_profile_code && isValidProfileCode(groupSubject.required_profile_code)) {
    return [groupSubject.required_profile_code];
  }

  return ((groupSubject?.subjects?.class_requirements ?? []) as any[])
    .map((requirement) => requirement.profile_code)
    .filter(isValidProfileCode);
}

function timeToMinutes(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function schedulesOverlap(left: any, right: any) {
  const leftBlock = left.schedule_blocks;
  const rightBlock = right.schedule_blocks;
  if (!leftBlock || !rightBlock || leftBlock.day_of_week !== rightBlock.day_of_week) return false;

  const leftStart = timeToMinutes(leftBlock.starts_at);
  const leftEnd = timeToMinutes(leftBlock.ends_at);
  const rightStart = timeToMinutes(rightBlock.starts_at);
  const rightEnd = timeToMinutes(rightBlock.ends_at);
  if (leftStart == null || leftEnd == null || rightStart == null || rightEnd == null) return false;

  return leftStart < rightEnd && rightStart < leftEnd;
}

export async function getIncompleteData(): Promise<IncompleteDataResult> {
  const supabase = await createClient();
  const [
    { data: teachers = [] },
    { data: subjects = [] },
    { data: groups = [] },
    { data: assignments = [] },
    { data: coordinatorCareers = [] }
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select(
        "id, name, email, max_hours, assigned_hours, active, responsible_coordinator_id, coordinators(id, name), teacher_available_profiles(profile_code)"
      )
      .order("name")
      .limit(1000),
    supabase
      .from("subjects")
      .select("id, name, normalized_name, quarter, default_hours, active, career_id, careers(id, code, name), class_requirements(profile_code)")
      .order("name")
      .limit(2000),
    supabase
      .from("groups")
      .select(
        "id, name, quarter, modality, shift, status, classroom_id, careers(id, code, name), classrooms(id, name), group_subjects(id, required_profile_code, subjects(id, name, class_requirements(profile_code)))"
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("assignments")
      .select(
        "id, status, teacher_id, schedule_block_id, classroom_id, duration_hours, teachers(id, name, max_hours, assigned_hours, teacher_available_profiles(profile_code)), schedule_blocks(id, label, day_of_week, starts_at, ends_at), group_subjects(id, required_profile_code, groups(id, name, quarter, classroom_id, careers(id, code, name)), subjects(id, name, class_requirements(profile_code)))"
      )
      .eq("status", "active")
      .limit(2000),
    supabase.from("coordinator_careers").select("career_id, coordinators(id, name)").limit(2000)
  ]);

  const issues: IncompleteIssue[] = [];
  const careerCoordinator = new Map<string, { id?: string; name?: string }>();
  (coordinatorCareers ?? []).forEach((item: any) => {
    if (item.career_id && item.coordinators) {
      careerCoordinator.set(item.career_id, {
        id: item.coordinators.id,
        name: item.coordinators.name
      });
    }
  });

  (teachers ?? []).forEach((teacher: any) => {
    if (!teacher.active) return;
    const teacherProfiles = ((teacher.teacher_available_profiles ?? []) as any[])
      .map((profile) => profile.profile_code)
      .filter(isValidProfileCode);
    const assignedHours = Number(teacher.assigned_hours ?? 0);
    const maxHours = Number(teacher.max_hours ?? 0);
    const base = {
      category: "docentes" as const,
      entityName: teacher.name,
      href: "/docentes",
      coordinatorId: teacher.coordinators?.id ?? teacher.responsible_coordinator_id ?? undefined,
      coordinatorLabel: teacher.coordinators?.name ?? undefined
    };

    if (teacherProfiles.length === 0) {
      addIssue(issues, {
        ...base,
        id: `teacher-${teacher.id}-profiles`,
        type: "docente_sin_perfiles",
        severity: "critico",
        title: "Docente sin perfiles aptos",
        detail: "El docente activo no tiene perfiles asignados y no podra validarse contra materias."
      });
    }

    if (!teacher.email) {
      addIssue(issues, {
        ...base,
        id: `teacher-${teacher.id}-email`,
        type: "docente_sin_correo",
        severity: "advertencia",
        title: "Docente sin correo",
        detail: "El docente activo no tiene correo registrado."
      });
    }

    if (!Number.isFinite(maxHours) || maxHours <= 0 || maxHours < assignedHours) {
      addIssue(issues, {
        ...base,
        id: `teacher-${teacher.id}-hours`,
        type: "docente_horas_invalidas",
        severity: "critico",
        title: "Horas maximas invalidas",
        detail: `Horas maximas: ${maxHours || 0}. Horas asignadas: ${assignedHours || 0}.`
      });
    }

    if (!teacher.responsible_coordinator_id) {
      addIssue(issues, {
        ...base,
        id: `teacher-${teacher.id}-coordinator`,
        type: "docente_sin_coordinador",
        severity: "advertencia",
        title: "Docente sin coordinador responsable",
        detail: "El docente activo no esta asignado a ningun coordinador."
      });
    }
  });

  const subjectsByDuplicateKey = new Map<string, any[]>();
  (subjects ?? []).forEach((subject: any) => {
    const careerId = subject.career_id ?? "sin-carrera";
    const duplicateKey = `${careerId}|${subject.quarter}|${subject.normalized_name ?? subject.name}`;
    subjectsByDuplicateKey.set(duplicateKey, [...(subjectsByDuplicateKey.get(duplicateKey) ?? []), subject]);

    if (!subject.active) return;

    const career = subject.careers;
    const coordinator = subject.career_id ? careerCoordinator.get(subject.career_id) : undefined;
    const base = {
      category: "materias" as const,
      entityName: subject.name,
      href: subject.career_id ? `/carreras/${subject.career_id}/materias` : "/materias",
      careerId: subject.career_id ?? undefined,
      careerLabel: career?.code ?? career?.name ?? undefined,
      coordinatorId: coordinator?.id,
      coordinatorLabel: coordinator?.name,
      quarter: subject.quarter ?? undefined
    };

    const requirements = ((subject.class_requirements ?? []) as any[])
      .map((requirement) => requirement.profile_code)
      .filter(isValidProfileCode);

    if (requirements.length === 0) {
      addIssue(issues, {
        ...base,
        id: `subject-${subject.id}-profile`,
        type: "materia_sin_perfil",
        severity: "advertencia",
        title: "Materia sin perfil requerido",
        detail: "La materia activa no tiene perfiles requeridos en class_requirements."
      });
    }

    const defaultHours = Number(subject.default_hours ?? 0);
    if (!Number.isFinite(defaultHours) || defaultHours <= 0) {
      addIssue(issues, {
        ...base,
        id: `subject-${subject.id}-hours`,
        type: "materia_horas_invalidas",
        severity: "critico",
        title: "Carga horaria invalida",
        detail: `Carga registrada: ${subject.default_hours ?? "vacia"}.`
      });
    }

    if (!subject.career_id) {
      addIssue(issues, {
        ...base,
        id: `subject-${subject.id}-career`,
        type: "materia_sin_carrera",
        severity: "critico",
        title: "Materia sin carrera",
        detail: "La materia no tiene carrera asociada."
      });
    }
  });

  subjectsByDuplicateKey.forEach((duplicates) => {
    if (duplicates.length <= 1) return;
    duplicates.forEach((subject: any) => {
      const career = subject.careers;
      addIssue(issues, {
        id: `subject-${subject.id}-duplicate`,
        category: "materias",
        type: "materia_duplicada",
        severity: "advertencia",
        title: "Materia duplicada",
        detail: "Existe mas de una materia con la misma carrera, cuatrimestre y nombre normalizado.",
        entityName: subject.name,
        href: subject.career_id ? `/carreras/${subject.career_id}/materias` : "/materias",
        careerId: subject.career_id ?? undefined,
        careerLabel: career?.code ?? career?.name ?? undefined,
        quarter: subject.quarter ?? undefined
      });
    });
  });

  (groups ?? []).forEach((group: any) => {
    if (group.status !== "active") return;
    const career = group.careers;
    const coordinator = career?.id ? careerCoordinator.get(career.id) : undefined;
    const base = {
      category: "grupos" as const,
      entityName: group.name,
      href: `/grupos/${group.id}`,
      careerId: career?.id,
      careerLabel: career?.code ?? career?.name ?? undefined,
      coordinatorId: coordinator?.id,
      coordinatorLabel: coordinator?.name,
      groupId: group.id,
      groupLabel: group.name,
      quarter: group.quarter ?? undefined
    };

    if ((group.group_subjects ?? []).length === 0) {
      addIssue(issues, {
        ...base,
        id: `group-${group.id}-subjects`,
        type: "grupo_sin_materias",
        severity: "critico",
        title: "Grupo sin materias",
        detail: "El grupo activo no tiene materias asociadas."
      });
    }

    if (!group.classroom_id && group.modality !== "virtual_modular") {
      addIssue(issues, {
        ...base,
        id: `group-${group.id}-classroom`,
        type: "grupo_sin_aula",
        severity: "advertencia",
        title: "Grupo sin aula",
        detail: "El grupo no tiene aula fija registrada."
      });
    }

    if (!canUseShift(group.modality, group.shift)) {
      addIssue(issues, {
        ...base,
        id: `group-${group.id}-modality-shift`,
        type: "grupo_modalidad_turno_invalido",
        severity: "critico",
        title: "Modalidad/turno invalido",
        detail: `${group.modality} no permite turno ${group.shift}.`
      });
    }

    ((group.group_subjects ?? []) as any[]).forEach((groupSubject) => {
      if (requiredProfilesFromGroupSubject(groupSubject).length === 0) {
        addIssue(issues, {
          ...base,
          id: `group-subject-${groupSubject.id}-profile`,
          type: "grupo_materia_sin_perfil",
          severity: "advertencia",
          title: "Materia del grupo sin perfil",
          detail: `${groupSubject.subjects?.name ?? "Materia"} no tiene perfil requerido definido.`
        });
      }
    });
  });

  const assignmentsByTeacherBlock = new Map<string, any[]>();
  (assignments ?? []).forEach((assignment: any) => {
    if (assignment.teacher_id && assignment.schedule_block_id) {
      const key = `${assignment.teacher_id}|${assignment.schedule_block_id}`;
      assignmentsByTeacherBlock.set(key, [...(assignmentsByTeacherBlock.get(key) ?? []), assignment]);
    }
  });

  (assignments ?? []).forEach((assignment: any) => {
    const group = assignment.group_subjects?.groups;
    const career = group?.careers;
    const coordinator = career?.id ? careerCoordinator.get(career.id) : undefined;
    const teacherProfiles = ((assignment.teachers?.teacher_available_profiles ?? []) as any[])
      .map((profile) => profile.profile_code)
      .filter(isValidProfileCode);
    const requiredProfiles = requiredProfilesFromAssignment(assignment);
    const teacherProfileSet = new Set(teacherProfiles.map((profile) => profile.toUpperCase()));
    const profileMatches =
      requiredProfiles.length === 0 || requiredProfiles.some((profile) => teacherProfileSet.has(profile.toUpperCase()));
    const base = {
      category: "asignaciones" as const,
      entityName: `${assignment.group_subjects?.subjects?.name ?? "Asignacion"} - ${assignment.teachers?.name ?? "Sin docente"}`,
      href: group?.id ? `/grupos/${group.id}` : "/grupos",
      careerId: career?.id,
      careerLabel: career?.code ?? career?.name ?? undefined,
      coordinatorId: coordinator?.id,
      coordinatorLabel: coordinator?.name,
      groupId: group?.id,
      groupLabel: group?.name,
      quarter: group?.quarter ?? undefined
    };

    if (!assignment.teacher_id) {
      addIssue(issues, {
        ...base,
        id: `assignment-${assignment.id}-teacher`,
        type: "asignacion_sin_docente",
        severity: "critico",
        title: "Asignacion sin docente",
        detail: "La asignacion activa no tiene docente."
      });
    }

    if (!assignment.schedule_block_id) {
      addIssue(issues, {
        ...base,
        id: `assignment-${assignment.id}-block`,
        type: "asignacion_sin_bloque",
        severity: "critico",
        title: "Asignacion sin bloque de horario",
        detail: "La asignacion activa no tiene bloque de horario."
      });
    }

    if (!assignment.classroom_id) {
      addIssue(issues, {
        ...base,
        id: `assignment-${assignment.id}-classroom`,
        type: "asignacion_sin_aula",
        severity: "advertencia",
        title: "Asignacion sin aula",
        detail: "La asignacion no tiene aula especifica; usara el aula del grupo si existe."
      });
    }

    if (!profileMatches) {
      addIssue(issues, {
        ...base,
        id: `assignment-${assignment.id}-profile`,
        type: "asignacion_docente_sin_perfil",
        severity: "critico",
        title: "Docente no cumple perfil",
        detail: `Requerido: ${requiredProfiles.join(", ")}. Docente: ${teacherProfiles.join(", ") || "sin perfiles"}.`
      });
    }

    if (Number(assignment.teachers?.assigned_hours ?? 0) > Number(assignment.teachers?.max_hours ?? 0)) {
      addIssue(issues, {
        ...base,
        id: `assignment-${assignment.id}-max-hours`,
        type: "asignacion_excede_horas",
        severity: "critico",
        title: "Docente excede horas maximas",
        detail: `${assignment.teachers?.assigned_hours ?? 0} / ${assignment.teachers?.max_hours ?? 0} h.`
      });
    }
  });

  assignmentsByTeacherBlock.forEach((collisions) => {
    if (collisions.length <= 1) return;
    collisions.forEach((assignment: any) => {
      const group = assignment.group_subjects?.groups;
      addIssue(issues, {
        id: `assignment-${assignment.id}-collision`,
        category: "asignaciones",
        type: "asignacion_choque_docente",
        severity: "critico",
        title: "Choque de horario del docente",
        detail: "El docente aparece en mas de una asignacion activa en el mismo bloque.",
        entityName: assignment.teachers?.name ?? "Docente",
        href: group?.id ? `/grupos/${group.id}` : "/grupos",
        groupId: group?.id,
        groupLabel: group?.name,
        quarter: group?.quarter ?? undefined
      });
    });
  });

  const assignmentRows = (assignments ?? []) as any[];
  for (let index = 0; index < assignmentRows.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < assignmentRows.length; nextIndex += 1) {
      const left = assignmentRows[index];
      const right = assignmentRows[nextIndex];
      if (!schedulesOverlap(left, right)) continue;

      const leftGroup = left.group_subjects?.groups;
      const rightGroup = right.group_subjects?.groups;
      const sameGroup = leftGroup?.id && leftGroup.id === rightGroup?.id;
      const leftClassroom = left.classroom_id ?? leftGroup?.classroom_id;
      const rightClassroom = right.classroom_id ?? rightGroup?.classroom_id;
      const sameClassroom = leftClassroom && leftClassroom === rightClassroom;

      if (sameGroup) {
        [
          [left, right],
          [right, left]
        ].forEach(([assignment, otherAssignment]) => {
          const group = assignment.group_subjects?.groups;
          addIssue(issues, {
            id: `assignment-${assignment.id}-group-collision-${otherAssignment.id}`,
            category: "asignaciones",
            type: "asignacion_choque_grupo",
            severity: "critico",
            title: "Choque de horario del grupo",
            detail: "El grupo tiene mas de una asignacion activa en horario simultaneo.",
            entityName: group?.name ?? "Grupo",
            href: group?.id ? `/grupos/${group.id}` : "/grupos",
            groupId: group?.id,
            groupLabel: group?.name,
            quarter: group?.quarter ?? undefined
          });
        });
      }

      if (sameClassroom) {
        [
          [left, right],
          [right, left]
        ].forEach(([assignment, otherAssignment]) => {
          const group = assignment.group_subjects?.groups;
          addIssue(issues, {
            id: `assignment-${assignment.id}-classroom-collision-${otherAssignment.id}`,
            category: "asignaciones",
            type: "asignacion_choque_aula",
            severity: "critico",
            title: "Choque de horario del aula",
            detail: "El aula aparece en mas de una asignacion activa en horario simultaneo.",
            entityName: group?.name ?? "Aula",
            href: group?.id ? `/grupos/${group.id}` : "/grupos",
            groupId: group?.id,
            groupLabel: group?.name,
            quarter: group?.quarter ?? undefined
          });
        });
      }
    }
  }

  const summary = {
    docentes: issues.filter((issue) => issue.category === "docentes").length,
    materias: issues.filter((issue) => issue.category === "materias").length,
    grupos: issues.filter((issue) => issue.category === "grupos").length,
    asignaciones: issues.filter((issue) => issue.category === "asignaciones").length
  };

  return { issues, summary };
}
