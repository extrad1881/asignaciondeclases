import { describe, expect, it } from "vitest";
import { validateAssignmentDraft } from "../lib/validations/assignments";
import { findScheduleTemplate } from "../lib/schedule/templates";
import { groupSchema } from "../lib/validations/groups";

const validDraft = {
  teacherId: "teacher-1",
  teacherProfiles: ["ADEM", "TRA"],
  requiredProfiles: ["ADEM"],
  teacherAssignedHours: 8,
  teacherMaxHours: 20,
  blockHours: 2,
  hasTeacherCollision: false,
  hasGroupCollision: false,
  hasClassroomCollision: false,
  hasSubjectBlockTeacher: false,
  teacherAllowed: true,
  blockAllowed: true
};

describe("validateAssignmentDraft", () => {
  it("accepts a valid assignment draft", () => {
    expect(validateAssignmentDraft(validDraft)).toEqual([]);
  });

  it("rejects collisions and exceeded hours", () => {
    expect(
      validateAssignmentDraft({
        ...validDraft,
        teacherAssignedHours: 19,
        blockHours: 2,
        hasTeacherCollision: true
      })
    ).toContain("El docente excede su límite de horas.");
  });

  it("rejects incompatible profiles", () => {
    expect(
      validateAssignmentDraft({
        ...validDraft,
        teacherProfiles: ["SISCOM"],
        requiredProfiles: ["ADEM"]
      })
    ).toContain("El docente no cumple con el perfil requerido para esta materia.");
  });

  it("rejects group and classroom collisions", () => {
    expect(
      validateAssignmentDraft({
        ...validDraft,
        hasGroupCollision: true
      })
    ).toContain("El grupo ya tiene una clase asignada en este horario.");

    expect(
      validateAssignmentDraft({
        ...validDraft,
        hasClassroomCollision: true
      })
    ).toContain("El aula ya tiene una clase asignada en este horario.");
  });
});

describe("sabatino schedule support", () => {
  it("expone tres bloques sabatinos canónicos sin módulos duplicados", () => {
    const matutino = findScheduleTemplate("sabatino", "matutino");
    const vespertino = findScheduleTemplate("sabatino", "vespertino");

    expect(matutino?.code).toBe("sabatino-matutino");
    expect(vespertino?.code).toBe("sabatino-vespertino");
    expect(matutino?.blocks).toHaveLength(3);
    expect(vespertino?.blocks).toHaveLength(3);
    expect(matutino?.blocks.every((block) => block.dayOfWeek === 6 && block.module == null)).toBe(true);
    expect(vespertino?.blocks.every((block) => block.dayOfWeek === 6 && block.module == null)).toBe(true);
  });

  it("accepts sabatino groups in matutino and vespertino shifts", () => {
    const baseGroup = {
      academic_cycle_id: "84fd66f3-0a36-4619-8670-743d34dd4c23",
      career_id: "44c55824-e320-4942-9232-5e8fe99f1abc",
      quarter: 1,
      modality: "sabatino",
      name: "Sabatino 1A",
      classroom_id: ""
    };

    expect(groupSchema.safeParse({ ...baseGroup, shift: "matutino" }).success).toBe(true);
    expect(groupSchema.safeParse({ ...baseGroup, shift: "vespertino" }).success).toBe(true);
  });
});
