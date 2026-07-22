import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { createClient as createServerClient } from "@/lib/supabase/server";

export function createServiceClient(options?: { auditUserId?: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: options?.auditUserId
      ? {
          headers: {
            "x-audit-user-id": options.auditUserId
          }
        }
      : undefined
  });
}

export async function requireActiveAdminServiceClient() {
  const supabase = await createServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No hay una sesión activa.");
  }

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

  if (profile.role_code !== "admin") {
    throw new Error("Solo el administrador puede realizar esta acción.");
  }

  return createServiceClient({ auditUserId: profile.id });
}
