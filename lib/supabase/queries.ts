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
  const { data } = await supabase.rpc("check_group_subject_hours", {
    target_group_id: groupId
  });
  return (data ?? []) as SubjectHoursStatus[];
}

export async function getDashboardCounts() {
  const supabase = await createClient();

  const [
    { count: careersCt },
    { count: teachersCt },
    { count: subjectsCt },
    { count: groupsCt },
    { count: assignmentsCt }
  ] = await Promise.all([
    supabase.from("careers").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("teachers").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("subjects").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("groups").select("*", { count: "exact", head: true }),
    supabase.from("assignments").select("*", { count: "exact", head: true }).eq("status", "active")
  ]);

  return {
    careers: careersCt ?? 0,
    teachers: teachersCt ?? 0,
    subjects: subjectsCt ?? 0,
    groups: groupsCt ?? 0,
    assignments: assignmentsCt ?? 0
  };
}
