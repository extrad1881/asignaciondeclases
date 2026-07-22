"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { cleanString, getStringList, normalizeKey } from "@/app/(dashboard)/actions/utils";
import { uniqueValidProfileCodes } from "@/lib/profiles";

const subjectSchema = z.object({
  career_id: z.string().uuid(),
  name: z.string().min(2, "Escribe el nombre de la materia.").max(160),
  quarter: z.coerce.number().int().min(1).max(12),
  default_hours: z.coerce.number().positive("Las horas deben ser mayores a cero.").max(99)
});

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

  const { error } = await supabase.rpc("upsert_subject_with_requirements", {
    p_subject_id: crypto.randomUUID(),
    p_career_id: parsed.data.career_id,
    p_name: parsed.data.name,
    p_normalized_name: normalizeKey(parsed.data.name),
    p_quarter: parsed.data.quarter,
    p_default_hours: parsed.data.default_hours,
    p_profile_codes: uniqueValidProfileCodes(getStringList(formData, "profile_codes"))
  });

  if (error) throw new Error(error.message);

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

  const { error } = await supabase.rpc("upsert_subject_with_requirements", {
    p_subject_id: parsed.data.subject_id,
    p_career_id: parsed.data.career_id,
    p_name: parsed.data.name,
    p_normalized_name: normalizeKey(parsed.data.name),
    p_quarter: parsed.data.quarter,
    p_default_hours: parsed.data.default_hours,
    p_profile_codes: uniqueValidProfileCodes(getStringList(formData, "profile_codes"))
  });

  if (error) throw new Error(error.message);

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

  if (!parsed.success) throw new Error("Selecciona una materia valida.");

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
