import { SectionHeader } from "@/components/section-header";
import { GroupForm } from "@/components/groups/group-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";

export const dynamic = "force-dynamic";

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
      getCurrentProfile(),
      supabase.from("academic_cycles").select("id, code, name").eq("active", true).order("code"),
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

  const canCreateExtraSubjects = isAdmin(profile?.role_code) || profile?.role_code === "coordinator";

  return (
    <>
      <SectionHeader eyebrow="Creación" title="Nuevo grupo" />
      <GroupForm
        careers={careers as any[]}
        classrooms={classrooms as any[]}
        canCreateExternalSubjects={canCreateExtraSubjects}
        cycles={cycles as any[]}
        profiles={(profiles ?? []).filter((teacherProfile: any) => isValidProfileCode(teacherProfile.code)) as any[]}
        subjects={subjects as any[]}
      />
    </>
  );
}
