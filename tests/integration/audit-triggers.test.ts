import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAuthenticatedTestClient,
  createServiceTestClient,
  deleteByIds,
  requireSingle
} from "../helpers/supabase-test-client";

describe("Supabase audit triggers and assignment validations", () => {
  const prefix = `TST_AUDIT_${Date.now().toString(36).toUpperCase()}`;
  const service = createServiceTestClient();
  let adminClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let cycleId = "";
  let classroomId = "";
  let careerId = "";
  let subjectId = "";
  let secondSubjectId = "";
  let teacherId = "";
  let alternateTeacherId = "";
  let incompatibleTeacherId = "";
  let lowHoursTeacherId = "";
  let coordinatorId = "";
  let userId = "";
  let groupId = "";
  let otherGroupId = "";
  let groupSubjectId = "";
  let secondGroupSubjectId = "";
  let otherGroupSubjectId = "";
  let assignmentId = "";
  let blockA = "";
  let blockB = "";

  const recordIds = () =>
    [
      userId,
      coordinatorId,
      subjectId,
      secondSubjectId,
      teacherId,
      alternateTeacherId,
      incompatibleTeacherId,
      lowHoursTeacherId,
      groupId,
      otherGroupId,
      groupSubjectId,
      secondGroupSubjectId,
      otherGroupSubjectId,
      assignmentId
    ].filter(Boolean);

  beforeAll(async () => {
    adminClient = await createAuthenticatedTestClient("admin@local.test", "Admin123!");

    const cycle = await requireSingle<{ id: string }>(
      service.from("academic_cycles").select("id").eq("active", true).limit(1).single()
    );
    const classroom = await requireSingle<{ id: string }>(
      service.from("classrooms").select("id").eq("active", true).limit(1).single()
    );
    cycleId = cycle.id;
    classroomId = classroom.id;

    const { data: blocks, error: blocksError } = await service
      .from("schedule_blocks")
      .select("id, starts_at, schedule_templates!inner(modality, shift)")
      .eq("active", true)
      .eq("schedule_templates.modality", "escolarizado")
      .eq("schedule_templates.shift", "matutino")
      .order("starts_at")
      .limit(2);
    if (blocksError) throw new Error(blocksError.message);
    blockA = blocks?.[0]?.id ?? "";
    blockB = blocks?.[1]?.id ?? "";
    if (!blockA || !blockB) throw new Error("No hay suficientes bloques matutinos para pruebas.");

    const { data: user, error: userError } = await service.auth.admin.createUser({
      email: `${prefix.toLowerCase()}@local.test`,
      password: "Test123!",
      email_confirm: true,
      user_metadata: {
        display_name: `${prefix} Usuario`,
        role_code: "coordinator"
      }
    });
    if (userError || !user.user) throw new Error(userError?.message ?? "No se pudo crear usuario temporal.");
    userId = user.user.id;

    const { data: career, error: careerError } = await adminClient
      .from("careers")
      .insert({
        code: `${prefix}_C`,
        name: `${prefix} Carrera`,
        normalized_name: `${prefix} CARRERA`,
        active: true
      })
      .select("id")
      .single();
    if (careerError || !career) throw new Error(careerError?.message ?? "No se pudo crear carrera.");
    careerId = career.id;

    const { data: coordinator, error: coordinatorError } = await adminClient
      .from("coordinators")
      .insert({ name: `${prefix} COORD`, active: true })
      .select("id")
      .single();
    if (coordinatorError || !coordinator) throw new Error(coordinatorError?.message ?? "No se pudo crear coordinador.");
    coordinatorId = coordinator.id;

    const { data: subject, error: subjectError } = await adminClient
      .from("subjects")
      .insert({
        career_id: careerId,
        name: `${prefix} Materia`,
        normalized_name: `${prefix} MATERIA`,
        quarter: 1,
        default_hours: 5,
        active: true
      })
      .select("id")
      .single();
    if (subjectError || !subject) throw new Error(subjectError?.message ?? "No se pudo crear materia.");
    subjectId = subject.id;

    const { data: secondSubject, error: secondSubjectError } = await adminClient
      .from("subjects")
      .insert({
        career_id: careerId,
        name: `${prefix} Materia Dos`,
        normalized_name: `${prefix} MATERIA DOS`,
        quarter: 1,
        default_hours: 5,
        active: true
      })
      .select("id")
      .single();
    if (secondSubjectError || !secondSubject) throw new Error(secondSubjectError?.message ?? "No se pudo crear materia dos.");
    secondSubjectId = secondSubject.id;

    await service.from("class_requirements").insert([
      { subject_id: subjectId, profile_code: "ADEM" },
      { subject_id: secondSubjectId, profile_code: "ADEM" }
    ]);

    const { data: teachers, error: teachersError } = await adminClient
      .from("teachers")
      .insert([
        { name: `${prefix} Docente`, normalized_name: `${prefix} DOCENTE`, max_hours: 20, active: true },
        { name: `${prefix} Alterno`, normalized_name: `${prefix} ALTERNO`, max_hours: 20, active: true },
        { name: `${prefix} Incompatible`, normalized_name: `${prefix} INCOMPATIBLE`, max_hours: 20, active: true },
        { name: `${prefix} Pocas Horas`, normalized_name: `${prefix} POCAS HORAS`, max_hours: 1, active: true }
      ])
      .select("id, name");
    if (teachersError) throw new Error(teachersError.message);
    teacherId = teachers?.find((teacher) => teacher.name.endsWith("Docente"))?.id ?? "";
    alternateTeacherId = teachers?.find((teacher) => teacher.name.endsWith("Alterno"))?.id ?? "";
    incompatibleTeacherId = teachers?.find((teacher) => teacher.name.endsWith("Incompatible"))?.id ?? "";
    lowHoursTeacherId = teachers?.find((teacher) => teacher.name.endsWith("Pocas Horas"))?.id ?? "";

    await service.from("teacher_available_profiles").insert([
      { teacher_id: teacherId, profile_code: "ADEM" },
      { teacher_id: alternateTeacherId, profile_code: "ADEM" },
      { teacher_id: incompatibleTeacherId, profile_code: "SISCOM" },
      { teacher_id: lowHoursTeacherId, profile_code: "ADEM" }
    ]);

    await adminClient.from("users_profile").update({ display_name: `${prefix} Usuario Actualizado` }).eq("id", userId);
    await adminClient.from("coordinators").update({ active: false }).eq("id", coordinatorId);
    await adminClient.from("coordinators").update({ active: true }).eq("id", coordinatorId);
    await adminClient.from("subjects").update({ default_hours: 6 }).eq("id", subjectId);
    await adminClient.from("teachers").update({ max_hours: 21 }).eq("id", teacherId);

    const { data: group, error: groupError } = await adminClient
      .from("groups")
      .insert({
        academic_cycle_id: cycleId,
        career_id: careerId,
        quarter: 1,
        modality: "escolarizado",
        shift: "matutino",
        name: `${prefix} Grupo`,
        classroom_id: classroomId,
        status: "active"
      })
      .select("id")
      .single();
    if (groupError || !group) throw new Error(groupError?.message ?? "No se pudo crear grupo.");
    groupId = group.id;

    const { data: otherGroup, error: otherGroupError } = await adminClient
      .from("groups")
      .insert({
        academic_cycle_id: cycleId,
        career_id: careerId,
        quarter: 1,
        modality: "escolarizado",
        shift: "matutino",
        name: `${prefix} Grupo Aula`,
        classroom_id: classroomId,
        status: "active"
      })
      .select("id")
      .single();
    if (otherGroupError || !otherGroup) throw new Error(otherGroupError?.message ?? "No se pudo crear grupo alterno.");
    otherGroupId = otherGroup.id;

    const { data: groupSubject, error: groupSubjectError } = await service
      .from("group_subjects")
      .insert({ group_id: groupId, subject_id: subjectId, hours_per_week: 5, required_profile_code: "ADEM" })
      .select("id")
      .single();
    if (groupSubjectError || !groupSubject) throw new Error(groupSubjectError?.message ?? "No se pudo crear materia de grupo.");
    groupSubjectId = groupSubject.id;

    const { data: secondGroupSubject, error: secondGroupSubjectError } = await service
      .from("group_subjects")
      .insert({ group_id: groupId, subject_id: secondSubjectId, hours_per_week: 5, required_profile_code: "ADEM" })
      .select("id")
      .single();
    if (secondGroupSubjectError || !secondGroupSubject) {
      throw new Error(secondGroupSubjectError?.message ?? "No se pudo crear segunda materia de grupo.");
    }
    secondGroupSubjectId = secondGroupSubject.id;

    const { data: otherGroupSubject, error: otherGroupSubjectError } = await service
      .from("group_subjects")
      .insert({ group_id: otherGroupId, subject_id: subjectId, hours_per_week: 5, required_profile_code: "ADEM" })
      .select("id")
      .single();
    if (otherGroupSubjectError || !otherGroupSubject) {
      throw new Error(otherGroupSubjectError?.message ?? "No se pudo crear materia de grupo alterno.");
    }
    otherGroupSubjectId = otherGroupSubject.id;

    const { data: assignment, error: assignmentError } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: groupSubjectId, teacher_id: teacherId, schedule_block_id: blockA, classroom_id: classroomId })
      .select("id")
      .single();
    if (assignmentError || !assignment) throw new Error(assignmentError?.message ?? "No se pudo crear asignacion.");
    assignmentId = assignment.id;

    const { error: updateAssignmentError } = await adminClient
      .from("assignments")
      .update({ schedule_block_id: blockB })
      .eq("id", assignmentId);
    if (updateAssignmentError) throw new Error(updateAssignmentError.message);

    const { error: deleteAssignmentError } = await adminClient.from("assignments").delete().eq("id", assignmentId);
    if (deleteAssignmentError) throw new Error(deleteAssignmentError.message);
  });

  afterAll(async () => {
    await service.from("audit_logs").delete().in("record_id", recordIds());
    await deleteByIds(service, "assignments", [assignmentId]);
    await deleteByIds(service, "group_subjects", [groupSubjectId, secondGroupSubjectId, otherGroupSubjectId]);
    await deleteByIds(service, "groups", [groupId, otherGroupId]);
    await service.from("teacher_available_profiles").delete().in("teacher_id", [teacherId, alternateTeacherId, incompatibleTeacherId, lowHoursTeacherId]);
    await service.from("class_requirements").delete().in("subject_id", [subjectId, secondSubjectId]);
    await deleteByIds(service, "teachers", [teacherId, alternateTeacherId, incompatibleTeacherId, lowHoursTeacherId]);
    await deleteByIds(service, "subjects", [subjectId, secondSubjectId]);
    await deleteByIds(service, "coordinators", [coordinatorId]);
    await deleteByIds(service, "careers", [careerId]);
    if (userId) await service.auth.admin.deleteUser(userId);
  });

  it("genera audit_logs con campos obligatorios para cambios sensibles", async () => {
    const { data: logs, error } = await service
      .from("audit_logs")
      .select("action_type, table_name, record_id, old_value, new_value, created_at, user_id")
      .in("record_id", recordIds());

    expect(error).toBeNull();
    expect(logs?.length ?? 0).toBeGreaterThan(0);

    const tables = new Set((logs ?? []).map((log) => log.table_name));
    expect(tables.has("users_profile")).toBe(true);
    expect(tables.has("coordinators")).toBe(true);
    expect(tables.has("subjects")).toBe(true);
    expect(tables.has("teachers")).toBe(true);
    expect(tables.has("groups")).toBe(true);
    expect(tables.has("assignments")).toBe(true);

    for (const log of logs ?? []) {
      expect(log.action_type).toBeTruthy();
      expect(log.table_name).toBeTruthy();
      expect(log.record_id).toBeTruthy();
      expect(log.created_at).toBeTruthy();
      expect("old_value" in log).toBe(true);
      expect("new_value" in log).toBe(true);
    }
  });

  it("audita creacion, actualizacion y eliminacion de asignaciones", async () => {
    const { data: logs, error } = await service
      .from("audit_logs")
      .select("action_type, table_name, record_id, old_value, new_value")
      .eq("table_name", "assignments")
      .eq("record_id", assignmentId);

    expect(error).toBeNull();
    const actions = new Set((logs ?? []).map((log) => log.action_type));
    expect(actions.has("insert")).toBe(true);
    expect(actions.has("update")).toBe(true);
    expect(actions.has("delete")).toBe(true);
  });

  it("no permite asignacion con choque de horario del docente", async () => {
    const { data: activeAssignment, error: activeAssignmentError } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: groupSubjectId, teacher_id: teacherId, schedule_block_id: blockA, classroom_id: classroomId, duration_hours: 1.5 })
      .select("id")
      .single();
    expect(activeAssignmentError).toBeNull();

    const { error } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: secondGroupSubjectId, teacher_id: teacherId, schedule_block_id: blockA, classroom_id: classroomId });
    expect(error?.message).toContain("El docente ya tiene una clase asignada en este horario.");

    if (activeAssignment?.id) await service.from("assignments").delete().eq("id", activeAssignment.id);
  });

  it("no permite que un grupo tenga dos clases simultaneas", async () => {
    const { data: activeAssignment, error: activeAssignmentError } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: groupSubjectId, teacher_id: teacherId, schedule_block_id: blockA, classroom_id: classroomId, duration_hours: 1.5 })
      .select("id")
      .single();
    expect(activeAssignmentError).toBeNull();

    const { error } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: secondGroupSubjectId, teacher_id: alternateTeacherId, schedule_block_id: blockA, classroom_id: classroomId, duration_hours: 1.5 });
    expect(error?.message).toContain("El grupo ya tiene una clase asignada en este horario.");

    if (activeAssignment?.id) await service.from("assignments").delete().eq("id", activeAssignment.id);
  });

  it("no permite que un aula tenga dos clases simultaneas", async () => {
    const { data: activeAssignment, error: activeAssignmentError } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: groupSubjectId, teacher_id: teacherId, schedule_block_id: blockA, classroom_id: classroomId, duration_hours: 1.5 })
      .select("id")
      .single();
    expect(activeAssignmentError).toBeNull();

    const { error } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: otherGroupSubjectId, teacher_id: alternateTeacherId, schedule_block_id: blockA, classroom_id: classroomId, duration_hours: 1.5 });
    expect(error?.message).toContain("El aula ya tiene una clase asignada en este horario.");

    if (activeAssignment?.id) await service.from("assignments").delete().eq("id", activeAssignment.id);
  });

  it("no cambia la carga planeada de la materia al crear asignaciones", async () => {
    const before = await requireSingle<{ hours_per_week: number }>(
      service.from("group_subjects").select("hours_per_week").eq("id", groupSubjectId).single()
    );

    const { data: activeAssignment, error } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: groupSubjectId, teacher_id: teacherId, schedule_block_id: blockA, classroom_id: classroomId, duration_hours: 1.5 })
      .select("id")
      .single();
    expect(error).toBeNull();

    const after = await requireSingle<{ hours_per_week: number }>(
      service.from("group_subjects").select("hours_per_week").eq("id", groupSubjectId).single()
    );
    expect(Number(after.hours_per_week)).toBe(Number(before.hours_per_week));

    if (activeAssignment?.id) await service.from("assignments").delete().eq("id", activeAssignment.id);
  });

  it("crea grupos de forma transaccional sin dejar registros parciales si falla una materia", async () => {
    const rollbackGroupName = `${prefix} Grupo Rollback`;
    const rollbackSubjectName = `${prefix} Externa Fallida`;

    const { error } = await (adminClient as any).rpc("create_group_with_subjects", {
      p_academic_cycle_id: cycleId,
      p_career_id: careerId,
      p_quarter: 1,
      p_modality: "escolarizado",
      p_shift: "matutino",
      p_name: rollbackGroupName,
      p_classroom_id: classroomId,
      p_subjects: [
        { subject_id: subjectId, hours_per_week: 5 },
        {
          name: rollbackSubjectName,
          quarter: 1,
          hours_per_week: 5,
          required_profile_code: "PERFIL_INEXISTENTE"
        }
      ]
    });

    expect(error?.message).toContain("El perfil requerido no existe.");

    const { data: partialGroup } = await service.from("groups").select("id").eq("name", rollbackGroupName).maybeSingle();
    const { data: partialSubject } = await service.from("subjects").select("id").eq("name", rollbackSubjectName).maybeSingle();
    expect(partialGroup).toBeNull();
    expect(partialSubject).toBeNull();
  });

  it("no permite asignacion si el docente no cumple el perfil", async () => {
    const { error } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: groupSubjectId, teacher_id: incompatibleTeacherId, schedule_block_id: blockA, classroom_id: classroomId });

    expect(error?.message).toContain("El docente no cumple con el perfil requerido para esta materia.");
  });

  it("no permite exceder horas maximas del docente", async () => {
    const { error } = await adminClient
      .from("assignments")
      .insert({ group_subject_id: groupSubjectId, teacher_id: lowHoursTeacherId, schedule_block_id: blockA, classroom_id: classroomId });

    expect(error?.message).toContain("excede");
  });
});
