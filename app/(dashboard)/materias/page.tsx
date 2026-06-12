import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";
import { formatHours } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const supabase = await createClient();
  const [profile, { data: subjects = [] }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("subjects")
      .select("id, name, quarter, default_hours, active, careers(id, code, name), class_requirements(profile_code)")
      .order("name")
      .limit(300)
  ]);
  const subjectRows = subjects ?? [];
  const canManageSubjects = isAdmin(profile?.role_code);

  return (
    <>
      <SectionHeader eyebrow="Catálogo" title="Materias" />
      <DataTable
        headers={
          canManageSubjects
            ? ["Materia", "Carrera", "Cuatrimestre", "Carga", "Perfil requerido", "Estado", "Acciones"]
            : ["Materia", "Carrera", "Cuatrimestre", "Carga", "Perfil requerido", "Estado"]
        }
        rows={subjectRows.map((subject: any) => [
          <span className="font-medium text-ink" key="name">{subject.name}</span>,
          subject.careers?.code ?? subject.careers?.name ?? "Sin carrera",
          subject.quarter,
          formatHours(subject.default_hours),
          <div className="flex flex-wrap gap-1" key="profiles">
            {((subject.class_requirements ?? []).filter((profile: any) => isValidProfileCode(profile.profile_code))).length === 0 ? (
              <span className="text-slate-400">Sin perfil</span>
            ) : (
              (subject.class_requirements ?? []).filter((profile: any) => isValidProfileCode(profile.profile_code)).map((profile: any) => (
                <Badge tone="info" key={profile.profile_code}>{profile.profile_code}</Badge>
              ))
            )}
          </div>,
          <Badge key="state" tone={subject.active ? "success" : "warning"}>
            {subject.active ? "Activa" : "Inactiva"}
          </Badge>,
          ...(canManageSubjects
            ? [
                subject.careers?.id ? (
                  <Link href={`/carreras/${subject.careers.id}/materias`} key="manage">
                    <Button type="button" variant="secondary">
                      Modificar carrera
                    </Button>
                  </Link>
                ) : (
                  <span className="text-slate-400" key="manage">Sin carrera</span>
                )
              ]
            : [])
        ])}
      />
    </>
  );
}
