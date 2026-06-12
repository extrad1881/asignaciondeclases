import { describe, expect, it } from "vitest";
import { validateAssignmentDraft } from "../lib/validations/assignments";

const validDraft = {
  teacherId: "teacher-1",
  teacherProfiles: ["ADEM", "TRA"],
  requiredProfiles: ["ADEM"],
  teacherAssignedHours: 8,
  teacherMaxHours: 20,
  blockHours: 2,
  hasTeacherCollision: false,
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
});
