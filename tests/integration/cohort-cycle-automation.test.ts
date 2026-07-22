import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAuthenticatedTestClient,
  createServiceTestClient,
  requireSingle
} from "../helpers/supabase-test-client";

function asResult(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("La RPC no devolvió un objeto JSON.");
  }
  return value as Record<string, unknown>;
}

describe("automatización de cohortes por ciclo", () => {
  const prefix = `TST_COHORT_${Date.now().toString(36).toUpperCase()}`;
  const service = createServiceTestClient();
  let adminClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let coordinatorClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let originalCycleId = "";
  let secondCycleId = "";
  let thirdCycleId = "";
  let failingCycleId = "";
  let careerId = "";
  let gapCareerId = "";
  let cohortId = "";
  let gapCohortId = "";
  let firstSubjectId = "";
  let secondSubjectId = "";
  let thirdSubjectId = "";
  let gapFirstSubjectId = "";
  let gapThirdSubjectId = "";
  let initialGroupId = "";
  let mismatchedGroupId = "";

  beforeAll(async () => {
    adminClient = await createAuthenticatedTestClient("admin@local.test", "Admin123!");
    coordinatorClient = await createAuthenticatedTestClient("coordinador@local.test", "Coord123!");

    const activeCycle = await requireSingle<{ id: string }>(
      service.from("academic_cycles").select("id").eq("status", "active").single()
    );
    originalCycleId = activeCycle.id;

    const { data: careers, error: careersError } = await service
      .from("careers")
      .insert([
        {
          code: `${prefix}_C`,
          name: `${prefix} Carrera`,
          normalized_name: `${prefix} CARRERA`,
          active: true
        },
        {
          code: `${prefix}_G`,
          name: `${prefix} Carrera con hueco`,
          normalized_name: `${prefix} CARRERA CON HUECO`,
          active: true
        }
      ])
      .select("id, code");
    if (careersError) throw new Error(careersError.message);
    careerId = careers?.find((career) => career.code.endsWith("_C"))?.id ?? "";
    gapCareerId = careers?.find((career) => career.code.endsWith("_G"))?.id ?? "";

    const { data: subjects, error: subjectsError } = await service
      .from("subjects")
      .insert([
        {
          career_id: careerId,
          quarter: 1,
          name: `${prefix} Materia Q1`,
          normalized_name: `${prefix} MATERIA Q1`,
          default_hours: 4,
          active: true
        },
        {
          career_id: careerId,
          quarter: 2,
          name: `${prefix} Materia Q2`,
          normalized_name: `${prefix} MATERIA Q2`,
          default_hours: 5,
          active: true
        },
        {
          career_id: careerId,
          quarter: 3,
          name: `${prefix} Materia Q3`,
          normalized_name: `${prefix} MATERIA Q3`,
          default_hours: 6,
          active: true
        },
        {
          career_id: gapCareerId,
          quarter: 1,
          name: `${prefix} Hueco Q1`,
          normalized_name: `${prefix} HUECO Q1`,
          default_hours: 4,
          active: true
        },
        {
          career_id: gapCareerId,
          quarter: 3,
          name: `${prefix} Hueco Q3`,
          normalized_name: `${prefix} HUECO Q3`,
          default_hours: 4,
          active: true
        }
      ])
      .select("id, career_id, quarter");
    if (subjectsError) throw new Error(subjectsError.message);
    firstSubjectId = subjects?.find((subject) => subject.career_id === careerId && subject.quarter === 1)?.id ?? "";
    secondSubjectId = subjects?.find((subject) => subject.career_id === careerId && subject.quarter === 2)?.id ?? "";
    thirdSubjectId = subjects?.find((subject) => subject.career_id === careerId && subject.quarter === 3)?.id ?? "";
    gapFirstSubjectId = subjects?.find((subject) => subject.career_id === gapCareerId && subject.quarter === 1)?.id ?? "";
    gapThirdSubjectId = subjects?.find((subject) => subject.career_id === gapCareerId && subject.quarter === 3)?.id ?? "";

    const { data: cohort, error: cohortError } = await adminClient
      .from("cohort_groups")
      .insert({
        name: `${prefix} Generación`,
        career_id: careerId,
        modality: "escolarizado",
        shift: "matutino",
        current_quarter: 1,
        status: "active"
      })
      .select("id")
      .single();
    if (cohortError || !cohort) throw new Error(cohortError?.message ?? "No se creó la cohorte temporal.");
    cohortId = cohort.id;

    const { data: initialGroup, error: initialGroupError } = await adminClient.rpc(
      "create_initial_cohort_group_with_subjects",
      {
        p_academic_cycle_id: originalCycleId,
        p_career_id: careerId,
        p_quarter: 1,
        p_modality: "escolarizado",
        p_shift: "matutino",
        p_name: `${prefix} Grupo Q1`,
        p_classroom_id: null,
        p_subjects: [{ subject_id: firstSubjectId, hours_per_week: 4 }],
        p_cohort_group_id: cohortId,
        p_completed_subject_ids: []
      }
    );
    if (initialGroupError || !initialGroup) {
      throw new Error(initialGroupError?.message ?? "No se creó el grupo inicial.");
    }
    initialGroupId = initialGroup;

    const { data: cycles, error: cyclesError } = await adminClient
      .from("academic_cycles")
      .insert([
        { code: `${prefix}_2`, name: `${prefix} Ciclo 2`, status: "draft", active: false },
        { code: `${prefix}_3`, name: `${prefix} Ciclo 3`, status: "draft", active: false },
        { code: `${prefix}_4`, name: `${prefix} Ciclo fallido`, status: "draft", active: false }
      ])
      .select("id, code");
    if (cyclesError) throw new Error(cyclesError.message);
    secondCycleId = cycles?.find((cycle) => cycle.code.endsWith("_2"))?.id ?? "";
    thirdCycleId = cycles?.find((cycle) => cycle.code.endsWith("_3"))?.id ?? "";
    failingCycleId = cycles?.find((cycle) => cycle.code.endsWith("_4"))?.id ?? "";
  });

  afterAll(async () => {
    await service.from("groups").delete().in("cohort_group_id", [cohortId, gapCohortId].filter(Boolean));
    if (mismatchedGroupId) await service.from("groups").delete().eq("id", mismatchedGroupId);
    await service.from("cohort_groups").delete().in("id", [cohortId, gapCohortId].filter(Boolean));
    await service
      .from("subjects")
      .delete()
      .in("id", [firstSubjectId, secondSubjectId, thirdSubjectId, gapFirstSubjectId, gapThirdSubjectId].filter(Boolean));

    const temporaryCycleIds = [secondCycleId, thirdCycleId, failingCycleId].filter(Boolean);
    if (temporaryCycleIds.length > 0) {
      await service.from("academic_cycles").update({ status: "finalized" }).in("id", temporaryCycleIds);
    }
    if (originalCycleId) {
      await service.from("academic_cycles").update({ status: "active" }).eq("id", originalCycleId);
    }
    if (temporaryCycleIds.length > 0) {
      await service.from("academic_cycles").delete().in("id", temporaryCycleIds);
    }
    await service.from("careers").delete().in("id", [careerId, gapCareerId].filter(Boolean));
  });

  it("vincula el primer grupo manualmente y rechaza una segunda inicialización", async () => {
    const group = await requireSingle<{ cohort_group_id: string; quarter: number }>(
      service.from("groups").select("cohort_group_id, quarter").eq("id", initialGroupId).single()
    );
    expect(group.cohort_group_id).toBe(cohortId);
    expect(group.quarter).toBe(1);

    const { error } = await adminClient.rpc("create_initial_cohort_group_with_subjects", {
      p_academic_cycle_id: originalCycleId,
      p_career_id: careerId,
      p_quarter: 1,
      p_modality: "escolarizado",
      p_shift: "matutino",
      p_name: `${prefix} Grupo duplicado`,
      p_classroom_id: null,
      p_subjects: [{ subject_id: firstSubjectId, hours_per_week: 4 }],
      p_cohort_group_id: cohortId,
      p_completed_subject_ids: []
    });
    expect(error?.message).toContain("ya tiene su grupo inicial");
  });

  it("impide que un coordinador active ciclos", async () => {
    const { error } = await coordinatorClient.rpc("activate_academic_cycle_and_advance_cohorts", {
      p_cycle_id: secondCycleId
    });
    expect(error?.message).toContain("Solo el administrador");

    const cycle = await requireSingle<{ status: string }>(
      service.from("academic_cycles").select("status").eq("id", secondCycleId).single()
    );
    expect(cycle.status).toBe("draft");
  });

  it("activa el ciclo y crea automáticamente el grupo siguiente con sus materias", async () => {
    const { data, error } = await adminClient.rpc("activate_academic_cycle_and_advance_cohorts", {
      p_cycle_id: secondCycleId
    });
    expect(error).toBeNull();
    expect(asResult(data).generated_count).toBe(1);

    const { data: groups, error: groupsError } = await service
      .from("groups")
      .select("id, quarter, cohort_group_id, group_subjects(subject_id, hours_per_week)")
      .eq("cohort_group_id", cohortId)
      .eq("academic_cycle_id", secondCycleId);
    expect(groupsError).toBeNull();
    expect(groups).toHaveLength(1);
    expect(groups?.[0]?.quarter).toBe(2);
    expect(groups?.[0]?.group_subjects).toEqual([
      expect.objectContaining({ subject_id: secondSubjectId, hours_per_week: 5 })
    ]);

    const cohort = await requireSingle<{ current_quarter: number }>(
      service.from("cohort_groups").select("current_quarter").eq("id", cohortId).single()
    );
    expect(cohort.current_quarter).toBe(2);

    const history = await requireSingle<{ subject_id: string; group_id: string }>(
      service
        .from("cohort_subject_history")
        .select("subject_id, group_id")
        .eq("cohort_group_id", cohortId)
        .eq("subject_id", firstSubjectId)
        .single()
    );
    expect(history.group_id).toBe(initialGroupId);
  });

  it("es idempotente al reintentar la activación del mismo ciclo", async () => {
    const { data, error } = await adminClient.rpc("activate_academic_cycle_and_advance_cohorts", {
      p_cycle_id: secondCycleId
    });
    expect(error).toBeNull();
    expect(asResult(data).generated_count).toBe(0);
    expect(asResult(data).skipped_count).toBe(1);

    const { count, error: countError } = await service
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("cohort_group_id", cohortId)
      .eq("academic_cycle_id", secondCycleId);
    expect(countError).toBeNull();
    expect(count).toBe(1);
  });

  it("avanza la misma cohorte en el siguiente ciclo sin captura manual", async () => {
    const { data, error } = await adminClient.rpc("activate_academic_cycle_and_advance_cohorts", {
      p_cycle_id: thirdCycleId
    });
    expect(error).toBeNull();
    expect(asResult(data).generated_count).toBe(1);

    const group = await requireSingle<{ quarter: number }>(
      service
        .from("groups")
        .select("quarter")
        .eq("cohort_group_id", cohortId)
        .eq("academic_cycle_id", thirdCycleId)
        .single()
    );
    expect(group.quarter).toBe(3);

    const subjects = await service
      .from("group_subjects")
      .select("subject_id, groups!inner(cohort_group_id, academic_cycle_id)")
      .eq("groups.cohort_group_id", cohortId)
      .eq("groups.academic_cycle_id", thirdCycleId);
    expect(subjects.error).toBeNull();
    expect(subjects.data?.map((subject) => subject.subject_id)).toEqual([thirdSubjectId]);
  });

  it("protege en base de datos la configuración de la cohorte", async () => {
    const { data: group, error: groupError } = await service
      .from("groups")
      .insert({
        academic_cycle_id: thirdCycleId,
        career_id: careerId,
        quarter: 3,
        modality: "modular",
        shift: "matutino",
        name: `${prefix} Configuración incorrecta`,
        status: "draft"
      })
      .select("id")
      .single();
    if (groupError || !group) throw new Error(groupError?.message ?? "No se creó el grupo de prueba.");
    mismatchedGroupId = group.id;

    const { error } = await service
      .from("groups")
      .update({ cohort_group_id: cohortId })
      .eq("id", mismatchedGroupId);
    expect(error?.message).toContain("coincidir con la carrera, modalidad y turno");
  });

  it("revierte toda la activación si falta el plan de materias de una cohorte", async () => {
    const { data: cohort, error: cohortError } = await adminClient
      .from("cohort_groups")
      .insert({
        name: `${prefix} Cohorte con hueco`,
        career_id: gapCareerId,
        modality: "escolarizado",
        shift: "matutino",
        current_quarter: 1,
        status: "active"
      })
      .select("id")
      .single();
    if (cohortError || !cohort) throw new Error(cohortError?.message ?? "No se creó la cohorte con hueco.");
    gapCohortId = cohort.id;

    const { error: initialError } = await adminClient.rpc("create_initial_cohort_group_with_subjects", {
      p_academic_cycle_id: thirdCycleId,
      p_career_id: gapCareerId,
      p_quarter: 1,
      p_modality: "escolarizado",
      p_shift: "matutino",
      p_name: `${prefix} Hueco Grupo Q1`,
      p_classroom_id: null,
      p_subjects: [{ subject_id: gapFirstSubjectId, hours_per_week: 4 }],
      p_cohort_group_id: gapCohortId,
      p_completed_subject_ids: []
    });
    expect(initialError).toBeNull();

    const { error } = await adminClient.rpc("activate_academic_cycle_and_advance_cohorts", {
      p_cycle_id: failingCycleId
    });
    expect(error?.message).toContain("no tiene materias activas para el cuatrimestre 2");

    const activeCycle = await requireSingle<{ id: string }>(
      service.from("academic_cycles").select("id").eq("status", "active").single()
    );
    expect(activeCycle.id).toBe(thirdCycleId);

    const failedCycle = await requireSingle<{ status: string }>(
      service.from("academic_cycles").select("status").eq("id", failingCycleId).single()
    );
    expect(failedCycle.status).toBe("draft");

    const originalCohort = await requireSingle<{ status: string; current_quarter: number }>(
      service.from("cohort_groups").select("status, current_quarter").eq("id", cohortId).single()
    );
    expect(originalCohort).toEqual({ status: "active", current_quarter: 3 });
  });
});
