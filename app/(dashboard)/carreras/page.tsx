export const dynamic = "force-dynamic";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableAdvanced, type DataTableAdvancedRow } from "@/components/ui/data-table-advanced";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";


export default async function CareersPage() {
  const supabase = await createClient();
  const [profile, { data: careers = [] }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("careers")
      .select("id, code, name, active, coordinator_careers(coordinators(name)), subjects(id, active)")
      .order("code")
  ]);
  const careerRows = careers ?? [];
  const canManageSubjects = isAdmin(profile?.role_code);

  const rows: DataTableAdvancedRow[] = careerRows.map((career: any) => {
    const coordinatorNames = (career.coordinator_careers ?? [])
      .map((item: any) => item.coordinators?.name)
      .filter(Boolean);
    const activeSubjects = (career.subjects ?? []).filter((subject: any) => subject.active).length;
    const statusLabel = career.active ? "Activa" : "Inactiva";

    return {
      id: career.id,
      searchText: [career.code, career.name, coordinatorNames.join(" "), statusLabel].join(" "),
      filters: {
        estado: statusLabel,
        coordinador: coordinatorNames[0] ?? "Sin asignar"
      },
      cells: [
        <span className="font-semibold text-ink" key="code">{career.code}</span>,
        career.name,
        <div className="flex flex-wrap gap-1" key="coordinators">
          {coordinatorNames.length === 0 ? (
            <span className="text-muted">Sin asignar</span>
          ) : (
            coordinatorNames.map((name: string, index: number) => <Badge key={`${career.id}-${index}`}>{name}</Badge>)
          )}
        </div>,
        activeSubjects,
        <Badge key="state" tone={career.active ? "success" : "warning"}>
          {statusLabel}
        </Badge>,
        ...(canManageSubjects
          ? [
              <Link href={`/carreras/${career.id}/materias`} key="subjects">
                <Button type="button" variant="secondary">
                  <BookOpen className="h-4 w-4" />
                  Ver y modificar
                </Button>
              </Link>
            ]
          : [])
      ]
    };
  });

  return (
    <>
      <SectionHeader
        eyebrow="Catálogo"
        title="Carreras"
        description="Consulta carreras, coordinadores responsables y cantidad de materias activas asociadas."
      />
      <DataTableAdvanced
        emptyDescription="Registra carreras para organizar materias, coordinadores y grupos académicos."
        emptyLabel="No hay carreras registradas."
        filters={[
          { key: "estado", label: "Estado" },
          { key: "coordinador", label: "Coordinador" }
        ]}
        headers={
          canManageSubjects
            ? ["Clave", "Carrera", "Coordinadores", "Materias", "Estado", "Asignaturas"]
            : ["Clave", "Carrera", "Coordinadores", "Materias", "Estado"]
        }
        rows={rows}
      />
    </>
  );
}
