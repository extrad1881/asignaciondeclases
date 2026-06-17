import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableAdvanced, type DataTableAdvancedRow } from "@/components/ui/data-table-advanced";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";
import { formatHours } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const supabase = await createClient();
  const [profile, { data: subjects = [] }] = await Promise.all([
    requireActiveProfileOrRedirect(),
    supabase
      .from("subjects")
      .select("id, name, quarter, default_hours, active, careers(id, code, name), class_requirements(profile_code)")
      .order("name")
      .limit(300)
  ]);
  const subjectRows = subjects ?? [];
  const canManageSubjects = isAdmin(profile?.role_code);

  const rows: DataTableAdvancedRow[] = subjectRows.map((subject: any) => {
    const profiles = (subject.class_requirements ?? []).filter((profile: any) => isValidProfileCode(profile.profile_code));
    const careerLabel = subject.careers?.code ?? subject.careers?.name ?? "Sin carrera";
    const statusLabel = subject.active ? "Activa" : "Inactiva";

    return {
      id: subject.id,
      searchText: [subject.name, careerLabel, subject.quarter, statusLabel, profiles.map((profile: any) => profile.profile_code).join(" ")].join(" "),
      filters: {
        carrera: careerLabel,
        cuatrimestre: String(subject.quarter),
        estado: statusLabel
      },
      cells: [
        <span className="font-semibold text-ink" key="name">{subject.name}</span>,
        careerLabel,
        subject.quarter,
        formatHours(subject.default_hours),
        <div className="flex flex-wrap gap-1" key="profiles">
          {profiles.length === 0 ? (
            <span className="text-muted">Sin perfil</span>
          ) : (
            profiles.map((profile: any) => <Badge tone="info" key={profile.profile_code}>{profile.profile_code}</Badge>)
          )}
        </div>,
        <Badge key="state" tone={subject.active ? "success" : "warning"}>
          {statusLabel}
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
                <span className="text-muted" key="manage">Sin carrera</span>
              )
            ]
          : [])
      ]
    };
  });

  return (
    <>
      <SectionHeader
        eyebrow="Catálogo"
        title="Materias"
        description="Consulta materias, carga horaria y perfiles requeridos. Usa filtros para localizar registros incompletos o por carrera."
      />
      <DataTableAdvanced
        emptyDescription="Agrega materias desde la vista de carrera para poder crear grupos y asignaciones."
        emptyLabel="No hay materias registradas."
        filters={[
          { key: "carrera", label: "Carrera" },
          { key: "cuatrimestre", label: "Cuatrimestre" },
          { key: "estado", label: "Estado" }
        ]}
        headers={
          canManageSubjects
            ? ["Materia", "Carrera", "Cuatrimestre", "Carga", "Perfil requerido", "Estado", "Acciones"]
            : ["Materia", "Carrera", "Cuatrimestre", "Carga", "Perfil requerido", "Estado"]
        }
        rows={rows}
      />
    </>
  );
}
