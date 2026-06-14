"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveAdminServiceClient } from "@/lib/supabase/admin";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/actions/action-state";
import { cleanString, normalizeKey } from "@/app/(dashboard)/actions/utils";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(2),
  role_code: z.enum(["admin", "coordinator"])
});

export async function createUserAction(formData: FormData) {
  const service = await requireActiveAdminServiceClient();
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    display_name: formData.get("display_name"),
    role_code: formData.get("role_code")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const { data, error } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      display_name: parsed.data.display_name,
      role_code: parsed.data.role_code
    }
  });

  if (error || !data.user) throw new Error(error?.message ?? "No se pudo crear el usuario.");

  await service.from("users_profile").upsert({
    id: data.user.id,
    email: parsed.data.email,
    display_name: parsed.data.display_name,
    role_code: parsed.data.role_code,
    active: true
  });

  if (parsed.data.role_code === "coordinator") {
    await service.from("coordinators").upsert(
      {
        profile_id: data.user.id,
        name: parsed.data.display_name.toUpperCase(),
        active: true
      },
      { onConflict: "profile_id" }
    );
  }

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
}

const updateUserSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().optional().or(z.literal("")),
  display_name: z.string().min(2),
  role_code: z.enum(["admin", "coordinator"]),
  active: z.enum(["true", "false"])
});

export async function updateUserAction(formData: FormData) {
  const service = await requireActiveAdminServiceClient();
  const parsed = updateUserSchema.safeParse({
    user_id: formData.get("user_id"),
    email: cleanString(formData.get("email")),
    password: cleanString(formData.get("password")),
    display_name: cleanString(formData.get("display_name")),
    role_code: formData.get("role_code"),
    active: formData.get("active")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const authUpdate: {
    email: string;
    password?: string;
    user_metadata: {
      display_name: string;
      role_code: "admin" | "coordinator";
    };
  } = {
    email: parsed.data.email,
    user_metadata: {
      display_name: parsed.data.display_name,
      role_code: parsed.data.role_code
    }
  };

  if (parsed.data.password) {
    if (parsed.data.password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }
    authUpdate.password = parsed.data.password;
  }

  const { error: authError } = await service.auth.admin.updateUserById(parsed.data.user_id, authUpdate);
  if (authError) throw new Error(authError.message);

  const active = parsed.data.active === "true";
  const { error: profileError } = await service.from("users_profile").upsert({
    id: parsed.data.user_id,
    email: parsed.data.email,
    display_name: parsed.data.display_name,
    role_code: parsed.data.role_code,
    active
  });
  if (profileError) throw new Error(profileError.message);

  if (parsed.data.role_code === "coordinator") {
    const { error: coordinatorError } = await service.from("coordinators").upsert(
      {
        profile_id: parsed.data.user_id,
        name: normalizeKey(parsed.data.display_name),
        active
      },
      { onConflict: "profile_id" }
    );
    if (coordinatorError) throw new Error(coordinatorError.message);
  } else {
    const { error: coordinatorError } = await service
      .from("coordinators")
      .update({ active: false })
      .eq("profile_id", parsed.data.user_id);
    if (coordinatorError) throw new Error(coordinatorError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
  revalidatePath("/docentes");
}

export async function createUserActionState(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createUserAction(formData);
    return actionSuccess("Usuario creado correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo crear el usuario.");
  }
}

export async function updateUserActionState(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateUserAction(formData);
    return actionSuccess("Usuario actualizado correctamente.");
  } catch (error) {
    return actionFailure(error, "No se pudo actualizar el usuario.");
  }
}
