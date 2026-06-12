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
  let deniedGroupId = "";
  let adminSubjectId = "";

  beforeAll(async () => {
    adminClient = await createAuthenticatedTestClient("admin@local.test", "Admin123!");
    coordinatorClient = await createAuthenticatedTestClient("coordinador@local.test", "Coord123!");

    const coordinator = await requireSingle<{ id: string }>(
      service.from("coordinators").select("id").eq("profile_id", COORDINATOR_USER_ID).single()
    );
    coordinatorId = coordinator.id;

    const cycle = await requireSingle<{ id: string }>(
      service.from("academic_cycles").select("id").eq("active", true).limit(1).single()
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
    await deleteByIds(service, "groups", [deniedGroupId]);
    await deleteByIds(service, "subjects", [adminSubjectId]);
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
