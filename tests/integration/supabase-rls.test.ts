import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ADMIN_USER_ID,
  COORDINATOR_USER_ID,
  createAuthenticatedTestClient,
  createServiceTestClient,
  deleteByIds,
  requireSingle
} from "../helpers/supabase-test-client";

describe("Supabase RLS", () => {
  const prefix = `TST_RLS_${Date.now().toString(36).toUpperCase()}`;
  const service = createServiceTestClient();
  let adminClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let coordinatorClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let coordinatorId = "";
  let allowedCareerId = "";
  let deniedCareerId = "";
  let allowedTeacherId = "";
  let deniedTeacherId = "";
  let allowedGroupId = "";
  let allowedGroupSubjectId = "";
  let allowedSubjectId = "";
  let deniedGroupId = "";
  let adminSubjectId = "";
  let allowedCohortId = "";

  beforeAll(async () => {
    adminClient = await createAuthenticatedTestClient("admin@local.test", "Admin123!");
    coordinatorClient = await createAuthenticatedTestClient("coordinador@local.test", "Coord123!");

    const coordinator = await requireSingle<{ id: string }>(
      service.from("coordinators").select("id").eq("profile_id", COORDINATOR_USER_ID).single()
    );
    coordinatorId = coordinator.id;

    const cycle = await requireSingle<{ id: string }>(
      service.from("academic_cycles").select("id").eq("status", "active").limit(1).single()
    );
    const classroom = await requireSingle<{ id: string }>(
      service.from("classrooms").select("id").eq("active", true).limit(1).single()
    );

    const { data: careers, error: careersError } = await service
      .from("careers")
      .insert([
        { code: `${prefix}_A`, name: `${prefix} Permitida`, normalized_name: `${prefix} PERMITIDA`, active: true },
        { code: `${prefix}_D`, name: `${prefix} Denegada`, normalized_name: `${prefix} DENEGADA`, active: true }
      ])
      .select("id, code");
    if (careersError) throw new Error(careersError.message);
    allowedCareerId = careers?.find((career) => career.code.endsWith("_A"))?.id ?? "";
    deniedCareerId = careers?.find((career) => career.code.endsWith("_D"))?.id ?? "";

    const { error: coordinatorCareerError } = await service.from("coordinator_careers").insert({
      coordinator_id: coordinatorId,
      career_id: allowedCareerId
    });
    if (coordinatorCareerError) throw new Error(coordinatorCareerError.message);

    const { data: teachers, error: teachersError } = await service
      .from("teachers")
      .insert([
        {
          name: `${prefix} Docente Permitido`,
          normalized_name: `${prefix} DOCENTE PERMITIDO`,
          max_hours: 20,
          active: true,
          responsible_coordinator_id: coordinatorId
        },
        {
          name: `${prefix} Docente Denegado`,
          normalized_name: `${prefix} DOCENTE DENEGADO`,
          max_hours: 20,
          active: true
        }
      ])
      .select("id, name");
    if (teachersError) throw new Error(teachersError.message);
    allowedTeacherId = teachers?.find((teacher) => teacher.name.includes("Permitido"))?.id ?? "";
    deniedTeacherId = teachers?.find((teacher) => teacher.name.includes("Denegado"))?.id ?? "";

    const { error: coordinatorTeacherError } = await service.from("coordinator_teachers").insert({
      coordinator_id: coordinatorId,
      teacher_id: allowedTeacherId
    });
    if (coordinatorTeacherError) throw new Error(coordinatorTeacherError.message);

    const { data: allowedSubject, error: allowedSubjectError } = await service
      .from("subjects")
      .insert({
        career_id: allowedCareerId,
        name: `${prefix} Materia Permitida`,
        normalized_name: `${prefix} MATERIA PERMITIDA`,
        quarter: 1,
        default_hours: 5,
        active: true
      })
      .select("id")
      .single();
    if (allowedSubjectError || !allowedSubject) {
      throw new Error(allowedSubjectError?.message ?? "No se pudo crear la materia permitida.");
    }
    allowedSubjectId = allowedSubject.id;

    const { data: allowedGroup, error: allowedGroupError } = await service
      .from("groups")
      .insert({
        academic_cycle_id: cycle.id,
        career_id: allowedCareerId,
        quarter: 1,
        modality: "escolarizado",
        shift: "matutino",
        name: `${prefix} Grupo Permitido`,
        classroom_id: classroom.id,
        status: "draft"
      })
      .select("id")
      .single();
    if (allowedGroupError || !allowedGroup) {
      throw new Error(allowedGroupError?.message ?? "No se pudo crear el grupo permitido.");
    }
    allowedGroupId = allowedGroup.id;

    const { data: allowedGroupSubject, error: allowedGroupSubjectError } = await service
      .from("group_subjects")
      .insert({
        group_id: allowedGroupId,
        subject_id: allowedSubjectId,
        hours_per_week: 5,
        status: "active"
      })
      .select("id")
      .single();
    if (allowedGroupSubjectError || !allowedGroupSubject) {
      throw new Error(allowedGroupSubjectError?.message ?? "No se pudo vincular la materia permitida.");
    }
    allowedGroupSubjectId = allowedGroupSubject.id;

    const { error: assignedHoursError } = await service
      .from("teachers")
      .update({ assigned_hours: 5 })
      .eq("id", allowedTeacherId);
    if (assignedHoursError) throw new Error(assignedHoursError.message);

    const { data: deniedGroup, error: groupError } = await service
      .from("groups")
      .insert({
        academic_cycle_id: cycle.id,
        career_id: deniedCareerId,
        quarter: 1,
        modality: "escolarizado",
        shift: "matutino",
        name: `${prefix} Grupo Denegado`,
        classroom_id: classroom.id,
        status: "active"
      })
      .select("id")
      .single();
    if (groupError) throw new Error(groupError.message);
    deniedGroupId = deniedGroup.id;
  });

  afterAll(async () => {
    await service.from("coordinator_teachers").delete().eq("coordinator_id", coordinatorId).in("teacher_id", [allowedTeacherId]);
    await service.from("coordinator_careers").delete().eq("coordinator_id", coordinatorId).in("career_id", [allowedCareerId]);
    await deleteByIds(service, "cohort_groups", [allowedCohortId]);
    await deleteByIds(service, "group_subjects", [allowedGroupSubjectId]);
    await deleteByIds(service, "groups", [allowedGroupId, deniedGroupId]);
    await deleteByIds(service, "subjects", [allowedSubjectId, adminSubjectId]);
    await deleteByIds(service, "teachers", [allowedTeacherId, deniedTeacherId]);
    await deleteByIds(service, "careers", [allowedCareerId, deniedCareerId]);
  });

  it("un coordinador solo ve carreras asignadas", async () => {
    const { data, error } = await coordinatorClient.from("careers").select("id").in("id", [allowedCareerId, deniedCareerId]);
    expect(error).toBeNull();
    const ids = new Set((data ?? []).map((career) => career.id));
    expect(ids.has(allowedCareerId)).toBe(true);
    expect(ids.has(deniedCareerId)).toBe(false);
  });

  it("un coordinador solo ve docentes permitidos", async () => {
    const { data, error } = await coordinatorClient.from("teachers").select("id").in("id", [allowedTeacherId, deniedTeacherId]);
    expect(error).toBeNull();
    const ids = new Set((data ?? []).map((teacher) => teacher.id));
    expect(ids.has(allowedTeacherId)).toBe(true);
    expect(ids.has(deniedTeacherId)).toBe(false);
  });

  it("un coordinador no puede modificar usuarios administrativos", async () => {
    await coordinatorClient.from("users_profile").update({ display_name: `${prefix} Hack` }).eq("id", ADMIN_USER_ID);

    const profile = await requireSingle<{ display_name: string }>(
      service.from("users_profile").select("display_name").eq("id", ADMIN_USER_ID).single()
    );
    expect(profile.display_name).not.toBe(`${prefix} Hack`);
  });

  it("un coordinador no puede borrar grupos de carreras ajenas usando ids directos", async () => {
    await coordinatorClient.from("groups").delete().eq("id", deniedGroupId);

    const group = await requireSingle<{ id: string }>(service.from("groups").select("id").eq("id", deniedGroupId).single());
    expect(group.id).toBe(deniedGroupId);
  });

  it("un coordinador no puede finalizar o archivar un grupo mediante la API directa", async () => {
    const { error } = await coordinatorClient
      .from("groups")
      .update({ status: "final" })
      .eq("id", allowedGroupId);

    expect(error?.code).toBe("42501");
    const group = await requireSingle<{ status: string }>(
      service.from("groups").select("status").eq("id", allowedGroupId).single()
    );
    expect(group.status).toBe("draft");
  });

  it("un coordinador solo cambia horas, no elimina ni reubica materias del grupo", async () => {
    const { error: hoursError } = await coordinatorClient
      .from("group_subjects")
      .update({ hours_per_week: 1 })
      .eq("id", allowedGroupSubjectId);
    expect(hoursError).toBeNull();

    const { error: statusError } = await coordinatorClient
      .from("group_subjects")
      .update({ status: "inactive" })
      .eq("id", allowedGroupSubjectId);
    expect(statusError?.code).toBe("42501");

    const { error: deleteError } = await coordinatorClient
      .from("group_subjects")
      .delete()
      .eq("id", allowedGroupSubjectId);
    expect(deleteError?.code).toBe("42501");

    const relation = await requireSingle<{ hours_per_week: number; status: string }>(
      service
        .from("group_subjects")
        .select("hours_per_week, status")
        .eq("id", allowedGroupSubjectId)
        .single()
    );
    expect(Number(relation.hours_per_week)).toBe(1);
    expect(relation.status).toBe("active");
  });

  it("un coordinador no baja la carga máxima debajo de las horas asignadas", async () => {
    const { error } = await coordinatorClient
      .from("teachers")
      .update({ max_hours: 4 })
      .eq("id", allowedTeacherId);

    expect(error?.message).toContain("debajo de las horas ya asignadas");
    const teacher = await requireSingle<{ max_hours: number }>(
      service.from("teachers").select("max_hours").eq("id", allowedTeacherId).single()
    );
    expect(Number(teacher.max_hours)).toBe(20);
  });

  it("una RPC SECURITY DEFINER no revela horas de grupos de carreras ajenas", async () => {
    const { data, error } = await coordinatorClient.rpc("check_group_subject_hours", {
      target_group_id: deniedGroupId
    });

    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
    expect(error?.message).toContain("No tienes permiso");
  });

  it("un coordinador solo crea cohortes dentro de sus carreras", async () => {
    const { data: allowedCohort, error: allowedError } = await coordinatorClient
      .from("cohort_groups")
      .insert({
        name: `${prefix} Cohorte Permitida`,
        career_id: allowedCareerId,
        modality: "escolarizado",
        shift: "matutino",
        current_quarter: 1,
        status: "active"
      })
      .select("id")
      .single();
    expect(allowedError).toBeNull();
    allowedCohortId = allowedCohort?.id ?? "";

    const { error: deniedError } = await coordinatorClient.from("cohort_groups").insert({
      name: `${prefix} Cohorte Denegada`,
      career_id: deniedCareerId,
      modality: "escolarizado",
      shift: "matutino",
      current_quarter: 1,
      status: "active"
    });
    expect(deniedError?.code).toBe("42501");
  });

  it("un admin puede gestionar catalogos completos", async () => {
    const { data: subject, error: insertError } = await adminClient
      .from("subjects")
      .insert({
        career_id: allowedCareerId,
        name: `${prefix} Materia Admin`,
        normalized_name: `${prefix} MATERIA ADMIN`,
        quarter: 1,
        default_hours: 5,
        active: true
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();
    adminSubjectId = subject?.id ?? "";

    const { error: updateError } = await adminClient
      .from("subjects")
      .update({ default_hours: 6 })
      .eq("id", adminSubjectId);
    expect(updateError).toBeNull();
  });

  it("un cliente autenticado no salta permisos con ids directos", async () => {
    const before = await requireSingle<{ max_hours: number }>(
      service.from("teachers").select("max_hours").eq("id", deniedTeacherId).single()
    );
    await coordinatorClient.from("teachers").update({ max_hours: 33 }).eq("id", deniedTeacherId);

    const after = await requireSingle<{ max_hours: number }>(
      service.from("teachers").select("max_hours").eq("id", deniedTeacherId).single()
    );
    expect(Number(after.max_hours)).toBe(Number(before.max_hours));
  });
});
