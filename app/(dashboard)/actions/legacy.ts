"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { groupSchema } from "@/lib/validations/groups";
import { isValidProfileCode, normalizeProfileCode, uniqueValidProfileCodes } from "@/lib/profiles";
import { WEEKDAYS } from "@/lib/constants";

function cleanString(value: FormDataEntryValue | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value))
    .filter(Boolean);
}

const externalSubjectSchema = z.object({
  name: z.string().min(2, "Escribe el nombre de la materia externa.").max(160),
  quarter: z.coerce.number().int().min(1).max(12),
  hours_per_week: z.coerce.number().positive("Las horas deben ser mayores a cero."),
  required_profile_code: z.string().optional()
});

function getExternalSubjects(formData: FormData, defaultQuarter: number) {
  const names = formData.getAll("external_subject_name");
  const quarters = formData.getAll("external_subject_quarter");
  const hours = formData.getAll("external_subject_hours");
  const profileCodes = formData.getAll("external_subject_profile_code");

  return names
    .map((name, index) => ({
      name: cleanString(name),
      quarter: quarters[index] ?? defaultQuarter,
      hours_per_week: hours[index] ?? 5,
      required_profile_code: cleanString(profileCodes[index])
    }))
    .filter((subject) => subject.name.length > 0)
    .map((subject) => {
      const parsed = externalSubjectSchema.safeParse(subject);
      if (!parsed.success) {
        throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
      }
      return {
        ...parsed.data,
        normalized_name: normalizeKey(parsed.data.name),
        required_profile_code: isValidProfileCode(parsed.data.required_profile_code)
          ? normalizeProfileCode(parsed.data.required_profile_code ?? "")
          : null
      };
    });
}

async function getExternalSubjectCatalogClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  careerId: string
) {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay una sesión activa.");

  const { data: profile, error: profileError } = await supabase
    .from("users_profile")
    .select("id, role_code")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error("No hay una sesión activa.");

  if (profile.role_code === "admin") {
    return {
      client: createServiceClient(),
      canSaveCatalogRequirements: true
    };
  }

  if (profile.role_code === "coordinator") {
    const { data: career, error: careerError } = await supabase
      .from("careers")
      .select("id")
      .eq("id", careerId)
      .maybeSingle();
    if (careerError) throw new Error(careerError.message);
    if (!career) throw new Error("Solo puedes agregar materias extra a tus carreras asignadas.");

    return {
      client: createServiceClient(),
      canSaveCatalogRequirements: false
    };
  }

  throw new Error("No tienes permiso para agregar materias extra.");
}

export async function createGroupAction(formData: FormData) {
  const supabase = await createClient();
  const parsed = groupSchema.safeParse({
    academic_cycle_id: formData.get("academic_cycle_id"),
    career_id: formData.get("career_id"),
    quarter: formData.get("quarter"),
    modality: formData.get("modality"),
    shift: formData.get("shift"),
    name: formData.get("name"),
    classroom_id: formData.get("classroom_id")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const subjectIds = getStringList(formData, "subject_ids");
  const externalSubjects = getExternalSubjects(formData, parsed.data.quarter);
  const catalogAuthorization = externalSubjects.length > 0
    ? await getExternalSubjectCatalogClient(supabase, parsed.data.career_id)
    : { client: supabase, canSaveCatalogRequirements: false };
  const catalogClient = catalogAuthorization.client;

  if (subjectIds.length === 0 && externalSubjects.length === 0) {
    throw new Error("Selecciona al menos una materia para el grupo.");
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      ...parsed.data,
      classroom_id: parsed.data.classroom_id || null,
      status: "active"
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const subjectRowsById = new Map<
    string,
    {
      group_id: string;
      subject_id: string;
      hours_per_week: number;
      required_profile_code?: string | null;
    }
  >();

  for (const subjectId of subjectIds) {
    subjectRowsById.set(subjectId, {
      group_id: group.id,
      subject_id: subjectId,
      hours_per_week: Number(formData.get(`hours_${subjectId}`) ?? 5)
    });
  }

  if (externalSubjects.length > 0) {
    const { data: subjects, error: subjectsError } = await catalogClient
      .from("subjects")
      .upsert(
        externalSubjects.map((subject) => ({
          career_id: parsed.data.career_id,
          quarter: subject.quarter,
          name: subject.name,
          normalized_name: subject.normalized_name,
          default_hours: subject.hours_per_week,
          active: true
        })),
        { onConflict: "career_id,quarter,normalized_name" }
      )
      .select("id, career_id, quarter, normalized_name");

    if (subjectsError) throw new Error(subjectsError.message);

    const subjectsByKey = new Map(
      (subjects ?? []).map((subject: any) => [
        `${subject.career_id}|${subject.quarter}|${subject.normalized_name}`,
        subject
      ])
    );

    const requirementRows: Array<{ subject_id: string; profile_code: string }> = [];

    for (const externalSubject of externalSubjects) {
      const subject = subjectsByKey.get(
        `${parsed.data.career_id}|${externalSubject.quarter}|${externalSubject.normalized_name}`
      );
      if (!subject) throw new Error(`No se pudo crear la materia externa ${externalSubject.name}.`);

      subjectRowsById.set(subject.id, {
        group_id: group.id,
        subject_id: subject.id,
        hours_per_week: externalSubject.hours_per_week,
        required_profile_code: externalSubject.required_profile_code
      });

      if (externalSubject.required_profile_code) {
        requirementRows.push({
          subject_id: subject.id,
          profile_code: externalSubject.required_profile_code
        });
      }
    }

    if (requirementRows.length > 0 && catalogAuthorization.canSaveCatalogRequirements) {
      const { error: requirementError } = await catalogClient
        .from("class_requirements")
        .upsert(requirementRows, { onConflict: "subject_id,profile_code" });
      if (requirementError) throw new Error(requirementError.message);
    }
  }

  const rows = Array.from(subjectRowsById.values());

  const { error: subjectError } = await supabase.from("group_subjects").insert(rows);
  if (subjectError) throw new Error(subjectError.message);

  revalidatePath("/grupos");
  revalidatePath("/materias");
  revalidatePath("/carreras");
  revalidatePath("/coordinador");
  revalidatePath(`/carreras/${parsed.data.career_id}/materias`);
  redirect(`/grupos/${group.id}`);
}

const assignmentSchema = z.object({
  group_subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  schedule_block_id: z.string().uuid(),
  duration_hours: z.coerce.number().positive("Las horas asignadas deben ser mayores a cero.").max(99),
  classroom_id: z.string().uuid().optional().or(z.literal(""))
});

export async function createAssignmentAction(formData: FormData) {
  const supabase = await createClient();
  const parsed = assignmentSchema.safeParse({
    group_subject_id: formData.get("group_subject_id"),
    teacher_id: formData.get("teacher_id"),
    schedule_block_id: formData.get("schedule_block_id"),
    duration_hours: formData.get("duration_hours"),
    classroom_id: formData.get("classroom_id")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { error } = await supabase.from("assignments").insert({
    ...parsed.data,
    classroom_id: parsed.data.classroom_id || null,
    status: "active"
  });

  if (error) throw new Error(error.message);

  const { error: loadError } = await supabase
    .from("group_subjects")
    .update({ hours_per_week: parsed.data.duration_hours })
    .eq("id", parsed.data.group_subject_id);

  if (loadError) throw new Error(loadError.message);

  revalidatePath("/grupos");
  revalidatePath("/horarios");
  revalidatePath("/coordinador");
}

const assignmentUpdateSchema = z.object({
  assignment_id: z.string().uuid(),
  group_id: z.string().uuid().optional().or(z.literal("")),
  schedule_block_id: z.string().uuid(),
  duration_hours: z.coerce.number().positive("Las horas asignadas deben ser mayores a cero.").max(99),
  classroom_id: z.string().uuid().optional().or(z.literal(""))
});

export async function updateAssignmentAction(formData: FormData) {
  const supabase = await createClient();
  const parsed = assignmentUpdateSchema.safeParse({
    assignment_id: formData.get("assignment_id"),
    group_id: formData.get("group_id"),
    schedule_block_id: formData.get("schedule_block_id"),
    duration_hours: formData.get("duration_hours"),
    classroom_id: formData.get("classroom_id")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { data: currentAssignment } = await supabase
    .from("assignments")
    .select("id, group_subject_id")
    .eq("id", parsed.data.assignment_id)
    .maybeSingle();

  if (!currentAssignment) {
    throw new Error("No tienes permiso para modificar esta asignación.");
  }

  const { error } = await supabase
    .from("assignments")
    .update({
      schedule_block_id: parsed.data.schedule_block_id,
      duration_hours: parsed.data.duration_hours,
      classroom_id: parsed.data.classroom_id || null
    })
    .eq("id", parsed.data.assignment_id);

  if (error) throw new Error(error.message);

  const { error: loadError } = await supabase
    .from("group_subjects")
    .update({ hours_per_week: parsed.data.duration_hours })
    .eq("id", currentAssignment.group_subject_id);

  if (loadError) throw new Error(loadError.message);

  revalidatePath("/grupos");
  if (parsed.data.group_id) revalidatePath(`/grupos/${parsed.data.group_id}`);
  revalidatePath("/horarios");
  revalidatePath("/coordinador");
}

const assignmentDeleteSchema = z.object({
  assignment_id: z.string().uuid(),
  group_id: z.string().uuid().optional().or(z.literal(""))
});

export async function deleteAssignmentAction(formData: FormData) {
  const supabase = await createClient();
  const parsed = assignmentDeleteSchema.safeParse({
    assignment_id: formData.get("assignment_id"),
    group_id: formData.get("group_id")
  });

  if (!parsed.success) {
    throw new Error("Selecciona una asignación válida.");
  }

  const { error } = await supabase.from("assignments").delete().eq("id", parsed.data.assignment_id);
  if (error) throw new Error(error.message);

  revalidatePath("/grupos");
  if (parsed.data.group_id) revalidatePath(`/grupos/${parsed.data.group_id}`);
  revalidatePath("/horarios");
  revalidatePath("/coordinador");
}

const groupIdSchema = z.object({
  group_id: z.string().uuid()
});

export async function deleteGroupAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = groupIdSchema.safeParse({
    group_id: formData.get("group_id")
  });

  if (!parsed.success) {
    throw new Error("Selecciona un grupo válido.");
  }

  const { error } = await supabase.from("groups").delete().eq("id", parsed.data.group_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/grupos");
  redirect("/grupos");
}

async function requireAuthenticatedProfile() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay una sesión activa.");

  const { data: profile } = await supabase
    .from("users_profile")
    .select("id, role_code")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("No hay una sesión activa.");
  }

  return { supabase, profile };
}

async function requireAdmin() {
  const { supabase, profile } = await requireAuthenticatedProfile();

  if (profile?.role_code !== "admin") {
    throw new Error("Solo el administrador puede realizar esta acción.");
  }

  return supabase;
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(2),
  role_code: z.enum(["admin", "coordinator"])
});

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    display_name: formData.get("display_name"),
    role_code: formData.get("role_code")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      display_name: parsed.data.display_name,
      role_code: parsed.data.role_code
    }
  });

  if (error || !data.user) throw new Error(error?.message ?? "No se pudo crear el usuario.");

  await service.from("users_profile").upsert({
    id: data.user.id,
    email: parsed.data.email,
    display_name: parsed.data.display_name,
    role_code: parsed.data.role_code,
    active: true
  });

  if (parsed.data.role_code === "coordinator") {
    await service.from("coordinators").upsert(
      {
        profile_id: data.user.id,
        name: parsed.data.display_name.toUpperCase(),
        active: true
      },
      { onConflict: "profile_id" }
    );
  }

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
}

const updateUserSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().optional().or(z.literal("")),
  display_name: z.string().min(2),
  role_code: z.enum(["admin", "coordinator"]),
  active: z.enum(["true", "false"])
});

export async function updateUserAction(formData: FormData) {
  await requireAdmin();
  const parsed = updateUserSchema.safeParse({
    user_id: formData.get("user_id"),
    email: cleanString(formData.get("email")),
    password: cleanString(formData.get("password")),
    display_name: cleanString(formData.get("display_name")),
    role_code: formData.get("role_code"),
    active: formData.get("active")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const service = createServiceClient();
  const authUpdate: {
    email: string;
    password?: string;
    user_metadata: {
      display_name: string;
      role_code: "admin" | "coordinator";
    };
  } = {
    email: parsed.data.email,
    user_metadata: {
      display_name: parsed.data.display_name,
      role_code: parsed.data.role_code
    }
  };

  if (parsed.data.password) {
    if (parsed.data.password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }
    authUpdate.password = parsed.data.password;
  }

  const { error: authError } = await service.auth.admin.updateUserById(parsed.data.user_id, authUpdate);
  if (authError) throw new Error(authError.message);

  const active = parsed.data.active === "true";
  const { error: profileError } = await service.from("users_profile").upsert({
    id: parsed.data.user_id,
    email: parsed.data.email,
    display_name: parsed.data.display_name,
    role_code: parsed.data.role_code,
    active
  });
  if (profileError) throw new Error(profileError.message);

  if (parsed.data.role_code === "coordinator") {
    const { error: coordinatorError } = await service.from("coordinators").upsert(
      {
        profile_id: parsed.data.user_id,
        name: normalizeKey(parsed.data.display_name),
        active
      },
      { onConflict: "profile_id" }
    );
    if (coordinatorError) throw new Error(coordinatorError.message);
  } else {
    const { error: coordinatorError } = await service
      .from("coordinators")
      .update({ active: false })
      .eq("profile_id", parsed.data.user_id);
    if (coordinatorError) throw new Error(coordinatorError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/docentes");
}

const updateCoordinatorUserSchema = z.object({
  coordinator_id: z.string().uuid(),
  user_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().optional().or(z.literal("")),
  active: z.enum(["true", "false"])
});

export async function updateCoordinatorUserAction(formData: FormData) {
  await requireAdmin();
  const parsed = updateCoordinatorUserSchema.safeParse({
    coordinator_id: formData.get("coordinator_id"),
    user_id: formData.get("user_id"),
    email: cleanString(formData.get("email")),
    password: cleanString(formData.get("password")),
    active: formData.get("active")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const service = createServiceClient();
  const { data: coordinator, error: coordinatorLookupError } = await service
    .from("coordinators")
    .select("id, profile_id")
    .eq("id", parsed.data.coordinator_id)
    .eq("profile_id", parsed.data.user_id)
    .maybeSingle();

  if (coordinatorLookupError) throw new Error(coordinatorLookupError.message);
  if (!coordinator) throw new Error("El usuario no esta vinculado a este coordinador.");

  const authUpdate: { email: string; password?: string } = {
    email: parsed.data.email
  };

  if (parsed.data.password) {
    if (parsed.data.password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }
    authUpdate.password = parsed.data.password;
  }

  const { error: authError } = await service.auth.admin.updateUserById(parsed.data.user_id, authUpdate);
  if (authError) throw new Error(authError.message);

  const active = parsed.data.active === "true";
  const { error: profileError } = await service
    .from("users_profile")
    .update({
      email: parsed.data.email,
      role_code: "coordinator",
      active
    })
    .eq("id", parsed.data.user_id);
  if (profileError) throw new Error(profileError.message);

  const { error: coordinatorError } = await service
    .from("coordinators")
    .update({ active })
    .eq("id", parsed.data.coordinator_id);
  if (coordinatorError) throw new Error(coordinatorError.message);

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/coordinador");
}

const updateCoordinatorRecordSchema = z.object({
  coordinator_id: z.string().uuid(),
  name: z.string().min(2, "Escribe el nombre del coordinador.").max(160),
  active: z.enum(["true", "false"])
});

export async function updateCoordinatorRecordAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = updateCoordinatorRecordSchema.safeParse({
    coordinator_id: formData.get("coordinator_id"),
    name: cleanString(formData.get("name")),
    active: formData.get("active")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { error } = await supabase
    .from("coordinators")
    .update({
      name: normalizeKey(parsed.data.name),
      active: parsed.data.active === "true"
    })
    .eq("id", parsed.data.coordinator_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/coordinador");
  revalidatePath("/docentes");
}

const deleteCoordinatorRecordSchema = z.object({
  coordinator_id: z.string().uuid()
});

export async function deleteCoordinatorRecordAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = deleteCoordinatorRecordSchema.safeParse({
    coordinator_id: formData.get("coordinator_id")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { data: coordinator, error: lookupError } = await supabase
    .from("coordinators")
    .select("id, profile_id")
    .eq("id", parsed.data.coordinator_id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!coordinator) throw new Error("No se encontro el coordinador.");
  if (coordinator.profile_id) {
    throw new Error("No se puede eliminar un coordinador con usuario vinculado. Primero desactiva o cambia ese usuario.");
  }

  const { error } = await supabase.from("coordinators").delete().eq("id", parsed.data.coordinator_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/coordinador");
  revalidatePath("/docentes");
}

const updateCoordinatorCareersSchema = z.object({
  coordinator_id: z.string().uuid(),
  career_ids: z.array(z.string().uuid())
});

export async function updateCoordinatorCareersAction(formData: FormData) {
  const supabase = await requireAdmin();
  const uniqueCareerIds = Array.from(new Set(getStringList(formData, "career_ids")));
  const parsed = updateCoordinatorCareersSchema.safeParse({
    coordinator_id: formData.get("coordinator_id"),
    career_ids: uniqueCareerIds
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { data: coordinator, error: coordinatorError } = await supabase
    .from("coordinators")
    .select("id")
    .eq("id", parsed.data.coordinator_id)
    .maybeSingle();
  if (coordinatorError) throw new Error(coordinatorError.message);
  if (!coordinator) throw new Error("No se encontro el coordinador.");

  if (parsed.data.career_ids.length > 0) {
    const { data: careers, error: careersError } = await supabase
      .from("careers")
      .select("id")
      .in("id", parsed.data.career_ids);
    if (careersError) throw new Error(careersError.message);

    const validCareerIds = new Set((careers ?? []).map((career) => career.id));
    if (validCareerIds.size !== parsed.data.career_ids.length) {
      throw new Error("Una o mas carreras seleccionadas no existen.");
    }
  }

  const { error: deleteError } = await supabase
    .from("coordinator_careers")
    .delete()
    .eq("coordinator_id", parsed.data.coordinator_id);
  if (deleteError) throw new Error(deleteError.message);

  if (parsed.data.career_ids.length > 0) {
    const { error: insertError } = await supabase.from("coordinator_careers").insert(
      parsed.data.career_ids.map((careerId) => ({
        coordinator_id: parsed.data.coordinator_id,
        career_id: careerId
      }))
    );
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/coordinador");
  revalidatePath("/carreras");
  revalidatePath("/grupos");
  revalidatePath("/grupos/nuevo");
  revalidatePath("/materias");
}

const teacherSchema = z.object({
  name: z.string().min(2, "Escribe el nombre del docente.").max(160),
  email: z.string().email("Escribe un correo válido.").optional().or(z.literal("")),
  max_hours: z.coerce.number().min(0, "Las horas no pueden ser negativas.").max(99)
});

async function replaceTeacherProfiles(supabase: Awaited<ReturnType<typeof createClient>>, teacherId: string, profileCodes: string[]) {
  const uniqueProfiles = uniqueValidProfileCodes(profileCodes);

  const { error: deleteError } = await supabase
    .from("teacher_available_profiles")
    .delete()
    .eq("teacher_id", teacherId);
  if (deleteError) throw new Error(deleteError.message);

  if (uniqueProfiles.length === 0) return;

  const { error: insertError } = await supabase.from("teacher_available_profiles").insert(
    uniqueProfiles.map((profileCode) => ({
      teacher_id: teacherId,
      profile_code: profileCode
    }))
  );
  if (insertError) throw new Error(insertError.message);
}

export async function createTeacherAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = teacherSchema.safeParse({
    name: cleanString(formData.get("name")),
    email: cleanString(formData.get("email")),
    max_hours: formData.get("max_hours")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { data: teacher, error } = await supabase
    .from("teachers")
    .upsert(
      {
        name: parsed.data.name,
        normalized_name: normalizeKey(parsed.data.name),
        email: parsed.data.email || null,
        max_hours: parsed.data.max_hours,
        active: true
      },
      { onConflict: "normalized_name" }
    )
    .select("id")
    .single();

  if (error || !teacher) throw new Error(error?.message ?? "No se pudo guardar el docente.");

  await replaceTeacherProfiles(supabase, teacher.id, getStringList(formData, "profile_codes"));
  revalidatePath("/docentes");
}

const teacherIdSchema = z.object({
  teacher_id: z.string().uuid()
});

export async function updateTeacherProfilesAction(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
  const parsed = teacherIdSchema.safeParse({
    teacher_id: formData.get("teacher_id")
  });

  if (!parsed.success) throw new Error("Selecciona un docente válido.");

  if (profile.role_code !== "admin" && profile.role_code !== "coordinator") {
    throw new Error("No tienes permiso para modificar este docente.");
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", parsed.data.teacher_id)
    .maybeSingle();

  if (!teacher) {
    throw new Error("Solo puedes modificar docentes a tu cargo.");
  }

  await replaceTeacherProfiles(supabase, parsed.data.teacher_id, getStringList(formData, "profile_codes"));
  revalidatePath("/docentes");
  revalidatePath("/coordinador");
  revalidatePath("/grupos");
}

const teacherMaxHoursSchema = z.object({
  teacher_id: z.string().uuid(),
  max_hours: z.coerce.number().min(0, "Las horas no pueden ser negativas.").max(99)
});

export async function updateTeacherMaxHoursAction(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
  const parsed = teacherMaxHoursSchema.safeParse({
    teacher_id: formData.get("teacher_id"),
    max_hours: formData.get("max_hours")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  if (profile.role_code !== "admin" && profile.role_code !== "coordinator") {
    throw new Error("No tienes permiso para modificar este docente.");
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, assigned_hours")
    .eq("id", parsed.data.teacher_id)
    .maybeSingle();

  if (!teacher) {
    throw new Error("Solo puedes modificar docentes a tu cargo.");
  }

  if (Number(parsed.data.max_hours) < Number(teacher.assigned_hours ?? 0)) {
    throw new Error("Las horas maximas no pueden quedar debajo de las horas ya asignadas.");
  }

  const { error } = await supabase
    .from("teachers")
    .update({ max_hours: parsed.data.max_hours })
    .eq("id", parsed.data.teacher_id);

  if (error) throw new Error(error.message);

  revalidatePath("/docentes");
  revalidatePath("/coordinador");
  revalidatePath("/grupos");
}

const customScheduleBlockSchema = z.object({
  group_id: z.string().uuid(),
  day_of_week: z.coerce.number().int().min(1).max(6),
  starts_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa formato HH:MM."),
  ends_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa formato HH:MM.")
});

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function createCustomScheduleBlockAction(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
  const parsed = customScheduleBlockSchema.safeParse({
    group_id: formData.get("group_id"),
    day_of_week: formData.get("day_of_week"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  if (profile.role_code !== "admin" && profile.role_code !== "coordinator") {
    throw new Error("No tienes permiso para crear bloques personalizados.");
  }

  const startsAt = parsed.data.starts_at;
  const endsAt = parsed.data.ends_at;
  const startsAtMinutes = timeToMinutes(startsAt);
  const endsAtMinutes = timeToMinutes(endsAt);

  if (endsAtMinutes <= startsAtMinutes) {
    throw new Error("La hora final debe ser posterior a la hora inicial.");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, modality, shift")
    .eq("id", parsed.data.group_id)
    .maybeSingle();

  if (!group) {
    throw new Error("No tienes permiso para modificar este grupo.");
  }

  const { data: template } = await supabase
    .from("schedule_templates")
    .select("id")
    .eq("modality", group.modality)
    .eq("shift", group.shift)
    .eq("active", true)
    .maybeSingle();

  if (!template) {
    throw new Error("No existe un cuadro de horario para este grupo.");
  }

  const day = WEEKDAYS.find((item) => item.value === parsed.data.day_of_week);
  const label = `${day?.short ?? "DIA"} ${startsAt}-${endsAt} personalizado`;

  const { error } = await supabase.from("schedule_blocks").insert({
    template_id: template.id,
    day_of_week: parsed.data.day_of_week,
    starts_at: startsAt,
    ends_at: endsAt,
    label,
    position: startsAtMinutes,
    active: true,
    is_custom: true,
    created_by: profile.id
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un bloque con ese dia y horario para este cuadro.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/coordinador");
  revalidatePath(`/grupos/${parsed.data.group_id}`);
  revalidatePath("/horarios");
}

const teacherActiveSchema = z.object({
  teacher_id: z.string().uuid(),
  active: z.enum(["true", "false"])
});

export async function setTeacherActiveAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = teacherActiveSchema.safeParse({
    teacher_id: formData.get("teacher_id"),
    active: formData.get("active")
  });

  if (!parsed.success) throw new Error("Selecciona un docente válido.");

  const { error } = await supabase
    .from("teachers")
    .update({ active: parsed.data.active === "true" })
    .eq("id", parsed.data.teacher_id);

  if (error) throw new Error(error.message);

  revalidatePath("/docentes");
  revalidatePath("/grupos");
}

const subjectSchema = z.object({
  career_id: z.string().uuid(),
  name: z.string().min(2, "Escribe el nombre de la materia.").max(160),
  quarter: z.coerce.number().int().min(1).max(12),
  default_hours: z.coerce.number().positive("Las horas deben ser mayores a cero.").max(99)
});

async function replaceSubjectRequirements(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  subjectId: string,
  profileCodes: string[]
) {
  const uniqueProfiles = uniqueValidProfileCodes(profileCodes);

  const { error: deleteError } = await supabase
    .from("class_requirements")
    .delete()
    .eq("subject_id", subjectId);
  if (deleteError) throw new Error(deleteError.message);

  if (uniqueProfiles.length === 0) return;

  const { error: insertError } = await supabase.from("class_requirements").insert(
    uniqueProfiles.map((profileCode) => ({
      subject_id: subjectId,
      profile_code: profileCode
    }))
  );
  if (insertError) throw new Error(insertError.message);
}

export async function createSubjectAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = subjectSchema.safeParse({
    career_id: formData.get("career_id"),
    name: cleanString(formData.get("name")),
    quarter: formData.get("quarter"),
    default_hours: formData.get("default_hours")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { data: subject, error } = await supabase
    .from("subjects")
    .upsert(
      {
        ...parsed.data,
        normalized_name: normalizeKey(parsed.data.name),
        active: true
      },
      { onConflict: "career_id,quarter,normalized_name" }
    )
    .select("id")
    .single();

  if (error || !subject) throw new Error(error?.message ?? "No se pudo guardar la materia.");

  await replaceSubjectRequirements(supabase, subject.id, getStringList(formData, "profile_codes"));

  revalidatePath("/materias");
  revalidatePath("/carreras");
  revalidatePath(`/carreras/${parsed.data.career_id}/materias`);
}

const updateSubjectSchema = subjectSchema.extend({
  subject_id: z.string().uuid()
});

export async function updateSubjectAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = updateSubjectSchema.safeParse({
    subject_id: formData.get("subject_id"),
    career_id: formData.get("career_id"),
    name: cleanString(formData.get("name")),
    quarter: formData.get("quarter"),
    default_hours: formData.get("default_hours")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { error } = await supabase
    .from("subjects")
    .update({
      name: parsed.data.name,
      normalized_name: normalizeKey(parsed.data.name),
      quarter: parsed.data.quarter,
      default_hours: parsed.data.default_hours
    })
    .eq("id", parsed.data.subject_id)
    .eq("career_id", parsed.data.career_id);

  if (error) throw new Error(error.message);

  await replaceSubjectRequirements(supabase, parsed.data.subject_id, getStringList(formData, "profile_codes"));

  revalidatePath("/materias");
  revalidatePath("/carreras");
  revalidatePath(`/carreras/${parsed.data.career_id}/materias`);
}

const subjectActiveSchema = z.object({
  subject_id: z.string().uuid(),
  career_id: z.string().uuid(),
  active: z.enum(["true", "false"])
});

export async function setSubjectActiveAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = subjectActiveSchema.safeParse({
    subject_id: formData.get("subject_id"),
    career_id: formData.get("career_id"),
    active: formData.get("active")
  });

  if (!parsed.success) throw new Error("Selecciona una materia válida.");

  const { error } = await supabase
    .from("subjects")
    .update({ active: parsed.data.active === "true" })
    .eq("id", parsed.data.subject_id)
    .eq("career_id", parsed.data.career_id);

  if (error) throw new Error(error.message);

  revalidatePath("/materias");
  revalidatePath("/grupos/nuevo");
  revalidatePath(`/carreras/${parsed.data.career_id}/materias`);
}

const coordinatorCareerSchema = z.object({
  coordinator_id: z.string().uuid(),
  career_id: z.string().uuid()
});

export async function assignCoordinatorCareerAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = coordinatorCareerSchema.safeParse({
    coordinator_id: formData.get("coordinator_id"),
    career_id: formData.get("career_id")
  });
  if (!parsed.success) throw new Error("Selecciona coordinador y carrera.");

  const { error } = await supabase.from("coordinator_careers").upsert(parsed.data, {
    onConflict: "coordinator_id,career_id"
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/coordinadores");
}

const coordinatorTeacherSchema = z.object({
  coordinator_id: z.string().uuid(),
  teacher_id: z.string().uuid()
});

export async function assignCoordinatorTeacherAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = coordinatorTeacherSchema.safeParse({
    coordinator_id: formData.get("coordinator_id"),
    teacher_id: formData.get("teacher_id")
  });
  if (!parsed.success) throw new Error("Selecciona coordinador y docente.");

  const { error } = await supabase.from("coordinator_teachers").upsert(parsed.data, {
    onConflict: "coordinator_id,teacher_id"
  });
  if (error) throw new Error(error.message);

  await supabase
    .from("teachers")
    .update({ responsible_coordinator_id: parsed.data.coordinator_id })
    .eq("id", parsed.data.teacher_id);

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/docentes");
}
