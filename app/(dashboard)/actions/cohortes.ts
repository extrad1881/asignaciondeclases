"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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

const manualHistorySchema = z.object({
  cohort_id: z.string().uuid("Selecciona una cohorte válida."),
  subject_ids: z.array(z.string().uuid("Selecciona materias válidas.")).max(300)
});

const generationResultSchema = z.object({
  status: z.enum(["created", "already_exists", "needs_initial_group", "completed"]),
  group_id: z.string().uuid().optional(),
  group_name: z.string().optional(),
  quarter: z.coerce.number().int().min(1).max(12),
  subject_count: z.coerce.number().int().nonnegative().optional()
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
    return actionSuccess("Cohorte creada correctamente. Ahora crea y vincula su primer grupo manualmente.", "/grupos/nuevo");
  } catch (error) {
    return actionFailure(error, "No se pudo crear la cohorte.");
  }
}

export async function advanceCohortAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { supabase } = await requireAuthenticatedProfile();
    const parsed = cohortIdSchema.safeParse({ cohort_id: formData.get("cohort_id") });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((i) => i.message).join(" ")));
    }

    const { data, error } = await supabase.rpc("generate_cohort_group_for_active_cycle", {
      p_cohort_group_id: parsed.data.cohort_id
    });
    if (error) return actionFailure(error);

    const result = generationResultSchema.safeParse(data);
    if (!result.success) {
      return actionFailure(new Error("La base de datos devolvió un resultado inesperado al generar el grupo."));
    }

    revalidatePath("/cohortes");
    revalidatePath(`/cohortes/${parsed.data.cohort_id}`);
    revalidatePath("/grupos");

    if (result.data.status === "needs_initial_group") {
      return actionSuccess(
        "Esta cohorte todavía necesita que captures y vincules su primer grupo manualmente.",
        "/grupos/nuevo"
      );
    }

    if (result.data.status === "already_exists") {
      return actionSuccess(
        "La cohorte ya tiene un grupo en el ciclo activo; no se creó ningún duplicado.",
        result.data.group_id ? `/grupos/${result.data.group_id}` : undefined
      );
    }

    if (result.data.status === "completed") {
      return actionSuccess("La cohorte completó el último cuatrimestre de su plan de estudios.");
    }

    return actionSuccess(
      `Grupo "${result.data.group_name}" creado en el cuatrimestre ${result.data.quarter} con ${result.data.subject_count ?? 0} materias.`,
      result.data.group_id ? `/grupos/${result.data.group_id}` : undefined
    );
  } catch (error) {
    return actionFailure(error, "No se pudo generar el grupo pendiente de la cohorte.");
  }
}

async function completeCohort(formData: FormData) {
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

export async function completeCohortAction(formData: FormData) {
  await completeCohort(formData);
}

export async function completeCohortStateAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await completeCohort(formData);
    return actionSuccess("Cohorte completada correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo completar la cohorte.");
  }
}

async function archiveCohort(formData: FormData) {
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

export async function archiveCohortAction(formData: FormData) {
  await archiveCohort(formData);
}

export async function archiveCohortStateAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await archiveCohort(formData);
    return actionSuccess("Cohorte archivada correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo archivar la cohorte.");
  }
}

export async function updateCohortManualHistoryStateAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = manualHistorySchema.safeParse({
      cohort_id: formData.get("cohort_id"),
      subject_ids: formData.getAll("subject_ids")
    });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((issue) => issue.message).join(" ")));
    }

    const { supabase } = await requireAuthenticatedProfile();
    const { data, error } = await supabase.rpc("set_cohort_manual_completed_subjects", {
      p_cohort_group_id: parsed.data.cohort_id,
      p_subject_ids: parsed.data.subject_ids
    });
    if (error) return actionFailure(error);

    revalidatePath("/cohortes");
    revalidatePath(`/cohortes/${parsed.data.cohort_id}`);
    revalidatePath("/grupos");

    const subjectCount = Number(data ?? 0);
    return actionSuccess(
      subjectCount === 1
        ? "Historial actualizado con 1 materia registrada manualmente."
        : `Historial actualizado con ${subjectCount} materias registradas manualmente.`
    );
  } catch (error) {
    return actionFailure(error, "No se pudo actualizar el historial de materias cursadas.");
  }
}

export async function permanentDeleteCohortStateAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { supabase, profile } = await requireAuthenticatedProfile();
    if (profile.role_code !== "admin") {
      return actionFailure(new Error("Solo el administrador puede eliminar cohortes permanentemente."));
    }

    const parsed = cohortIdSchema.safeParse({ cohort_id: formData.get("cohort_id") });
    if (!parsed.success) {
      return actionFailure(new Error("Selecciona una cohorte válida."));
    }

    const { data: cohort, error: cohortError } = await supabase
      .from("cohort_groups")
      .select("id, name")
      .eq("id", parsed.data.cohort_id)
      .maybeSingle();
    if (cohortError) throw new Error(getSafeErrorMessage(cohortError));
    if (!cohort) return actionFailure(new Error("La cohorte ya no existe o no está disponible."));

    const { count: linkedGroupCount, error: countError } = await supabase
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("cohort_group_id", cohort.id);
    if (countError) throw new Error(getSafeErrorMessage(countError));

    const { data: deletedCohort, error: deleteError } = await supabase
      .from("cohort_groups")
      .delete()
      .eq("id", cohort.id)
      .select("id")
      .maybeSingle();
    if (deleteError) throw new Error(getSafeErrorMessage(deleteError));
    if (!deletedCohort) {
      return actionFailure(new Error("No se pudo confirmar la eliminación de la cohorte."));
    }

    revalidatePath("/cohortes");
    revalidatePath(`/cohortes/${cohort.id}`);
    revalidatePath("/grupos");
    revalidatePath("/coordinador");

    const groupCount = linkedGroupCount ?? 0;
    const preservedGroupsMessage = groupCount === 0
      ? "No tenía grupos vinculados."
      : groupCount === 1
        ? "Su grupo vinculado se conservó y quedó desvinculado."
        : `Sus ${groupCount} grupos vinculados se conservaron y quedaron desvinculados.`;
    const redirectTo = formData.get("redirect_to") === "/cohortes" ? "/cohortes" : undefined;

    return actionSuccess(
      `Cohorte "${cohort.name}" eliminada permanentemente. ${preservedGroupsMessage}`,
      redirectTo
    );
  } catch (error) {
    return actionFailure(error, "No se pudo eliminar la cohorte permanentemente.");
  }
}
