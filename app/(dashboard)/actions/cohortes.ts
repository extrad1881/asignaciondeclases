"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedProfile } from "@/lib/supabase/auth-helpers";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/actions/action-state";
import { getSafeErrorMessage } from "@/lib/supabase/error-utils";

const cohortSchema = z.object({
  name: z.string().min(2, "El nombre es requerido.").max(160),
  career_id: z.string().uuid("Selecciona una carrera."),
  modality: z.string().min(1),
  shift: z.string().min(1)
});

const cohortIdSchema = z.object({
  cohort_id: z.string().uuid()
});

export async function createCohortAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { supabase, profile } = await requireAuthenticatedProfile();
    const parsed = cohortSchema.safeParse({
      name: formData.get("name"),
      career_id: formData.get("career_id"),
      modality: formData.get("modality"),
      shift: formData.get("shift")
    });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((i) => i.message).join(" ")));
    }

    if (profile.role_code !== "admin") {
      const { data: allowed } = await supabase.rpc("can_access_career", {
        target_career_id: parsed.data.career_id
      });
      if (!allowed) return actionFailure(new Error("No tienes permiso para crear cohortes en esta carrera."));
    }

    const { error } = await supabase.from("cohort_groups").insert({
      name: parsed.data.name,
      career_id: parsed.data.career_id,
      modality: parsed.data.modality,
      shift: parsed.data.shift,
      current_quarter: 1,
      status: "active"
    });
    if (error) return actionFailure(error);

    revalidatePath("/cohortes");
    return actionSuccess("Cohorte creada correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo crear la cohorte.");
  }
}

export async function advanceCohortAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { supabase, profile } = await requireAuthenticatedProfile();
    const parsed = cohortIdSchema.safeParse({ cohort_id: formData.get("cohort_id") });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((i) => i.message).join(" ")));
    }

    const { data: cohort, error: cohortError } = await supabase
      .from("cohort_groups")
      .select("id, name, career_id, modality, shift, current_quarter, status")
      .eq("id", parsed.data.cohort_id)
      .single();
    if (cohortError || !cohort) return actionFailure(new Error("Cohorte no encontrada."));
    if (cohort.current_quarter >= 12) return actionFailure(new Error("La cohorte ya llego al ultimo cuatrimestre."));

    if (profile.role_code !== "admin") {
      const { data: allowed } = await supabase.rpc("can_access_career", {
        target_career_id: cohort.career_id
      });
      if (!allowed) return actionFailure(new Error("No tienes permiso para modificar esta cohorte."));
    }

    const nextQuarter = Number(cohort.current_quarter) + 1;

    const { data: activeCycle } = await supabase
      .from("academic_cycles")
      .select("id")
      .eq("status", "active")
      .maybeSingle();
    if (!activeCycle) return actionFailure(new Error("No hay un ciclo escolar activo."));

    const { data: currentGroups } = await supabase
      .from("groups")
      .select("id, group_subjects(id, subject_id)")
      .eq("cohort_group_id", cohort.id)
      .eq("quarter", cohort.current_quarter);

    for (const group of (currentGroups ?? []) as any[]) {
      for (const gs of (group.group_subjects ?? []) as any[]) {
        const { error: historyError } = await supabase
          .from("cohort_subject_history")
          .upsert({
            cohort_group_id: cohort.id,
            subject_id: gs.subject_id,
            quarter: Number(cohort.current_quarter),
            group_id: group.id
          }, { onConflict: "cohort_group_id,subject_id" });
        if (historyError) return actionFailure(historyError);
      }
    }

    const { data: completedSubjects } = await supabase
      .from("cohort_subject_history")
      .select("subject_id")
      .eq("cohort_group_id", cohort.id);
    const completedIds = (completedSubjects ?? []).map((row: any) => row.subject_id);

    const { data: nextSubjects } = await supabase
      .from("subjects")
      .select("id, default_hours")
      .eq("career_id", cohort.career_id)
      .eq("quarter", nextQuarter)
      .eq("active", true);

    const filteredSubjects = (nextSubjects ?? []).filter(
      (subject: any) => !completedIds.includes(subject.id)
    );

    const groupName = `${cohort.name} Q${nextQuarter}`;

    const { data: newGroupId, error: groupError } = await supabase.rpc("create_group_with_subjects", {
      p_academic_cycle_id: activeCycle.id,
      p_career_id: cohort.career_id,
      p_quarter: nextQuarter,
      p_modality: cohort.modality,
      p_shift: cohort.shift,
      p_name: groupName,
      p_classroom_id: null as unknown as string,
      p_subjects: filteredSubjects.map((s: any) => ({
        subject_id: s.id,
        hours_per_week: s.default_hours ?? 5
      }))
    });
    if (groupError) return actionFailure(groupError);

    const { error: linkError } = await supabase
      .from("groups")
      .update({ cohort_group_id: cohort.id })
      .eq("id", newGroupId);
    if (linkError) return actionFailure(linkError);

    const { error: updateError } = await supabase
      .from("cohort_groups")
      .update({ current_quarter: nextQuarter })
      .eq("id", cohort.id);
    if (updateError) return actionFailure(updateError);

    revalidatePath("/cohortes");
    revalidatePath(`/cohortes/${cohort.id}`);
    revalidatePath("/grupos");

    return actionSuccess(
      `Cohorte avanzada al cuatrimestre ${nextQuarter}. Grupo "${groupName}" creado con ${filteredSubjects.length} materias.`,
      `/grupos/${newGroupId}`
    );
  } catch (error) {
    return actionFailure(error, "No se pudo avanzar la cohorte.");
  }
}

export async function completeCohortAction(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
  if (profile.role_code !== "admin") throw new Error("Solo el administrador puede completar cohortes.");
  const parsed = cohortIdSchema.safeParse({ cohort_id: formData.get("cohort_id") });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));

  const { error } = await supabase
    .from("cohort_groups")
    .update({ status: "completed" })
    .eq("id", parsed.data.cohort_id);
  if (error) throw new Error(getSafeErrorMessage(error));

  revalidatePath("/cohortes");
  revalidatePath(`/cohortes/${parsed.data.cohort_id}`);
}

export async function archiveCohortAction(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
  if (profile.role_code !== "admin") throw new Error("Solo el administrador puede archivar cohortes.");
  const parsed = cohortIdSchema.safeParse({ cohort_id: formData.get("cohort_id") });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));

  const { error } = await supabase
    .from("cohort_groups")
    .update({ status: "archived" })
    .eq("id", parsed.data.cohort_id);
  if (error) throw new Error(getSafeErrorMessage(error));

  revalidatePath("/cohortes");
  revalidatePath(`/cohortes/${parsed.data.cohort_id}`);
}
