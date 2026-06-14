import Link from "next/link";
import { CalendarDays, FileDown, FileText, LayoutGrid } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTableAdvanced, type DataTableAdvancedRow } from "@/components/ui/data-table-advanced";
import { getReportData, getGroupsForReport } from "@/lib/supabase/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [rows, groups] = await Promise.all([getReportData(), getGroupsForReport()]);

  const tableRows: DataTableAdvancedRow[] = rows.map((row, i) => ({
    id: `${i}`,
    searchText: Object.values(row).join(" "),
    filters: {
      ciclo: row.ciclo,
      carrera: row.carrera,
      grupo: row.grupo,
      modalidad: row.modalidad,
      docente: row.docente
    },
    cells: [
      row.ciclo,
      row.carrera,
      row.grupo,
      row.modalidad,
      row.turno === "matutino" ? "Matutino" : "Vespertino",
      row.materia,
      row.docente,
      row.dia,
      row.hora,
      row.aula
    ]
  }));

  return (
    <>
      <SectionHeader
        eyebrow="Exportaciones"
        title="Reportes"
        description="Previsualiza asignaciones activas y descarga archivos CSV para revisión académica o entrega administrativa."
      >
        <a href="/api/reportes/csv">
          <Button>
            <FileDown className="h-4 w-4" />
            Exportar CSV completo
          </Button>
        </a>
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard description="Filas disponibles para exportación" icon={CalendarDays} label="Asignaciones" tone="brand" value={rows.length} />
        <MetricCard description="Grupos con información exportable" icon={LayoutGrid} label="Grupos activos" tone="info" value={groups.length} />
        <MetricCard description="Formato compatible con hojas de cálculo" icon={FileText} label="Formato" tone="success" value="CSV" />
      </div>

      <section className="mt-6 rounded-md border border-line bg-white p-4 shadow-subtle">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-ink">Exportar por grupo</h2>
          <p className="mt-1 text-sm text-muted">Cada archivo incluye ciclo, carrera, grupo, materia, docente, día, hora y aula.</p>
        </div>
        {groups.length === 0 ? (
          <EmptyState
            description="Crea y asigna clases a un grupo para habilitar exportaciones por grupo."
            icon={FileText}
            title="No hay grupos disponibles para exportar."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groups.map((group) => (
              <a
                className="flex items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:bg-brandSoft/50"
                href={`/api/reportes/csv?group_id=${group.id}`}
                key={group.id}
              >
                <FileText className="h-4 w-4 text-brand" />
                {group.name}
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <DataTableAdvanced
          emptyDescription="Cuando existan asignaciones activas, aparecerán aquí para revisión y exportación."
          emptyLabel="No hay asignaciones para reportar."
          filters={[
            { key: "ciclo", label: "Ciclo" },
            { key: "carrera", label: "Carrera" },
            { key: "grupo", label: "Grupo" },
            { key: "modalidad", label: "Modalidad" },
            { key: "docente", label: "Docente" }
          ]}
          headers={[
            "Ciclo",
            "Carrera",
            "Grupo",
            "Modalidad",
            "Turno",
            "Materia",
            "Docente",
            "Día",
            "Hora",
            "Aula"
          ]}
          rows={tableRows}
        />
      </section>
    </>
  );
}
