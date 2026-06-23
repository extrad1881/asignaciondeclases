"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedProfile } from "@/lib/supabase/auth-helpers";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/actions/action-state";

const assignmentSchema = z.object({
  group_subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  schedule_block_id: z.string().uuid(),
  duration_hours: z.coerce.number().positive("Las horas asignadas deben ser mayores a cero.").max(99),
  classroom_id: z.string().uuid().optional().or(z.literal(""))
});

async function requireAssignmentPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: { id: string; role_code: string; active: boolean },
  groupSubjectId: string,
  teacherId: string
) {
  if (profile.role_code === "admin") return;

  const { data: allowed, error } = await supabase.rpc("can_manage_assignment", {
    target_group_subject_id: groupSubjectId,
    target_teacher_id: teacherId
  });

  if (error || !allowed) {
    throw new Error("No tienes permiso para gestionar esta asignación.");
  }
}

export async function createAssignmentAction(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
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

  await requireAssignmentPermission(supabase, profile, parsed.data.group_subject_id, parsed.data.teacher_id);

  const { error } = await supabase.from("assignments").insert({
    ...parsed.data,
    classroom_id: parsed.data.classroom_id || null,
    status: "active"
  });

  if (error) throw new Error(error.message);

  revalidatePath("/grupos");
  revalidatePath("/horarios");
  revalidatePath("/coordinador");
}

export async function createAssignmentActionState(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createAssignmentAction(formData);
    return actionSuccess("Asignación creada correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo crear la asignación.");
  }
}

const assignmentUpdateSchema = z.object({
  assignment_id: z.string().uuid(),
  group_id: z.string().uuid().optional().or(z.literal("")),
  schedule_block_id: z.string().uuid(),
  duration_hours: z.coerce.number().positive("Las horas asignadas deben ser mayores a cero.").max(99),
  classroom_id: z.string().uuid().optional().or(z.literal(""))
});

export async function updateAssignmentAction(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
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
    .select("id, group_subject_id, teacher_id")
    .eq("id", parsed.data.assignment_id)
    .maybeSingle();

  if (!currentAssignment) {
    throw new Error("No tienes permiso para modificar esta asignación.");
  }

  await requireAssignmentPermission(
    supabase,
    profile,
    currentAssignment.group_subject_id,
    currentAssignment.teacher_id
  );

  const { error } = await supabase
    .from("assignments")
    .update({
      schedule_block_id: parsed.data.schedule_block_id,
      duration_hours: parsed.data.duration_hours,
      classroom_id: parsed.data.classroom_id || null
    })
    .eq("id", parsed.data.assignment_id);

  if (error) throw new Error(error.message);

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
  const { supabase, profile } = await requireAuthenticatedProfile();
  const parsed = assignmentDeleteSchema.safeParse({
    assignment_id: formData.get("assignment_id"),
    group_id: formData.get("group_id")
  });

  if (!parsed.success) {
    throw new Error("Selecciona una asignación válida.");
  }

  const { data: currentAssignment } = await supabase
    .from("assignments")
    .select("id, group_subject_id, teacher_id")
    .eq("id", parsed.data.assignment_id)
    .maybeSingle();

  if (!currentAssignment) {
    throw new Error("No tienes permiso para eliminar esta asignación.");
  }

  await requireAssignmentPermission(
    supabase,
    profile,
    currentAssignment.group_subject_id,
    currentAssignment.teacher_id
  );

  const { error } = await supabase.from("assignments").update({ status: "inactive" }).eq("id", parsed.data.assignment_id);
  if (error) throw new Error(error.message);

  revalidatePath("/grupos");
  if (parsed.data.group_id) revalidatePath(`/grupos/${parsed.data.group_id}`);
  revalidatePath("/horarios");
  revalidatePath("/coordinador");
}

export async function deleteAssignmentActionState(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await deleteAssignmentAction(formData);
    return actionSuccess("Asignación eliminada correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo eliminar la asignación.");
  }
}

export async function updateAssignmentActionState(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateAssignmentAction(formData);
    return actionSuccess("Asignación actualizada correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo actualizar la asignación.");
  }
}
