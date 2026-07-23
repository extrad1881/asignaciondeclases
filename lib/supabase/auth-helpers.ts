import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/auth-session";

export type AuthenticatedProfile = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: {
    id: string;
    display_name: string;
    email: string;
    role_code: string;
    active: boolean;
  };
};

const getAuthenticatedProfile = cache(async (): Promise<AuthenticatedProfile | null> => {
  const supabase = await createClient();
  const { userId } = await getVerifiedSession(supabase);
  if (!userId) return null;

  const { data: profile, error } = await supabase
    .from("users_profile")
    .select("id, display_name, email, role_code, active")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) return null;

  return { supabase, profile };
});

export async function requireAuthenticatedProfile(): Promise<AuthenticatedProfile> {
  const authenticated = await getAuthenticatedProfile();

  if (!authenticated) {
    throw new Error("No hay una sesión activa.");
  }

  if (!authenticated.profile.active) {
    throw new Error("Usuario inactivo.");
  }

  return authenticated;
}

export async function requireAdmin() {
  const { supabase, profile } = await requireAuthenticatedProfile();

  if (profile.role_code !== "admin") {
    throw new Error("Solo el administrador puede realizar esta acción.");
  }

  return supabase;
}

export async function requireActiveProfileOrRedirect() {
  const authenticated = await getAuthenticatedProfile();

  if (!authenticated?.profile.active) {
    redirect("/login");
  }

  return authenticated.profile;
}
