"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/actions/action-state";
import { getSafeErrorMessage } from "@/lib/supabase/error-utils";

const cycleSchema = z.object({
  code: z.string().min(2, "El código es requerido.").max(20),
  name: z.string().min(3, "El nombre es requerido.").max(160),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  status: z.enum(["draft", "active"]).optional()
});

const cycleIdSchema = z.object({
  cycle_id: z.string().uuid("Selecciona un ciclo escolar.")
});

export async function createCycleAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const supabase = await requireAdmin();
    const parsed = cycleSchema.safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      starts_at: formData.get("starts_at"),
      ends_at: formData.get("ends_at"),
      status: formData.get("status") || undefined
    });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((i) => i.message).join(" ")));
    }

    const { error } = await supabase.from("academic_cycles").insert({
      code: parsed.data.code,
      name: parsed.data.name,
      status: parsed.data.status ?? "draft",
      starts_at: parsed.data.starts_at || null,
      ends_at: parsed.data.ends_at || null
    });
    if (error) return actionFailure(error);

    revalidatePath("/ciclos");
    return actionSuccess("Ciclo escolar creado correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo crear el ciclo escolar.");
  }
}

export async function updateCycleAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const supabase = await requireAdmin();
    const parsed = cycleIdSchema.safeParse({ cycle_id: formData.get("cycle_id") });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((i) => i.message).join(" ")));
    }

    const name = formData.get("name");
    const startsAt = formData.get("starts_at");
    const endsAt = formData.get("ends_at");

    const { error } = await supabase
      .from("academic_cycles")
      .update({
        name: typeof name === "string" && name.length >= 3 ? name : undefined,
        starts_at: typeof startsAt === "string" && startsAt.length > 0 ? startsAt : null,
        ends_at: typeof endsAt === "string" && endsAt.length > 0 ? endsAt : null
      })
      .eq("id", parsed.data.cycle_id);
    if (error) return actionFailure(error);

    revalidatePath("/ciclos");
    return actionSuccess("Ciclo escolar actualizado correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo actualizar el ciclo escolar.");
  }
}

async function activateCycle(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = cycleIdSchema.safeParse({ cycle_id: formData.get("cycle_id") });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));

  const { error: deactivateError } = await supabase
    .from("academic_cycles")
    .update({ status: "finalized" })
    .eq("status", "active");
  if (deactivateError) throw new Error(getSafeErrorMessage(deactivateError));

  const { error } = await supabase
    .from("academic_cycles")
    .update({ status: "active" })
    .eq("id", parsed.data.cycle_id);
  if (error) throw new Error(getSafeErrorMessage(error));
}

export async function activateCycleAction(formData: FormData) {
  await activateCycle(formData);
  revalidatePath("/ciclos");
}

export async function activateCycleStateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await activateCycle(formData);
    return actionSuccess("Ciclo activado correctamente. El ciclo anterior fue finalizado.");
  } catch (error) {
    return actionFailure(error, "No se pudo activar el ciclo escolar.");
  }
}

async function finalizeCycle(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = cycleIdSchema.safeParse({ cycle_id: formData.get("cycle_id") });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));

  const { error } = await supabase
    .from("academic_cycles")
    .update({ status: "finalized" })
    .eq("id", parsed.data.cycle_id);
  if (error) throw new Error(getSafeErrorMessage(error));
}

export async function finalizeCycleAction(formData: FormData) {
  await finalizeCycle(formData);
  revalidatePath("/ciclos");
}

export async function finalizeCycleStateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await finalizeCycle(formData);
    return actionSuccess("Ciclo finalizado correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo finalizar el ciclo escolar.");
  }
}

async function archiveCycle(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = cycleIdSchema.safeParse({ cycle_id: formData.get("cycle_id") });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));

  const { error } = await supabase
    .from("academic_cycles")
    .update({ status: "archived" })
    .eq("id", parsed.data.cycle_id);
  if (error) throw new Error(getSafeErrorMessage(error));
}

export async function archiveCycleAction(formData: FormData) {
  await archiveCycle(formData);
  revalidatePath("/ciclos");
}

export async function archiveCycleStateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await archiveCycle(formData);
    return actionSuccess("Ciclo archivado correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo archivar el ciclo escolar.");
  }
}
