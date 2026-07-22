"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveAdminServiceClient } from "@/lib/supabase/admin";
import { actionFailure, actionSuccess, type ActionState } from "@/lib/actions/action-state";
import { cleanString } from "@/app/(dashboard)/actions/utils";

const managedUserFields = {
  email: z.string().email(),
  display_name: z.string().min(2),
  role_code: z.enum(["admin", "coordinator"])
};

const createUserSchema = z.object({
  ...managedUserFields,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.")
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
      display_name: parsed.data.display_name
    }
  });

  if (error || !data.user) throw new Error(error?.message ?? "No se pudo crear el usuario.");

  const { error: configureError } = await service.rpc("configure_managed_user", {
    p_user_id: data.user.id,
    p_email: parsed.data.email,
    p_display_name: parsed.data.display_name,
    p_role_code: parsed.data.role_code,
    p_active: true
  });

  if (configureError) {
    const { error: cleanupError } = await service.auth.admin.deleteUser(data.user.id);
    if (cleanupError) {
      throw new Error(
        `${configureError.message} Además, no se pudo revertir el usuario de autenticación: ${cleanupError.message}`
      );
    }
    throw new Error(configureError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/coordinadores");
}

const updateUserSchema = z.object({
  ...managedUserFields,
  user_id: z.string().uuid(),
  password: z.string().optional().or(z.literal("")),
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

  const { data: previousProfile, error: profileLookupError } = await service
    .from("users_profile")
    .select("id, email, display_name, role_code, active")
    .eq("id", parsed.data.user_id)
    .maybeSingle();
  if (profileLookupError) throw new Error(profileLookupError.message);
  if (!previousProfile) throw new Error("No se encontró el perfil del usuario.");

  const authUpdate: {
    email: string;
    password?: string;
    user_metadata: { display_name: string };
  } = {
    email: parsed.data.email,
    user_metadata: {
      display_name: parsed.data.display_name
    }
  };

  if (parsed.data.password) {
    if (parsed.data.password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }
    authUpdate.password = parsed.data.password;
  }

  const active = parsed.data.active === "true";
  const { error: configureError } = await service.rpc("configure_managed_user", {
    p_user_id: parsed.data.user_id,
    p_email: parsed.data.email,
    p_display_name: parsed.data.display_name,
    p_role_code: parsed.data.role_code,
    p_active: active
  });
  if (configureError) throw new Error(configureError.message);

  const { error: authError } = await service.auth.admin.updateUserById(parsed.data.user_id, authUpdate);
  if (authError) {
    const { error: rollbackError } = await service.rpc("configure_managed_user", {
      p_user_id: previousProfile.id,
      p_email: previousProfile.email,
      p_display_name: previousProfile.display_name,
      p_role_code: previousProfile.role_code,
      p_active: previousProfile.active
    });
    if (rollbackError) {
      throw new Error(`${authError.message} Además, no se pudo revertir el perfil: ${rollbackError.message}`);
    }
    throw new Error(authError.message);
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
