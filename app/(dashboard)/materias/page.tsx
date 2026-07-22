import { SectionHeader } from "@/components/section-header";
import { SubjectListCard } from "@/components/materias/subject-list-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableAdvanced, type DataTableAdvancedRow } from "@/components/ui/data-table-advanced";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import Link from "next/link";
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

  const subjectItems = subjectRows.map((subject) => ({
    id: subject.id,
    name: subject.name as string,
    career_code: (subject.careers?.code ?? subject.careers?.name ?? "Sin carrera") as string,
    career_id: (subject.careers?.id ?? null) as string | null,
    quarter: Number(subject.quarter),
    default_hours: Number(subject.default_hours ?? 0),
    active: Boolean(subject.active),
    profiles: (subject.class_requirements ?? [])
      .map((req) => req.profile_code)
      .filter(isValidProfileCode)
  }));

  const rows: DataTableAdvancedRow[] = subjectItems.map((subject) => ({
    id: subject.id,
    searchText: [
      subject.name,
      subject.career_code,
      subject.quarter,
      subject.active ? "Activa" : "Inactiva",
      subject.profiles.join(" ")
    ].join(" "),
    filters: {
      carrera: subject.career_code,
      cuatrimestre: String(subject.quarter),
      estado: subject.active ? "Activa" : "Inactiva"
    },
    cells: [
      <span className="font-semibold text-ink" key="name">{subject.name}</span>,
      subject.career_code,
      subject.quarter,
      formatHours(subject.default_hours),
      <div className="flex flex-wrap gap-1" key="profiles">
        {subject.profiles.length === 0 ? (
          <span className="text-muted">Sin perfil</span>
        ) : (
          subject.profiles.map((code: string) => (
            <Badge key={code} tone="info">
              {code}
            </Badge>
          ))
        )}
      </div>,
      <Badge key="state" tone={subject.active ? "success" : "warning"}>
        {subject.active ? "Activa" : "Inactiva"}
      </Badge>,
      ...(canManageSubjects
        ? [
            subject.career_id ? (
              <Link href={`/carreras/${subject.career_id}/materias`} key="manage">
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
  }));

  return (
    <>
      <SectionHeader
        eyebrow="Catálogo"
        title="Materias"
        description="Consulta materias, carga horaria y perfiles requeridos. Usa filtros para localizar registros incompletos o por carrera."
      />
      <ResponsiveTable
        cards={
          <ul className="grid gap-3 sm:grid-cols-2">
            {subjectItems.map((subject) => (
              <li key={subject.id}>
                <SubjectListCard canManage={canManageSubjects} subject={subject} />
              </li>
            ))}
          </ul>
        }
        table={
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
        }
      />
    </>
  );
}
