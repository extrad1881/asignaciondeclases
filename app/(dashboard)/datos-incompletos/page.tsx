import Link from "next/link";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/section-header";
import { DataTableAdvanced, type DataTableAdvancedRow } from "@/components/ui/data-table-advanced";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getIncompleteData, type IncompleteCategory, type IncompleteIssue } from "@/lib/supabase/incomplete-data";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const categoryLabels: Record<IncompleteCategory, string> = {
  docentes: "Docentes",
  materias: "Materias",
  grupos: "Grupos",
  asignaciones: "Asignaciones"
};

const severityLabels = {
  critico: "Critico",
  advertencia: "Advertencia",
  informativo: "Informativo"
};

function severityBadge(severity: IncompleteIssue["severity"]) {
  const styles = {
    critico: "bg-red-50 text-red-700 ring-red-200",
    advertencia: "bg-amber-50 text-amber-700 ring-amber-200",
    informativo: "bg-blue-50 text-blue-700 ring-blue-200"
  };

  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${styles[severity]}`}>
      {severityLabels[severity]}
    </span>
  );
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
      category,
      severityBadge(issue.severity),
      <div className="min-w-64" key={`${issue.id}-problem`}>
        <p className="font-semibold text-ink">{issue.title}</p>
        <p className="mt-1 text-sm text-slate-600">{issue.detail}</p>
      </div>,
      <div key={`${issue.id}-entity`}>
        <p className="font-medium text-ink">{issue.entityName}</p>
        <p className="text-xs text-slate-500">
          {[issue.careerLabel, issue.groupLabel, quarter ? `Cuat. ${quarter}` : null].filter(Boolean).join(" / ") ||
            "Sin contexto adicional"}
        </p>
      </div>,
      issue.coordinatorLabel ?? "Sin coordinador",
      issue.href ? (
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink shadow-subtle hover:bg-slate-50"
          href={issue.href}
          key={`${issue.id}-action`}
        >
          Corregir
        </Link>
      ) : (
        "Sin ruta"
      )
    ]
  };
}

export default async function IncompleteDataPage() {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile?.role_code)) redirect("/dashboard");

  const { issues, summary } = await getIncompleteData();
  const rows = issues.map(issueToRow);

  const total = issues.length;

  return (
    <>
      <SectionHeader eyebrow="Auditoria previa" title="Datos incompletos" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(categoryLabels) as IncompleteCategory[]).map((category) => (
          <div className="rounded-md border border-line bg-white p-4 shadow-subtle" key={category}>
            <p className="text-xs font-semibold uppercase text-slate-500">{categoryLabels[category]}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{summary[category]}</p>
            <p className="mt-1 text-sm text-slate-600">problemas detectados</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
          <p className="font-semibold">No se encontraron problemas.</p>
          <p className="mt-1 text-sm">Los datos principales estan listos para continuar con asignaciones.</p>
        </div>
      ) : (
        <div className="mt-5">
          <DataTableAdvanced
            emptyLabel="No hay problemas con esos filtros."
            filters={[
              { key: "category", label: "Categoria" },
              { key: "severity", label: "Severidad" },
              { key: "career", label: "Carrera", options: uniqueOptions(issues, "careerLabel") },
              { key: "coordinator", label: "Coordinador", options: uniqueOptions(issues, "coordinatorLabel") },
              { key: "group", label: "Grupo", options: uniqueOptions(issues, "groupLabel") },
              { key: "quarter", label: "Cuatrimestre" },
              { key: "type", label: "Tipo de problema" }
            ]}
            headers={["Categoria", "Severidad", "Problema", "Elemento", "Coordinador", "Accion"]}
            rows={rows}
          />
        </div>
      )}
    </>
  );
}
