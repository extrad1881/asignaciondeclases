import { SectionHeader } from "@/components/section-header";
import { CareerListCard } from "@/components/carreras/career-list-card";
import { DataTableAdvanced, type DataTableAdvancedRow } from "@/components/ui/data-table-advanced";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const supabase = await createClient();
  const [profile, { data: careers = [] }] = await Promise.all([
    requireActiveProfileOrRedirect(),
    supabase
      .from("careers")
      .select("id, code, name, active, coordinator_careers(coordinators(name)), subjects(id, active)")
      .order("code")
  ]);
  const careerRows = careers ?? [];
  const canManageSubjects = isAdmin(profile?.role_code);

  const careerItems = careerRows.map((career) => {
    const coordinatorNames = (career.coordinator_careers ?? [])
      .map((item) => item.coordinators?.name)
      .filter(Boolean) as string[];
    const activeSubjects = (career.subjects ?? []).filter((subject) => subject.active).length;
    return {
      id: career.id,
      code: career.code as string,
      name: career.name as string,
      active: Boolean(career.active),
      coordinator_names: coordinatorNames,
      active_subjects: activeSubjects
    };
  });

  const rows: DataTableAdvancedRow[] = careerItems.map((career) => {
    const statusLabel = career.active ? "Activa" : "Inactiva";
    const baseCells = [
      <span className="font-semibold text-ink" key="code">{career.code}</span>,
      career.name,
      <div className="flex flex-wrap gap-1" key="coordinators">
        {career.coordinator_names.length === 0 ? (
          <span className="text-muted">Sin asignar</span>
        ) : (
          career.coordinator_names.map((name, index) => <Badge key={`${career.id}-${index}`}>{name}</Badge>)
        )}
      </div>,
      career.active_subjects,
      <Badge key="state" tone={career.active ? "success" : "warning"}>
        {statusLabel}
      </Badge>
    ];
    return {
      id: career.id,
      searchText: [career.code, career.name, career.coordinator_names.join(" "), statusLabel].join(" "),
      filters: {
        estado: statusLabel,
        coordinador: career.coordinator_names[0] ?? "Sin asignar"
      },
      cells: canManageSubjects ? [...baseCells, <span className="text-muted" key="manage">Ver y modificar en móvil</span>] : baseCells
    };
  });

  return (
    <>
      <SectionHeader
        eyebrow="Catálogo"
        title="Carreras"
        description="Consulta carreras, coordinadores responsables y cantidad de materias activas asociadas."
      />
      <ResponsiveTable
        cards={
          <ul className="grid gap-3 sm:grid-cols-2">
            {careerItems.map((career) => (
              <li key={career.id}>
                <CareerListCard canManage={canManageSubjects} career={career} />
              </li>
            ))}
          </ul>
        }
        table={
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
        }
      />
    </>
  );
}

import { Badge } from "@/components/ui/badge";
