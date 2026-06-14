import { createClient } from "@/lib/supabase/server";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users_profile")
    .select("id, display_name, email, role_code, active")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("No hay una sesión activa.");
  }
  if (!profile.active) {
    throw new Error("Usuario inactivo.");
  }
  return profile;
}

export type SubjectHoursStatus = {
  group_subject_id: string;
  subject_name: string;
  hours_per_week: number;
  assigned_hours: number;
  status: "sin_asignar" | "incompleta" | "excedida" | "completa";
};

export async function checkGroupSubjectHours(groupId: string): Promise<SubjectHoursStatus[]> {
  const supabase = await createClient();
  const { data } = await (supabase.rpc as any)("check_group_subject_hours", {
    target_group_id: groupId
  });
  return (data ?? []) as SubjectHoursStatus[];
}

export async function getDashboardCounts() {
  const supabase = await createClient();
  const tables = ["careers", "teachers", "subjects", "groups", "assignments"] as const;

  const entries = await Promise.all(
    tables.map(async (table) => {
      const { count } = await supabase.from(table).select("*", {
        count: "exact",
        head: true
      });
      return [table, count ?? 0] as const;
    })
  );

  return Object.fromEntries(entries) as Record<(typeof tables)[number], number>;
}
