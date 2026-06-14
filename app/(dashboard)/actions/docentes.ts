"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireAuthenticatedProfile } from "@/lib/supabase/auth-helpers";
import { cleanString, getStringList, normalizeKey } from "@/app/(dashboard)/actions/utils";
import { isValidProfileCode, normalizeProfileCode, uniqueValidProfileCodes } from "@/lib/profiles";

const teacherSchema = z.object({
  name: z.string().min(2, "Escribe el nombre del docente.").max(160),
  email: z.string().email("Escribe un correo valido.").optional().or(z.literal("")),
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

  if (!parsed.success) throw new Error("Selecciona un docente valido.");

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

  if (!parsed.success) throw new Error("Selecciona un docente valido.");

  const { error } = await supabase
    .from("teachers")
    .update({ active: parsed.data.active === "true" })
    .eq("id", parsed.data.teacher_id);

  if (error) throw new Error(error.message);

  revalidatePath("/docentes");
  revalidatePath("/grupos");
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
