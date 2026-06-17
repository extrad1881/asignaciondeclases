import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CalendarDays, CircleAlert, LayoutGrid, Users } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTableAdvanced, type DataTableAdvancedRow } from "@/components/ui/data-table-advanced";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { getIncompleteData, type IncompleteCategory, type IncompleteIssue } from "@/lib/supabase/incomplete-data";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const categoryLabels: Record<IncompleteCategory, string> = {
  docentes: "Docentes",
  materias: "Materias",
  grupos: "Grupos",
  asignaciones: "Asignaciones"
};

const categoryDescriptions: Record<IncompleteCategory, string> = {
  docentes: "Perfiles, correo, coordinador responsable u horas máximas.",
  materias: "Perfil requerido, carga horaria o asociación con carrera.",
  grupos: "Materias, aula, modalidad, turno o perfiles requeridos.",
  asignaciones: "Docente, aula, bloque, perfil, horas o choques."
};

const categoryIcons = {
  docentes: Users,
  materias: BookOpen,
  grupos: LayoutGrid,
  asignaciones: CalendarDays
};

const severityLabels = {
  critico: "Crítico",
  advertencia: "Advertencia",
  informativo: "Informativo"
};

function severityBadge(severity: IncompleteIssue["severity"]) {
  const tone = severity === "critico" ? "danger" : severity === "advertencia" ? "warning" : "info";
  return <Badge tone={tone}>{severityLabels[severity]}</Badge>;
}

function uniqueOptions(issues: IncompleteIssue[], key: keyof IncompleteIssue) {
  const values = new Map<string, string>();
  issues.forEach((issue) => {
    const value = issue[key];
    if (value == null || value === "") return;
    values.set(String(value), String(value));
  });
  return Array.from(values, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

function issueToRow(issue: IncompleteIssue): DataTableAdvancedRow {
  const category = categoryLabels[issue.category];
  const quarter = issue.quarter ? String(issue.quarter) : "";

  return {
    id: issue.id,
    searchText: [
      category,
      issue.title,
      issue.detail,
      issue.entityName,
      issue.type,
      issue.careerLabel,
      issue.coordinatorLabel,
      issue.groupLabel,
      quarter
    ]
      .filter(Boolean)
      .join(" "),
    filters: {
      category,
      severity: severityLabels[issue.severity],
      type: issue.type,
      career: issue.careerLabel,
      coordinator: issue.coordinatorLabel,
      group: issue.groupLabel,
      quarter
    },
    cells: [
      <Badge key={`${issue.id}-category`} tone="brand">{category}</Badge>,
      severityBadge(issue.severity),
      <div className="min-w-64" key={`${issue.id}-problem`}>
        <p className="font-semibold text-ink">{issue.title}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{issue.detail}</p>
      </div>,
      <div key={`${issue.id}-entity`}>
        <p className="font-semibold text-ink">{issue.entityName}</p>
        <p className="text-xs text-muted">
          {[issue.careerLabel, issue.groupLabel, quarter ? `Cuat. ${quarter}` : null].filter(Boolean).join(" / ") ||
            "Sin contexto adicional"}
        </p>
      </div>,
      issue.coordinatorLabel ?? "Sin coordinador",
      issue.href ? (
        <Link href={issue.href} key={`${issue.id}-action`}>
          <Button type="button" variant="secondary">
            Corregir datos
          </Button>
        </Link>
      ) : (
        <span className="text-muted">Sin ruta</span>
      )
    ]
  };
}

export default async function IncompleteDataPage() {
  const profile = await requireActiveProfileOrRedirect();
  if (!isAdmin(profile?.role_code)) redirect("/dashboard");

  const { issues, summary } = await getIncompleteData();
  const rows = issues.map(issueToRow);
  const total = issues.length;

  return (
    <>
      <SectionHeader
        eyebrow="Auditoría previa"
        title="Datos incompletos"
        description="Corrige estos pendientes antes de iniciar asignaciones masivas. La prioridad indica el riesgo operativo para grupos, docentes y horarios."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(categoryLabels) as IncompleteCategory[]).map((category) => (
          <MetricCard
            description={categoryDescriptions[category]}
            icon={categoryIcons[category]}
            key={category}
            label={categoryLabels[category]}
            tone={summary[category] > 0 ? "warning" : "success"}
            value={summary[category]}
          />
        ))}
      </div>

      {total === 0 ? (
        <div className="mt-5">
          <EmptyState
            description="Los datos principales están listos para continuar con asignaciones. Mantén esta revisión como paso previo a cambios masivos."
            icon={CircleAlert}
            title="No hay datos incompletos por corregir."
          />
        </div>
      ) : (
        <div className="mt-5">
          <DataTableAdvanced
            emptyDescription="Ajusta los filtros para encontrar otros pendientes o vuelve a la vista general."
            emptyLabel="No hay problemas con esos filtros."
            filters={[
              { key: "category", label: "Categoría" },
              { key: "severity", label: "Severidad" },
              { key: "career", label: "Carrera", options: uniqueOptions(issues, "careerLabel") },
              { key: "coordinator", label: "Coordinador", options: uniqueOptions(issues, "coordinatorLabel") },
              { key: "group", label: "Grupo", options: uniqueOptions(issues, "groupLabel") },
              { key: "quarter", label: "Cuatrimestre" },
              { key: "type", label: "Tipo de problema" }
            ]}
            headers={["Categoría", "Severidad", "Problema", "Elemento", "Coordinador", "Acción"]}
            rows={rows}
          />
        </div>
      )}
    </>
  );
}
