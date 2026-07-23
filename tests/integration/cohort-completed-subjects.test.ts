import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAuthenticatedTestClient,
  createServiceTestClient,
  requireSingle
} from "../helpers/supabase-test-client";

describe("historial inicial de materias de una cohorte", () => {
  const prefix = `TST_COHORT_HISTORY_${Date.now().toString(36).toUpperCase()}`;
  const service = createServiceTestClient();
  let adminClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let cycleId = "";
  let careerId = "";
  let previousSubjectId = "";
  let currentSubjectId = "";
  let cohortId = "";
  let invalidCohortId = "";
  let groupId = "";

  beforeAll(async () => {
    adminClient = await createAuthenticatedTestClient("admin@local.test", "Admin123!");

    const cycle = await requireSingle<{ id: string }>(
      service.from("academic_cycles").select("id").eq("status", "active").single()
    );
    cycleId = cycle.id;

    const career = await requireSingle<{ id: string }>(
      adminClient
        .from("careers")
        .insert({
          code: `${prefix}_C`,
          name: `${prefix} Carrera`,
          normalized_name: `${prefix} CARRERA`,
          active: true
        })
        .select("id")
        .single()
    );
    careerId = career.id;

    const { data: subjects, error: subjectsError } = await adminClient
      .from("subjects")
      .insert([
        {
          career_id: careerId,
          quarter: 1,
          name: `${prefix} Materia cursada`,
          normalized_name: `${prefix} MATERIA CURSADA`,
          default_hours: 4,
          active: true
        },
        {
          career_id: careerId,
          quarter: 2,
          name: `${prefix} Materia actual`,
          normalized_name: `${prefix} MATERIA ACTUAL`,
          default_hours: 5,
          active: true
        }
      ])
      .select("id, quarter");
    if (subjectsError) throw new Error(subjectsError.message);
    previousSubjectId = subjects?.find((subject) => subject.quarter === 1)?.id ?? "";
    currentSubjectId = subjects?.find((subject) => subject.quarter === 2)?.id ?? "";

    const { data: cohorts, error: cohortsError } = await adminClient
      .from("cohort_groups")
      .insert([
        {
          name: `${prefix} Cohorte válida`,
          career_id: careerId,
          modality: "escolarizado",
          shift: "matutino",
          current_quarter: 2,
          status: "active"
        },
        {
          name: `${prefix} Cohorte inválida`,
          career_id: careerId,
          modality: "escolarizado",
          shift: "matutino",
          current_quarter: 2,
          status: "active"
        }
      ])
      .select("id, name");
    if (cohortsError) throw new Error(cohortsError.message);
    cohortId = cohorts?.find((cohort) => cohort.name.endsWith("Cohorte válida"))?.id ?? "";
    invalidCohortId = cohorts?.find((cohort) => cohort.name.endsWith("Cohorte inválida"))?.id ?? "";
  });

  afterAll(async () => {
    const { data: groups = [] } = await service
      .from("groups")
      .select("id")
      .in("cohort_group_id", [cohortId, invalidCohortId].filter(Boolean));
    const groupIds = (groups ?? []).map((group) => group.id);

    if (groupIds.length > 0) {
      await service.from("groups").delete().in("id", groupIds);
    }
    await service.from("cohort_groups").delete().in("id", [cohortId, invalidCohortId].filter(Boolean));
    await service.from("subjects").delete().in("id", [previousSubjectId, currentSubjectId].filter(Boolean));
    if (careerId) await service.from("careers").delete().eq("id", careerId);

    const auditedIds = [
      ...groupIds,
      cohortId,
      invalidCohortId,
      previousSubjectId,
      currentSubjectId,
      careerId
    ].filter(Boolean);
    if (auditedIds.length > 0) {
      await service.from("audit_logs").delete().in("record_id", auditedIds);
    }
  });

  it("registra las materias anteriores seleccionadas sin agregarlas al grupo actual", async () => {
    const { data, error } = await adminClient.rpc("create_initial_cohort_group_with_subjects", {
      p_academic_cycle_id: cycleId,
      p_career_id: careerId,
      p_quarter: 2,
      p_modality: "escolarizado",
      p_shift: "matutino",
      p_name: `${prefix} Grupo Q2`,
      p_classroom_id: null,
      p_subjects: [{ subject_id: currentSubjectId, hours_per_week: 5 }],
      p_cohort_group_id: cohortId,
      p_completed_subject_ids: [previousSubjectId]
    });
    expect(error).toBeNull();
    groupId = data ?? "";

    const history = await requireSingle<{ subject_id: string; quarter: number; group_id: string | null }>(
      service
        .from("cohort_subject_history")
        .select("subject_id, quarter, group_id")
        .eq("cohort_group_id", cohortId)
        .eq("subject_id", previousSubjectId)
        .single()
    );
    expect(history).toEqual({
      subject_id: previousSubjectId,
      quarter: 1,
      group_id: null
    });

    const { data: groupSubjects, error: groupSubjectsError } = await service
      .from("group_subjects")
      .select("subject_id")
      .eq("group_id", groupId);
    expect(groupSubjectsError).toBeNull();
    expect(groupSubjects?.map((subject) => subject.subject_id)).toEqual([currentSubjectId]);
  });

  it("rechaza una materia enviada a la vez como cursada y como activa", async () => {
    const { error } = await adminClient.rpc("create_initial_cohort_group_with_subjects", {
      p_academic_cycle_id: cycleId,
      p_career_id: careerId,
      p_quarter: 2,
      p_modality: "escolarizado",
      p_shift: "matutino",
      p_name: `${prefix} Grupo inválido`,
      p_classroom_id: null,
      p_subjects: [{ subject_id: previousSubjectId, hours_per_week: 4 }],
      p_cohort_group_id: invalidCohortId,
      p_completed_subject_ids: [previousSubjectId]
    });
    expect(error?.message).toContain("ya cursada");

    const { count, error: countError } = await service
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("cohort_group_id", invalidCohortId);
    expect(countError).toBeNull();
    expect(count).toBe(0);
  });
});
