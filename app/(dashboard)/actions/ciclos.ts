"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/actions/action-state";
import { getSafeErrorMessage } from "@/lib/supabase/error-utils";

const optionalDateSchema = z.union([
  z.literal(""),
  z.iso.date({ error: "Escribe una fecha válida." })
]);

function validateDateRange(
  value: { starts_at: string; ends_at: string },
  context: z.RefinementCtx
) {
  if (value.starts_at && value.ends_at && value.ends_at < value.starts_at) {
    context.addIssue({
      code: "custom",
      message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
      path: ["ends_at"]
    });
  }
}

const cycleSchema = z.object({
  code: z.string().trim().min(2, "El código es requerido.").max(20),
  name: z.string().trim().min(3, "El nombre es requerido.").max(160),
  starts_at: optionalDateSchema,
  ends_at: optionalDateSchema
}).superRefine(validateDateRange);

const cycleUpdateSchema = z.object({
  cycle_id: z.string().uuid("Selecciona un ciclo escolar."),
  name: z.string().trim().min(3, "El nombre es requerido.").max(160),
  starts_at: optionalDateSchema,
  ends_at: optionalDateSchema
}).superRefine(validateDateRange);

const cycleIdSchema = z.object({
  cycle_id: z.string().uuid("Selecciona un ciclo escolar.")
});

const activationResultSchema = z.object({
  status: z.literal("activated"),
  generated_count: z.coerce.number().int().nonnegative(),
  completed_count: z.coerce.number().int().nonnegative(),
  skipped_count: z.coerce.number().int().nonnegative(),
  pending_initial_count: z.coerce.number().int().nonnegative()
});

function revalidateCycleAutomationPaths() {
  revalidatePath("/ciclos");
  revalidatePath("/cohortes");
  revalidatePath("/grupos");
  revalidatePath("/coordinador");
}

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
      ends_at: formData.get("ends_at")
    });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((i) => i.message).join(" ")));
    }

    const { error } = await supabase.from("academic_cycles").insert({
      code: parsed.data.code,
      name: parsed.data.name,
      status: "draft",
      active: false,
      starts_at: parsed.data.starts_at || null,
      ends_at: parsed.data.ends_at || null
    });
    if (error) {
      if (error.code === "23505") {
        return actionFailure(new Error("Ya existe un ciclo escolar con ese código."));
      }
      return actionFailure(error);
    }

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
    const parsed = cycleUpdateSchema.safeParse({
      cycle_id: formData.get("cycle_id"),
      name: formData.get("name"),
      starts_at: formData.get("starts_at"),
      ends_at: formData.get("ends_at")
    });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((i) => i.message).join(" ")));
    }

    const { error } = await supabase
      .from("academic_cycles")
      .update({
        name: parsed.data.name,
        starts_at: parsed.data.starts_at || null,
        ends_at: parsed.data.ends_at || null
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

  const { data, error } = await supabase.rpc("activate_academic_cycle_and_advance_cohorts", {
    p_cycle_id: parsed.data.cycle_id
  });
  if (error) throw new Error(getSafeErrorMessage(error));

  const result = activationResultSchema.safeParse(data);
  if (!result.success) {
    throw new Error("La base de datos devolvió un resultado inesperado al activar el ciclo.");
  }

  return result.data;
}

export async function activateCycleAction(formData: FormData) {
  await activateCycle(formData);
  revalidateCycleAutomationPaths();
}

export async function activateCycleStateAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const result = await activateCycle(formData);
    revalidateCycleAutomationPaths();

    const pendingMessage = result.pending_initial_count > 0
      ? ` ${result.pending_initial_count} cohorte(s) siguen pendientes de su primer grupo manual.`
      : "";

    return actionSuccess(
      `Ciclo activado. Se crearon ${result.generated_count} grupo(s) automáticamente y se completaron ${result.completed_count} cohorte(s).${pendingMessage}`
    );
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
    .update({ status: "finalized", active: false })
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
    revalidatePath("/ciclos");
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
    .update({ status: "archived", active: false })
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
    revalidatePath("/ciclos");
    return actionSuccess("Ciclo archivado correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo archivar el ciclo escolar.");
  }
}
