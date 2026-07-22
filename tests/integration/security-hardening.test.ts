import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ADMIN_USER_ID,
  createAnonymousTestClient,
  createAuthenticatedTestClient,
  createServiceTestClient,
  requireSingle
} from "../helpers/supabase-test-client";

describe("endurecimiento de seguridad y consistencia", () => {
  const prefix = `TST_SECURITY_${Date.now().toString(36).toUpperCase()}`;
  const service = createServiceTestClient();
  const auditedService = createServiceTestClient(ADMIN_USER_ID);
  let adminClient: Awaited<ReturnType<typeof createAuthenticatedTestClient>>;
  let signupUserId = "";
  let temporaryUserId = "";
  let teacherId = "";
  let careerId = "";
  let subjectId = "";

  beforeAll(async () => {
    adminClient = await createAuthenticatedTestClient("admin@local.test", "Admin123!");

    const { data: career, error } = await service
      .from("careers")
      .insert({
        code: `${prefix}_C`,
        name: `${prefix} Carrera`,
        normalized_name: `${prefix} CARRERA`,
        active: true
      })
      .select("id")
      .single();
    if (error || !career) throw new Error(error?.message ?? "No se pudo crear la carrera temporal.");
    careerId = career.id;
  });

  afterAll(async () => {
    if (subjectId) await service.from("subjects").delete().eq("id", subjectId);
    if (teacherId) await service.from("teachers").delete().eq("id", teacherId);
    if (careerId) await service.from("careers").delete().eq("id", careerId);
    if (temporaryUserId) await service.auth.admin.deleteUser(temporaryUserId);
    if (signupUserId) await service.auth.admin.deleteUser(signupUserId);
  });

  it("rechaza el registro público", async () => {
    const anonymous = createAnonymousTestClient();
    const { data, error } = await anonymous.auth.signUp({
      email: `${prefix.toLowerCase()}_signup@local.test`,
      password: "Segura123!"
    });
    signupUserId = data.user?.id ?? "";

    expect(data.user).toBeNull();
    expect(error).not.toBeNull();
  });

  it("ignora un rol privilegiado enviado en metadatos", async () => {
    const email = `${prefix.toLowerCase()}_metadata@local.test`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: "Segura123!",
      email_confirm: true,
      user_metadata: {
        display_name: `${prefix} Metadata`,
        role_code: "admin"
      }
    });
    expect(error).toBeNull();
    temporaryUserId = data.user?.id ?? "";

    const profile = await requireSingle<{ role_code: string; active: boolean }>(
      service.from("users_profile").select("role_code, active").eq("id", temporaryUserId).single()
    );
    expect(profile).toEqual({ role_code: "coordinator", active: false });
  });

  it("atribuye al administrador los cambios hechos con service role", async () => {
    const displayName = `${prefix} Auditado`;
    const { error } = await auditedService
      .from("users_profile")
      .update({ display_name: displayName })
      .eq("id", temporaryUserId);
    expect(error).toBeNull();

    const audit = await requireSingle<{ user_id: string | null }>(
      service
        .from("audit_logs")
        .select("user_id")
        .eq("table_name", "users_profile")
        .eq("record_id", temporaryUserId)
        .eq("action_type", "update")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
    );
    expect(audit.user_id).toBe(ADMIN_USER_ID);
  });

  it("conserva relaciones anteriores cuando un reemplazo es inválido", async () => {
    const { data: teacher, error: teacherError } = await adminClient
      .from("teachers")
      .insert({
        name: `${prefix} Docente`,
        normalized_name: `${prefix} DOCENTE`,
        max_hours: 20,
        active: true
      })
      .select("id")
      .single();
    expect(teacherError).toBeNull();
    teacherId = teacher?.id ?? "";

    const { error: initialError } = await adminClient.rpc("replace_teacher_profiles", {
      p_teacher_id: teacherId,
      p_profile_codes: ["ADEM"]
    });
    expect(initialError).toBeNull();

    const { error: invalidError } = await adminClient.rpc("replace_teacher_profiles", {
      p_teacher_id: teacherId,
      p_profile_codes: ["PERFIL_INEXISTENTE"]
    });
    expect(invalidError?.message).toContain("no existen");

    const relation = await requireSingle<{ profile_code: string }>(
      service
        .from("teacher_available_profiles")
        .select("profile_code")
        .eq("teacher_id", teacherId)
        .single()
    );
    expect(relation.profile_code).toBe("ADEM");
  });

  it("revierte el alta completa de un docente si falla la relación de perfiles", async () => {
    const normalizedName = `${prefix} DOCENTE ATOMICO`;
    const attemptedTeacherId = crypto.randomUUID();
    const { error } = await adminClient.rpc("upsert_teacher_with_profiles", {
      p_teacher_id: attemptedTeacherId,
      p_name: `${prefix} Docente Atómico`,
      p_normalized_name: normalizedName,
      p_email: "",
      p_max_hours: 20,
      p_profile_codes: ["PERFIL_INEXISTENTE"]
    });

    expect(error?.message).toContain("no existen");
    const { data: partialTeacher } = await service
      .from("teachers")
      .select("id")
      .eq("id", attemptedTeacherId)
      .maybeSingle();
    expect(partialTeacher).toBeNull();
  });

  it("revierte los datos de una materia si falla el reemplazo de requisitos", async () => {
    const newSubjectId = crypto.randomUUID();
    const { data: createdSubjectId, error: createError } = await adminClient.rpc(
      "upsert_subject_with_requirements",
      {
        p_subject_id: newSubjectId,
        p_career_id: careerId,
        p_name: `${prefix} Materia Atómica`,
        p_normalized_name: `${prefix} MATERIA ATOMICA`,
        p_quarter: 1,
        p_default_hours: 5,
        p_profile_codes: ["ADEM"]
      }
    );
    expect(createError).toBeNull();
    subjectId = createdSubjectId ?? "";

    const { error: updateError } = await adminClient.rpc("upsert_subject_with_requirements", {
      p_subject_id: subjectId,
      p_career_id: careerId,
      p_name: `${prefix} Materia Modificada`,
      p_normalized_name: `${prefix} MATERIA MODIFICADA`,
      p_quarter: 2,
      p_default_hours: 9,
      p_profile_codes: ["PERFIL_INEXISTENTE"]
    });
    expect(updateError?.message).toContain("no existen");

    const subject = await requireSingle<{ name: string; quarter: number; default_hours: number }>(
      service
        .from("subjects")
        .select("name, quarter, default_hours")
        .eq("id", subjectId)
        .single()
    );
    expect(subject.name).toBe(`${prefix} Materia Atómica`);
    expect(subject.quarter).toBe(1);
    expect(Number(subject.default_hours)).toBe(5);
  });

  it("rechaza ciclos cuya fecha final sea anterior al inicio", async () => {
    const { error } = await adminClient.from("academic_cycles").insert({
      code: `${prefix}_FECHAS`,
      name: `${prefix} Fechas inválidas`,
      starts_at: "2027-05-01",
      ends_at: "2027-04-01",
      status: "draft",
      active: false
    });

    expect(error?.code).toBe("23514");
  });
});
