"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedProfile } from "@/lib/supabase/auth-helpers";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/actions/action-state";
import { getSafeErrorMessage } from "@/lib/supabase/error-utils";
import { cleanString, getStringList, normalizeKey } from "@/app/(dashboard)/actions/utils";
import { isValidProfileCode, normalizeProfileCode } from "@/lib/profiles";
import { groupSchema } from "@/lib/validations/groups";

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
  if (!profile) throw new Error("No hay una sesion activa.");

  if (profile.role_code === "admin") {
    return {
      client: supabase,
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
      client: supabase,
      canSaveCatalogRequirements: false
    };
  }

  throw new Error("No tienes permiso para agregar materias extra.");
}

async function createGroupFromFormData(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
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

  if (profile.role_code !== "admin") {
    const { data: allowed, error } = await supabase.rpc("can_access_career", {
      target_career_id: parsed.data.career_id
    });
    if (error || !allowed) {
      throw new Error("No tienes permiso para crear grupos en esta carrera.");
    }
  }

  const subjectIds = getStringList(formData, "subject_ids");
  const externalSubjects = getExternalSubjects(formData, parsed.data.quarter);

  if (subjectIds.length === 0 && externalSubjects.length === 0) {
    throw new Error("Selecciona al menos una materia para el grupo.");
  }

  const groupSubjects = [
    ...subjectIds.map((subjectId) => ({
      subject_id: subjectId,
      hours_per_week: Number(formData.get(`hours_${subjectId}`) ?? 5)
    })),
    ...externalSubjects.map((subject) => ({
      name: subject.name,
      quarter: subject.quarter,
      hours_per_week: subject.hours_per_week,
      required_profile_code: subject.required_profile_code
    }))
  ];

  const { data: groupId, error } = await (supabase as any).rpc("create_group_with_subjects", {
    p_academic_cycle_id: parsed.data.academic_cycle_id,
    p_career_id: parsed.data.career_id,
    p_quarter: parsed.data.quarter,
    p_modality: parsed.data.modality,
    p_shift: parsed.data.shift,
    p_name: parsed.data.name,
    p_classroom_id: parsed.data.classroom_id || null,
    p_subjects: groupSubjects
  });

  if (error) throw new Error(error.message);

  const cohortGroupId = cleanString(formData.get("cohort_group_id"));
  const completedSubjectIds = getStringList(formData, "completed_subject_ids");

  if (cohortGroupId && groupId) {
    const { error: linkError } = await supabase
      .from("groups")
      .update({ cohort_group_id: cohortGroupId })
      .eq("id", groupId);
    if (linkError) throw new Error(linkError.message);

    if (completedSubjectIds.length > 0) {
      const { error: historyError } = await supabase
        .from("cohort_subject_history")
        .upsert(
          completedSubjectIds.map((subjectId) => ({
            cohort_group_id: cohortGroupId,
            subject_id: subjectId,
            quarter: Math.max(1, Number(parsed.data.quarter) - 1),
            group_id: groupId
          })),
          { onConflict: "cohort_group_id,subject_id" }
        );
      if (historyError) throw new Error(historyError.message);
    }
  }

  revalidatePath("/grupos");
  revalidatePath("/materias");
  revalidatePath("/carreras");
  revalidatePath("/coordinador");
  revalidatePath(`/carreras/${parsed.data.career_id}/materias`);
  revalidatePath("/cohortes");

  return String(groupId);
}

export async function createGroupAction(formData: FormData) {
  const groupId = await createGroupFromFormData(formData);
  redirect(`/grupos/${groupId}`);
}

export async function createGroupStateAction(_previousState: ActionState, formData: FormData) {
  try {
    const groupId = await createGroupFromFormData(formData);
    return actionSuccess("Grupo creado correctamente.", `/grupos/${groupId}`);
  } catch (error) {
    return actionFailure(error, "No se pudo crear el grupo.");
  }
}

const statusTransitionSchema = z.object({
  group_id: z.string().uuid()
});

async function transitionGroupStatus(formData: FormData, newStatus: string) {
  const { supabase } = await requireAuthenticatedProfile();
  const parsed = statusTransitionSchema.safeParse({
    group_id: formData.get("group_id")
  });

  if (!parsed.success) {
    throw new Error("Selecciona un grupo valido.");
  }

  const { error } = await supabase
    .from("groups")
    .update({ status: newStatus })
    .eq("id", parsed.data.group_id);

  if (error) throw new Error(error.message);

  revalidatePath("/grupos");
  revalidatePath(`/grupos/${parsed.data.group_id}`);
}

export async function setGroupDraftAction(formData: FormData) {
  await transitionGroupStatus(formData, "draft");
}

export async function setGroupReviewAction(formData: FormData) {
  await transitionGroupStatus(formData, "review");
}

export async function setGroupFinalAction(formData: FormData) {
  await transitionGroupStatus(formData, "final");
}

export async function setGroupArchivedAction(formData: FormData) {
  await transitionGroupStatus(formData, "archived");
}

export async function setGroupDraftStateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await setGroupDraftAction(formData);
    return actionSuccess("Grupo enviado a borrador.");
  } catch (error) {
    return actionFailure(error, "No se pudo cambiar el estado del grupo.");
  }
}

export async function setGroupReviewStateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await setGroupReviewAction(formData);
    return actionSuccess("Grupo enviado a revisión.");
  } catch (error) {
    return actionFailure(error, "No se pudo cambiar el estado del grupo.");
  }
}

export async function setGroupFinalStateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await setGroupFinalAction(formData);
    return actionSuccess("Grupo finalizado.");
  } catch (error) {
    return actionFailure(error, "No se pudo finalizar el grupo.");
  }
}

export async function setGroupArchivedStateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await setGroupArchivedAction(formData);
    return actionSuccess("Grupo archivado.");
  } catch (error) {
    return actionFailure(error, "No se pudo archivar el grupo.");
  }
}

const updateHoursSchema = z.object({
  group_subject_id: z.string().uuid(),
  group_id: z.string().uuid(),
  hours_per_week: z.coerce.number().min(0.5, "El minimo es 0.5 h.").max(99, "El maximo es 99 h.")
});

export async function updateGroupSubjectHoursAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = updateHoursSchema.safeParse({
      group_subject_id: formData.get("group_subject_id"),
      group_id: formData.get("group_id"),
      hours_per_week: formData.get("hours_per_week")
    });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((i) => i.message).join(" ")));
    }

    const { supabase, profile } = await requireAuthenticatedProfile();

    if (profile.role_code !== "admin") {
      const { data: group } = await supabase
        .from("groups")
        .select("career_id")
        .eq("id", parsed.data.group_id)
        .single();
      if (!group) return actionFailure(new Error("Grupo no encontrado."));

      const { data: allowed } = await supabase.rpc("can_access_career", {
        target_career_id: group.career_id
      });
      if (!allowed) return actionFailure(new Error("No tienes permiso para modificar este grupo."));
    }

    const { data: existing, error: fetchError } = await supabase
      .from("group_subjects")
      .select("id, hours_per_week, subject_id")
      .eq("id", parsed.data.group_subject_id)
      .single();
    if (fetchError || !existing) return actionFailure(new Error("Materia del grupo no encontrada."));

    const { data: assignedRows } = await supabase
      .from("assignments")
      .select("duration_hours")
      .eq("group_subject_id", parsed.data.group_subject_id)
      .eq("status", "active");
    const totalAssigned = (assignedRows ?? []).reduce((sum: number, row: any) => sum + Number(row.duration_hours ?? 0), 0);

    const { error: updateError } = await supabase
      .from("group_subjects")
      .update({ hours_per_week: parsed.data.hours_per_week })
      .eq("id", parsed.data.group_subject_id);

    if (updateError) return actionFailure(updateError);

    revalidatePath(`/grupos/${parsed.data.group_id}`);
    revalidatePath("/coordinador");

    if (parsed.data.hours_per_week < totalAssigned) {
      return actionSuccess(
        `Limite actualizado a ${parsed.data.hours_per_week} h. La materia tiene ${totalAssigned} h ya asignadas — esta excedida.`
      );
    }

    return actionSuccess(`Limite actualizado a ${parsed.data.hours_per_week} h.`);
  } catch (error) {
    return actionFailure(error, "No se pudo actualizar el limite de horas.");
  }
}

export async function permanentDeleteGroupAction(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
  if (profile.role_code !== "admin") throw new Error("Solo el administrador puede eliminar grupos permanentemente.");

  const groupId = cleanString(formData.get("group_id"));
  if (!groupId) throw new Error("Grupo no valido.");

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, cohort_group_id")
    .eq("id", groupId)
    .single();
  if (!group) throw new Error("Grupo no encontrado.");

  if (group.cohort_group_id) {
    const { data: cohort } = await supabase
      .from("cohort_groups")
      .select("status")
      .eq("id", group.cohort_group_id)
      .maybeSingle();
    if (cohort?.status === "active") {
      throw new Error("No se puede eliminar un grupo vinculado a una cohorte activa. Archiva la cohorte primero.");
    }
  }

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);
  if (error) throw new Error(getSafeErrorMessage(error));

  revalidatePath("/grupos");
  revalidatePath("/coordinador");
  revalidatePath("/cohortes");

  redirect("/grupos");
}
