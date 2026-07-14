export const dynamic = "force-dynamic";
import { SectionHeader } from "@/components/section-header";
import { GroupForm } from "@/components/groups/group-form";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";


export default async function NewGroupPage() {
  const supabase = await createClient();
  const [
    profile,
    { data: cycles = [] },
    { data: careers = [] },
    { data: classrooms = [] },
    { data: subjects = [] },
    { data: profiles = [] }
  ] =
    await Promise.all([
      requireActiveProfileOrRedirect(),
      supabase.from("academic_cycles").select("id, code, name").eq("status", "active").order("code"),
      supabase.from("careers").select("id, code, name").eq("active", true).order("code"),
      supabase.from("classrooms").select("id, name").eq("active", true).order("name"),
      supabase
        .from("subjects")
        .select("id, name, career_id, quarter, default_hours")
        .eq("active", true)
        .order("quarter")
        .order("name"),
      supabase.from("teacher_profiles").select("code, name").order("code")
    ]);

  let cohortsQuery = (supabase as any)
    .from("cohort_groups")
    .select("id, name, career_id, current_quarter")
    .eq("status", "active");

  if (!isAdmin(profile?.role_code)) {
    const { data: coordinator } = await (supabase as any)
      .from("coordinators")
      .select("id")
      .eq("profile_id", profile?.id)
      .maybeSingle();
    if (coordinator) {
      const { data: coordinatorCareers = [] } = await (supabase as any)
        .from("coordinator_careers")
        .select("career_id")
        .eq("coordinator_id", coordinator.id);
      const careerIds = coordinatorCareers.map((cc: any) => cc.career_id);
      if (careerIds.length > 0) {
        cohortsQuery = cohortsQuery.in("career_id", careerIds);
      }
    }
  }

  const { data: cohorts = [] } = await cohortsQuery.order("name");

  const canCreateExtraSubjects = isAdmin(profile?.role_code) || profile?.role_code === "coordinator";

  return (
    <>
      <SectionHeader
        eyebrow="Creación"
        title="Nuevo grupo"
        description="Selecciona ciclo, carrera, cuatrimestre y materias. Las materias externas quedan registradas cuando el rol tiene permisos."
      />
      <GroupForm
        careers={careers as any[]}
        classrooms={classrooms as any[]}
        canCreateExternalSubjects={canCreateExtraSubjects}
        cohorts={cohorts as any[]}
        cycles={cycles as any[]}
        profiles={(profiles ?? []).filter((teacherProfile: any) => isValidProfileCode(teacherProfile.code)) as any[]}
        subjects={subjects as any[]}
      />
    </>
  );
}
