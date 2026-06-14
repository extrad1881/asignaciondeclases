"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveAdminServiceClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/auth-helpers";
import { cleanString, getStringList, normalizeKey } from "@/app/(dashboard)/actions/utils";

const updateCoordinatorUserSchema = z.object({
  coordinator_id: z.string().uuid(),
  user_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().optional().or(z.literal("")),
  active: z.enum(["true", "false"])
});

export async function updateCoordinatorUserAction(formData: FormData) {
  const service = await requireActiveAdminServiceClient();
  const parsed = updateCoordinatorUserSchema.safeParse({
    coordinator_id: formData.get("coordinator_id"),
    user_id: formData.get("user_id"),
    email: cleanString(formData.get("email")),
    password: cleanString(formData.get("password")),
    active: formData.get("active")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { data: coordinator, error: coordinatorLookupError } = await service
    .from("coordinators")
    .select("id, profile_id")
    .eq("id", parsed.data.coordinator_id)
    .eq("profile_id", parsed.data.user_id)
    .maybeSingle();

  if (coordinatorLookupError) throw new Error(coordinatorLookupError.message);
  if (!coordinator) throw new Error("El usuario no esta vinculado a este coordinador.");

  const authUpdate: { email: string; password?: string } = {
    email: parsed.data.email
  };

  if (parsed.data.password) {
    if (parsed.data.password.length < 6) {
      throw new Error("La contrasena debe tener al menos 6 caracteres.");
    }
    authUpdate.password = parsed.data.password;
  }

  const { error: authError } = await service.auth.admin.updateUserById(parsed.data.user_id, authUpdate);
  if (authError) throw new Error(authError.message);

  const active = parsed.data.active === "true";
  const { error: profileError } = await service
    .from("users_profile")
    .update({
      email: parsed.data.email,
      role_code: "coordinator",
      active
    })
    .eq("id", parsed.data.user_id);
  if (profileError) throw new Error(profileError.message);

  const { error: coordinatorError } = await service
    .from("coordinators")
    .update({ active })
    .eq("id", parsed.data.coordinator_id);
  if (coordinatorError) throw new Error(coordinatorError.message);

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/coordinador");
}

const updateCoordinatorRecordSchema = z.object({
  coordinator_id: z.string().uuid(),
  name: z.string().min(2, "Escribe el nombre del coordinador.").max(160),
  active: z.enum(["true", "false"])
});

export async function updateCoordinatorRecordAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = updateCoordinatorRecordSchema.safeParse({
    coordinator_id: formData.get("coordinator_id"),
    name: cleanString(formData.get("name")),
    active: formData.get("active")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { error } = await supabase
    .from("coordinators")
    .update({
      name: normalizeKey(parsed.data.name),
      active: parsed.data.active === "true"
    })
    .eq("id", parsed.data.coordinator_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/coordinador");
  revalidatePath("/docentes");
}

const deleteCoordinatorRecordSchema = z.object({
  coordinator_id: z.string().uuid()
});

export async function deleteCoordinatorRecordAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = deleteCoordinatorRecordSchema.safeParse({
    coordinator_id: formData.get("coordinator_id")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { data: coordinator, error: lookupError } = await supabase
    .from("coordinators")
    .select("id, profile_id")
    .eq("id", parsed.data.coordinator_id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!coordinator) throw new Error("No se encontro el coordinador.");
  if (coordinator.profile_id) {
    throw new Error("No se puede eliminar un coordinador con usuario vinculado. Primero desactiva o cambia ese usuario.");
  }

  const { error } = await supabase.from("coordinators").delete().eq("id", parsed.data.coordinator_id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/coordinador");
  revalidatePath("/docentes");
}

const updateCoordinatorCareersSchema = z.object({
  coordinator_id: z.string().uuid(),
  career_ids: z.array(z.string().uuid())
});

export async function updateCoordinatorCareersAction(formData: FormData) {
  const supabase = await requireAdmin();
  const uniqueCareerIds = Array.from(new Set(getStringList(formData, "career_ids")));
  const parsed = updateCoordinatorCareersSchema.safeParse({
    coordinator_id: formData.get("coordinator_id"),
    career_ids: uniqueCareerIds
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { data: coordinator, error: coordinatorError } = await supabase
    .from("coordinators")
    .select("id")
    .eq("id", parsed.data.coordinator_id)
    .maybeSingle();
  if (coordinatorError) throw new Error(coordinatorError.message);
  if (!coordinator) throw new Error("No se encontro el coordinador.");

  if (parsed.data.career_ids.length > 0) {
    const { data: careers, error: careersError } = await supabase
      .from("careers")
      .select("id")
      .in("id", parsed.data.career_ids);
    if (careersError) throw new Error(careersError.message);

    const validCareerIds = new Set((careers ?? []).map((c: { id: string }) => c.id));
    if (validCareerIds.size !== parsed.data.career_ids.length) {
      throw new Error("Una o mas carreras seleccionadas no existen.");
    }
  }

  const { error: deleteError } = await supabase
    .from("coordinator_careers")
    .delete()
    .eq("coordinator_id", parsed.data.coordinator_id);
  if (deleteError) throw new Error(deleteError.message);

  if (parsed.data.career_ids.length > 0) {
    const { error: insertError } = await supabase.from("coordinator_careers").insert(
      parsed.data.career_ids.map((careerId) => ({
        coordinator_id: parsed.data.coordinator_id,
        career_id: careerId
      }))
    );
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/coordinador");
  revalidatePath("/carreras");
  revalidatePath("/grupos");
  revalidatePath("/grupos/nuevo");
  revalidatePath("/materias");
}

const coordinatorCareerSchema = z.object({
  coordinator_id: z.string().uuid(),
  career_id: z.string().uuid()
});

export async function assignCoordinatorCareerAction(formData: FormData) {
  const supabase = await requireAdmin();
  const parsed = coordinatorCareerSchema.safeParse({
    coordinator_id: formData.get("coordinator_id"),
    career_id: formData.get("career_id")
  });
  if (!parsed.success) throw new Error("Selecciona coordinador y carrera.");

  const { error } = await supabase.from("coordinator_careers").upsert(parsed.data, {
    onConflict: "coordinator_id,career_id"
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/coordinadores");
}
