"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/actions/action-state";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { cleanString } from "@/app/(dashboard)/actions/utils";

const capacitySchema = z.preprocess(
  (value) => value === "" || value == null ? null : value,
  z.coerce.number().int("La capacidad debe ser un número entero.").min(0).max(5000).nullable()
);

const classroomSchema = z.object({
  name: z.string().min(2, "Escribe el nombre del aula.").max(100),
  kind: z.string().max(60, "El tipo de aula es demasiado largo."),
  capacity: capacitySchema
});

const classroomUpdateSchema = classroomSchema.extend({
  classroom_id: z.string().uuid("Selecciona un aula válida.")
});

const classroomStateSchema = z.object({
  classroom_id: z.string().uuid("Selecciona un aula válida."),
  active: z.enum(["true", "false"])
});

function revalidateClassroomPaths() {
  revalidatePath("/aulas");
  revalidatePath("/grupos");
  revalidatePath("/grupos/nuevo");
  revalidatePath("/coordinador");
}

function readClassroomInput(formData: FormData) {
  return {
    name: cleanString(formData.get("name")),
    kind: cleanString(formData.get("kind")),
    capacity: formData.get("capacity")
  };
}

export async function createClassroomStateAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const supabase = await requireAdmin();
    const parsed = classroomSchema.safeParse(readClassroomInput(formData));
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((issue) => issue.message).join(" ")));
    }

    const { error } = await supabase.from("classrooms").insert({
      name: parsed.data.name,
      kind: parsed.data.kind || null,
      capacity: parsed.data.capacity,
      active: true
    });
    if (error?.code === "23505") {
      return actionFailure(new Error("Ya existe un aula con ese nombre."));
    }
    if (error) return actionFailure(error);

    revalidateClassroomPaths();
    return actionSuccess("Aula agregada correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo agregar el aula.");
  }
}

export async function updateClassroomFeedbackAction(formData: FormData): Promise<ActionState> {
  try {
    const supabase = await requireAdmin();
    const parsed = classroomUpdateSchema.safeParse({
      classroom_id: formData.get("classroom_id"),
      ...readClassroomInput(formData)
    });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((issue) => issue.message).join(" ")));
    }

    const { data, error } = await supabase
      .from("classrooms")
      .update({
        name: parsed.data.name,
        kind: parsed.data.kind || null,
        capacity: parsed.data.capacity
      })
      .eq("id", parsed.data.classroom_id)
      .select("id")
      .maybeSingle();
    if (error?.code === "23505") {
      return actionFailure(new Error("Ya existe un aula con ese nombre."));
    }
    if (error) return actionFailure(error);
    if (!data) return actionFailure(new Error("El aula ya no existe."));

    revalidateClassroomPaths();
    return actionSuccess("Aula actualizada correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo actualizar el aula.");
  }
}

export async function setClassroomActiveFeedbackAction(formData: FormData): Promise<ActionState> {
  try {
    const supabase = await requireAdmin();
    const parsed = classroomStateSchema.safeParse({
      classroom_id: formData.get("classroom_id"),
      active: formData.get("active")
    });
    if (!parsed.success) {
      return actionFailure(new Error(parsed.error.issues.map((issue) => issue.message).join(" ")));
    }

    const active = parsed.data.active === "true";
    const { data, error } = await supabase
      .from("classrooms")
      .update({ active })
      .eq("id", parsed.data.classroom_id)
      .select("id")
      .maybeSingle();
    if (error) return actionFailure(error);
    if (!data) return actionFailure(new Error("El aula ya no existe."));

    revalidateClassroomPaths();
    return actionSuccess(active ? "Aula reactivada correctamente." : "Aula desactivada correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo cambiar el estado del aula.");
  }
}
