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
