import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { requireAuthenticatedProfile } from "@/lib/supabase/auth-helpers";

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
  const { profile } = await requireAuthenticatedProfile();

  if (profile.role_code !== "admin") {
    throw new Error("Solo el administrador puede realizar esta acción.");
  }

  return createServiceClient({ auditUserId: profile.id });
}
