import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export type AuthenticatedProfile = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: {
    id: string;
    role_code: string;
    active: boolean;
  };
};

export async function requireAuthenticatedProfile(): Promise<AuthenticatedProfile> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay una sesión activa.");

  const { data: profile } = await supabase
    .from("users_profile")
    .select("id, role_code, active")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("No hay una sesión activa.");
  }

  if (!profile.active) {
    throw new Error("Usuario inactivo.");
  }

  return { supabase, profile };
}

export async function requireAdmin() {
  const { supabase, profile } = await requireAuthenticatedProfile();

  if (profile.role_code !== "admin") {
    throw new Error("Solo el administrador puede realizar esta acción.");
  }

  return supabase;
}
