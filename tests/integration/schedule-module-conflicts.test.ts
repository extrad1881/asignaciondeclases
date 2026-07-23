import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAuthenticatedTestClient,
  createServiceTestClient,
  requireSingle
} from "../helpers/supabase-test-client";

describe("conflictos de horario entre módulos sabatinos", () => {
  const prefix = `TST_MODULES_${Date.now().toString(36).toUpperCase()}`;
  const service = createServiceTestClient();
  let adminClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let cycleId = "";
  let careerId = "";
  let teacherId = "";
  let groupId = "";
  let templateId = "";
  let moduleOneBlockId = "";
  let moduleTwoBlockId = "";
  let groupSubjectIds: string[] = [];
  let subjectIds: string[] = [];
  let assignmentIds: string[] = [];

  beforeAll(async () => {
    adminClient = await createAuthenticatedTestClient("admin@local.test", "Admin123!");

    const cycle = await requireSingle<{ id: string }>(
      service.from("academic_cycles").select("id").eq("status", "active").single()
    );
    cycleId = cycle.id;

    const { data: blocks, error: blocksError } = await service
      .from("schedule_blocks")
      .select("id, template_id, starts_at, ends_at, module, schedule_templates!inner(code)")
      .eq("active", true)
      .eq("is_custom", false)
      .eq("day_of_week", 6)
      .eq("starts_at", "08:00:00")
      .eq("ends_at", "09:30:00")
      .eq("schedule_templates.code", "sabatino-matutino")
      .order("module");
    if (blocksError) throw new Error(blocksError.message);
    moduleOneBlockId = blocks?.find((block) => block.module === 1)?.id ?? "";
    moduleTwoBlockId = blocks?.find((block) => block.module === 2)?.id ?? "";
    templateId = blocks?.[0]?.template_id ?? "";
    if (!moduleOneBlockId || !moduleTwoBlockId) {
      throw new Error("No están disponibles los bloques Módulo 1 y Módulo 2 para la prueba.");
    }

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
      .insert([1, 2, 3].map((number) => ({
        career_id: careerId,
        quarter: 1,
        name: `${prefix} Materia ${number}`,
        normalized_name: `${prefix} MATERIA ${number}`,
        default_hours: 10,
        active: true
      })))
      .select("id");
    if (subjectsError) throw new Error(subjectsError.message);
    subjectIds = (subjects ?? []).map((subject) => subject.id);

    const teacher = await requireSingle<{ id: string }>(
      adminClient
        .from("teachers")
        .insert({
          name: `${prefix} Docente`,
          normalized_name: `${prefix} DOCENTE`,
          max_hours: 99,
          active: true
        })
        .select("id")
        .single()
    );
    teacherId = teacher.id;

    const group = await requireSingle<{ id: string }>(
      adminClient
        .from("groups")
        .insert({
          academic_cycle_id: cycleId,
          career_id: careerId,
          quarter: 1,
          modality: "sabatino",
          shift: "matutino",
          name: `${prefix} Grupo`,
          status: "draft"
        })
        .select("id")
        .single()
    );
    groupId = group.id;

    const { data: groupSubjects, error: groupSubjectsError } = await service
      .from("group_subjects")
      .insert(subjectIds.map((subjectId) => ({
        group_id: groupId,
        subject_id: subjectId,
        hours_per_week: 10,
        status: "active"
      })))
      .select("id");
    if (groupSubjectsError) throw new Error(groupSubjectsError.message);
    groupSubjectIds = (groupSubjects ?? []).map((subject) => subject.id);
  });

  afterAll(async () => {
    if (assignmentIds.length > 0) {
      await service.from("assignments").delete().in("id", assignmentIds);
    }
    if (groupSubjectIds.length > 0) {
      await service.from("group_subjects").delete().in("id", groupSubjectIds);
    }
    if (groupId) await service.from("groups").delete().eq("id", groupId);
    if (teacherId) await service.from("teachers").delete().eq("id", teacherId);
    if (subjectIds.length > 0) await service.from("subjects").delete().in("id", subjectIds);
    if (careerId) await service.from("careers").delete().eq("id", careerId);

    const auditedIds = [
      ...assignmentIds,
      ...groupSubjectIds,
      ...subjectIds,
      groupId,
      teacherId,
      careerId
    ].filter(Boolean);
    if (auditedIds.length > 0) {
      await service.from("audit_logs").delete().in("record_id", auditedIds);
    }
  });

  it("permite la misma franja al docente en módulos distintos", async () => {
    const { data: first, error: firstError } = await adminClient
      .from("assignments")
      .insert({
        group_subject_id: groupSubjectIds[0],
        teacher_id: teacherId,
        schedule_block_id: moduleOneBlockId,
        duration_hours: 1.5,
        status: "active"
      })
      .select("id")
      .single();
    expect(firstError).toBeNull();

    const { data: second, error: secondError } = await adminClient
      .from("assignments")
      .insert({
        group_subject_id: groupSubjectIds[1],
        teacher_id: teacherId,
        schedule_block_id: moduleTwoBlockId,
        duration_hours: 1.5,
        status: "active"
      })
      .select("id")
      .single();
    expect(secondError).toBeNull();

    assignmentIds.push(...[first?.id, second?.id].filter((id): id is string => Boolean(id)));
  });

  it("rechaza otra clase del docente en la misma franja y el mismo módulo", async () => {
    const { error } = await adminClient
      .from("assignments")
      .insert({
        group_subject_id: groupSubjectIds[2],
        teacher_id: teacherId,
        schedule_block_id: moduleOneBlockId,
        duration_hours: 1.5,
        status: "active"
      });

    expect(error?.message).toContain("El docente ya tiene una clase asignada en este horario.");
  });

  it("impide crear módulos personalizados fuera de M1 y M2", async () => {
    const { error } = await adminClient
      .from("schedule_blocks")
      .insert({
        template_id: templateId,
        day_of_week: 6,
        starts_at: "09:30",
        ends_at: "10:00",
        label: `${prefix} Módulo inválido`,
        position: 99,
        active: true,
        is_custom: true,
        module: 3
      });

    expect(error?.message).toContain("Módulo 1 o Módulo 2");
  });
});
