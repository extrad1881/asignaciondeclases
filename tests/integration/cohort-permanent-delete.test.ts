import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ADMIN_USER_ID,
  createAuthenticatedTestClient,
  createServiceTestClient,
  requireSingle
} from "../helpers/supabase-test-client";

describe("eliminación permanente de cohortes", () => {
  const prefix = `TST_COHORT_DELETE_${Date.now().toString(36).toUpperCase()}`;
  const service = createServiceTestClient();
  let adminClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let coordinatorClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let careerId = "";
  let cohortId = "";
  let groupId = "";
  let subjectId = "";

  beforeAll(async () => {
    adminClient = await createAuthenticatedTestClient("admin@local.test", "Admin123!");
    coordinatorClient = await createAuthenticatedTestClient("coordinador@local.test", "Coord123!");

    const activeCycle = await requireSingle<{ id: string }>(
      service.from("academic_cycles").select("id").eq("status", "active").single()
    );

    const career = await requireSingle<{ id: string }>(
      service
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

    const subject = await requireSingle<{ id: string }>(
      service
        .from("subjects")
        .insert({
          career_id: careerId,
          quarter: 1,
          name: `${prefix} Materia`,
          normalized_name: `${prefix} MATERIA`,
          default_hours: 5,
          active: true
        })
        .select("id")
        .single()
    );
    subjectId = subject.id;

    const cohort = await requireSingle<{ id: string }>(
      adminClient
        .from("cohort_groups")
        .insert({
          name: `${prefix} Cohorte`,
          career_id: careerId,
          modality: "escolarizado",
          shift: "matutino",
          current_quarter: 1,
          status: "active"
        })
        .select("id")
        .single()
    );
    cohortId = cohort.id;

    const group = await requireSingle<{ id: string }>(
      service
        .from("groups")
        .insert({
          academic_cycle_id: activeCycle.id,
          career_id: careerId,
          cohort_group_id: cohortId,
          quarter: 1,
          modality: "escolarizado",
          shift: "matutino",
          name: `${prefix} Grupo`,
          status: "draft"
        })
        .select("id")
        .single()
    );
    groupId = group.id;

    const { error: historyError } = await service.from("cohort_subject_history").insert({
      cohort_group_id: cohortId,
      subject_id: subjectId,
      quarter: 1,
      group_id: groupId
    });
    if (historyError) throw new Error(historyError.message);
  });

  afterAll(async () => {
    if (cohortId) await service.from("cohort_groups").delete().eq("id", cohortId);
    if (groupId) await service.from("groups").delete().eq("id", groupId);
    if (subjectId) await service.from("subjects").delete().eq("id", subjectId);
    if (careerId) await service.from("careers").delete().eq("id", careerId);

    const recordIds = [cohortId, groupId, subjectId, careerId].filter(Boolean);
    if (recordIds.length > 0) {
      await service.from("audit_logs").delete().in("record_id", recordIds);
    }
  });

  it("impide que un coordinador elimine la cohorte", async () => {
    const { data, error } = await coordinatorClient
      .from("cohort_groups")
      .delete()
      .eq("id", cohortId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { count, error: countError } = await service
      .from("cohort_groups")
      .select("id", { count: "exact", head: true })
      .eq("id", cohortId);
    expect(countError).toBeNull();
    expect(count).toBe(1);
  });

  it("el administrador elimina la cohorte, conserva sus grupos y registra auditoría", async () => {
    const { data, error } = await adminClient
      .from("cohort_groups")
      .delete()
      .eq("id", cohortId)
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(cohortId);

    const preservedGroup = await requireSingle<{ cohort_group_id: string | null }>(
      service.from("groups").select("cohort_group_id").eq("id", groupId).single()
    );
    expect(preservedGroup.cohort_group_id).toBeNull();

    const { count: historyCount, error: historyError } = await service
      .from("cohort_subject_history")
      .select("id", { count: "exact", head: true })
      .eq("cohort_group_id", cohortId);
    expect(historyError).toBeNull();
    expect(historyCount).toBe(0);

    const audit = await requireSingle<{
      user_id: string | null;
      action_type: string;
      table_name: string;
      record_id: string;
    }>(
      service
        .from("audit_logs")
        .select("user_id, action_type, table_name, record_id")
        .eq("table_name", "cohort_groups")
        .eq("record_id", cohortId)
        .eq("action_type", "delete")
        .single()
    );
    expect(audit).toEqual({
      user_id: ADMIN_USER_ID,
      action_type: "delete",
      table_name: "cohort_groups",
      record_id: cohortId
    });
  });
});
